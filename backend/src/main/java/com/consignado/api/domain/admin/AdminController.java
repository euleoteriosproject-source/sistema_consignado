package com.consignado.api.domain.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.admin.dto.AdminStatsResponse;
import com.consignado.api.domain.admin.dto.AdminTenantResponse;
import com.consignado.api.domain.admin.dto.AdminTicketResponse;
import com.consignado.api.domain.admin.dto.UpdateTenantRequest;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.ForbiddenException;
import com.consignado.api.shared.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> stats() {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.ok(adminService.stats()));
    }

    @GetMapping("/tenants")
    public ResponseEntity<ApiResponse<List<AdminTenantResponse>>> tenants() {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.ok(adminService.listTenants()));
    }

    @PatchMapping("/tenants/{id}")
    public ResponseEntity<ApiResponse<AdminTenantResponse>> updateTenant(
        @PathVariable UUID id, @RequestBody UpdateTenantRequest req
    ) {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.ok(adminService.updateTenant(id, req)));
    }

    @GetMapping("/support-tickets")
    public ResponseEntity<ApiResponse<List<AdminTicketResponse>>> tickets() {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.ok(adminService.listAllTickets()));
    }

    @PatchMapping("/support-tickets/{id}/status")
    public ResponseEntity<ApiResponse<AdminTicketResponse>> updateTicket(
        @PathVariable UUID id, @RequestBody java.util.Map<String, String> body
    ) {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.ok(adminService.updateTicketStatus(id, body.get("status"))));
    }

    @PatchMapping("/support-tickets/{id}/respond")
    public ResponseEntity<ApiResponse<AdminTicketResponse>> respondToTicket(
        @PathVariable UUID id, @RequestBody java.util.Map<String, String> body
    ) {
        requireAdmin();
        return ResponseEntity.ok(ApiResponse.ok(
            adminService.respondToTicket(id, body.get("response"), body.get("status"))
        ));
    }

    private void requireAdmin() {
        if (!"superadmin".equals(TenantContext.ROLE.get())) {
            throw new ForbiddenException("Acesso restrito ao administrador");
        }
    }
}
