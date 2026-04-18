package com.consignado.api.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.shared.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @PostMapping("/validate-token")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> validateToken(
        @AuthenticationPrincipal TenantUserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Token inválido ou expirado"));
        }

        var response = new TokenValidationResponse(
            userDetails.userId(),
            userDetails.tenantId(),
            userDetails.email(),
            userDetails.role()
        );

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    public record TokenValidationResponse(
        java.util.UUID userId,
        java.util.UUID tenantId,
        String email,
        String role
    ) {}
}
