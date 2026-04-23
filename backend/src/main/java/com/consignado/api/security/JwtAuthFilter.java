package com.consignado.api.security;

import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPublicKeySpec;
import java.util.Base64;
import java.util.UUID;

import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.consignado.api.config.AppProperties;
import com.consignado.api.domain.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter extends OncePerRequestFilter {

    public static final String ATTR_SUPABASE_UID = "_jwt_supabase_uid";
    public static final String ATTR_EMAIL        = "_jwt_email";

    private final AppProperties appProperties;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // Supabase usa ES256 (ECDSA P-256) — chave pública carregada do JWKS no startup
    private volatile PublicKey jwtPublicKey;

    @PostConstruct
    void init() {
        try {
            jwtPublicKey = loadJwksKey();
            log.info("Supabase JWKS EC key loaded successfully");
        } catch (Exception e) {
            log.error("Could not load Supabase JWKS key — all JWT validation will fail: {}", e.getMessage());
        }
    }

    private PublicKey loadJwksKey() throws Exception {
        String jwksUrl = appProperties.supabase().url() + "/auth/v1/.well-known/jwks.json";
        HttpClient client = HttpClient.newHttpClient();
        String json = client.send(
            HttpRequest.newBuilder(URI.create(jwksUrl)).GET().build(),
            HttpResponse.BodyHandlers.ofString()
        ).body();

        var key = objectMapper.readTree(json).get("keys").get(0);
        byte[] x = Base64.getUrlDecoder().decode(key.get("x").asText());
        byte[] y = Base64.getUrlDecoder().decode(key.get("y").asText());

        AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
        params.init(new ECGenParameterSpec("secp256r1")); // P-256
        ECParameterSpec ecSpec = params.getParameterSpec(ECParameterSpec.class);

        return KeyFactory.getInstance("EC").generatePublic(
            new ECPublicKeySpec(new ECPoint(new BigInteger(1, x), new BigInteger(1, y)), ecSpec)
        );
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
        throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        if (jwtPublicKey == null) {
            log.warn("JWKS key not loaded — skipping JWT validation");
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Claims claims = Jwts.parser()
                .verifyWith(jwtPublicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

            String supabaseUid = claims.getSubject();
            String email       = claims.get("email", String.class);

            request.setAttribute(ATTR_SUPABASE_UID, supabaseUid);
            if (email != null) request.setAttribute(ATTR_EMAIL, email);

            // Superadmin não está na tabela users — identificado pelo e-mail configurado
            String adminEmail = appProperties.admin() != null ? appProperties.admin().email() : null;
            if (adminEmail != null && adminEmail.equalsIgnoreCase(email)) {
                var details = new TenantUserDetails(null, null, email, "superadmin", "Admin");
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities())
                );
                log.debug("Superadmin auth ok: email={}", email);
                filterChain.doFilter(request, response);
                return;
            }

            userRepository.findBySupabaseUid(UUID.fromString(supabaseUid))
                .ifPresentOrElse(user -> {
                    if (!user.isActive() && !user.isInvitePending()) return;
                    if (user.isInvitePending()) {
                        user.setActive(true);
                        user.setInvitePending(false);
                        userRepository.save(user);
                        log.info("Gestora ativada por primeiro login: user={}", user.getEmail());
                    }
                    var details = new TenantUserDetails(
                        user.getTenantId(), user.getId(),
                        user.getEmail(), user.getRole(), user.getName()
                    );
                    SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities())
                    );
                    log.debug("Auth ok: user={} tenant={}", user.getEmail(), user.getTenantId());
                }, () -> {
                    // supabase_uid não encontrado — tenta vincular por e-mail (primeiro login de gestora)
                    if (email != null) {
                        userRepository.findFirstByEmailIgnoreCaseAndActiveTrue(email)
                            .ifPresentOrElse(user -> {
                                user.setSupabaseUid(UUID.fromString(supabaseUid));
                                userRepository.save(user);
                                var details = new TenantUserDetails(
                                    user.getTenantId(), user.getId(),
                                    user.getEmail(), user.getRole(), user.getName()
                                );
                                SecurityContextHolder.getContext().setAuthentication(
                                    new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities())
                                );
                                log.info("Usuário vinculado por e-mail: uid={} email={}", supabaseUid, email);
                            }, () -> log.info("JWT válido mas usuário não encontrado: uid={} email={}", supabaseUid, email));
                    } else {
                        log.info("JWT válido mas supabaseUid não encontrado e sem email: {}", supabaseUid);
                    }
                });

        } catch (Exception ex) {
            log.warn("JWT inválido [{}]: {}", ex.getClass().getSimpleName(), ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
