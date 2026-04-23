package com.consignado.api.multitenancy;

import java.io.IOException;
import java.util.UUID;

import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.consignado.api.security.TenantUserDetails;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
        throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof TenantUserDetails userDetails) {
            String role = userDetails.role();

            // Superadmin não tem tenant — apenas define o ROLE
            if ("superadmin".equals(role)) {
                try {
                    ScopedValue.runWhere(TenantContext.ROLE, role,
                        () -> {
                            try { filterChain.doFilter(request, response); }
                            catch (IOException | ServletException e) { throw new RuntimeException(e); }
                        });
                } catch (RuntimeException e) {
                    if (e.getCause() instanceof IOException ioe) throw ioe;
                    if (e.getCause() instanceof ServletException se) throw se;
                    throw e;
                }
                return;
            }

            UUID tenantId = userDetails.tenantId();
            UUID userId = userDetails.userId();

            try {
                ScopedValue.runWhere(TenantContext.TENANT_ID, tenantId,
                    () -> ScopedValue.runWhere(TenantContext.USER_ID, userId,
                        () -> ScopedValue.runWhere(TenantContext.ROLE, role,
                            () -> {
                                try {
                                    filterChain.doFilter(request, response);
                                } catch (IOException | ServletException e) {
                                    throw new RuntimeException(e);
                                }
                            })));
            } catch (RuntimeException e) {
                if (e.getCause() instanceof IOException ioe) throw ioe;
                if (e.getCause() instanceof ServletException se) throw se;
                throw e;
            }
        } else {
            filterChain.doFilter(request, response);
        }
    }
}
