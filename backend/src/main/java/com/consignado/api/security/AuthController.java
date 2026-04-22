package com.consignado.api.security;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.config.AppProperties;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.shared.response.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AppProperties appProperties;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;

    @PostMapping("/validate-token")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> validateToken(
        @AuthenticationPrincipal TenantUserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Token inválido ou expirado"));
        }
        return ResponseEntity.ok(ApiResponse.ok(new TokenValidationResponse(
            userDetails.userId(),
            userDetails.tenantId(),
            userDetails.email(),
            userDetails.role(),
            userDetails.name()
        )));
    }

    /**
     * Cria tenant + owner no primeiro acesso.
     * O JwtAuthFilter já valida o JWT e armazena supabase_uid/email como atributos do request —
     * não precisamos re-parsear o token aqui.
     */
    @PostMapping("/register")
    @Transactional
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> register(
        HttpServletRequest httpRequest,
        @RequestBody @Valid RegisterRequest request
    ) {
        // JWT já foi validado pelo JwtAuthFilter; supabase_uid está no atributo
        String supabaseUidStr = (String) httpRequest.getAttribute(JwtAuthFilter.ATTR_SUPABASE_UID);
        if (supabaseUidStr == null) {
            log.warn("Register chamado sem JWT válido (ATTR_SUPABASE_UID ausente)");
            return ResponseEntity.status(401).body(ApiResponse.error("Token inválido"));
        }

        UUID supabaseUid = UUID.fromString(supabaseUidStr);
        String email = (String) httpRequest.getAttribute(JwtAuthFilter.ATTR_EMAIL);
        if (email == null || email.isBlank()) email = request.email();

        if (userRepository.findBySupabaseUid(supabaseUid).isPresent()) {
            return ResponseEntity.status(409).body(ApiResponse.error("Usuário já cadastrado"));
        }

        String slug = toSlug(request.storeName());
        int suffix = 1;
        String baseSlug = slug;
        while (tenantRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + suffix++;
        }

        var tenant = new Tenant();
        tenant.setName(request.storeName());
        tenant.setSlug(slug);
        tenant.setPlan("basic");
        tenant.setTrialEndsAt(OffsetDateTime.now().plusDays(14));
        var savedTenant = tenantRepository.save(tenant);

        var user = new User();
        user.setTenantId(savedTenant.getId());
        user.setSupabaseUid(supabaseUid);
        user.setName(request.ownerName());
        user.setEmail(email);
        user.setRole("owner");
        userRepository.save(user);

        log.info("Tenant+owner criados: tenant={} email={}", savedTenant.getId(), email);
        return ResponseEntity.ok(ApiResponse.ok(new RegisterResponse(
            savedTenant.getId(), savedTenant.getName(), email, "owner"
        )));
    }

    private static String toSlug(String name) {
        return Normalizer.normalize(name, Normalizer.Form.NFD)
            .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
            .toLowerCase()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    }

    public record RegisterRequest(
        @NotBlank String storeName,
        @NotBlank String ownerName,
        @NotBlank String email
    ) {}

    public record RegisterResponse(
        UUID tenantId,
        String storeName,
        String email,
        String role
    ) {}

    public record TokenValidationResponse(
        UUID userId,
        UUID tenantId,
        String email,
        String role,
        String name
    ) {}
}
