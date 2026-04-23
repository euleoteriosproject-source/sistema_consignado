package com.consignado.api.domain.support;

import java.util.List;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.support.dto.CreateSupportTicketRequest;
import com.consignado.api.domain.support.dto.SupportTicketResponse;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.ForbiddenException;
import com.consignado.api.shared.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/support/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @PostMapping
    public ResponseEntity<ApiResponse<SupportTicketResponse>> create(
        @Valid @RequestBody CreateSupportTicketRequest request
    ) {
        requireOwner();
        return ResponseEntity.status(201).body(ApiResponse.created(supportService.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<SupportTicketResponse>>> list() {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(supportService.list()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<SupportTicketResponse>> updateStatus(
        @PathVariable UUID id,
        @RequestBody java.util.Map<String, String> body
    ) {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(supportService.updateStatus(id, body.get("status"))));
    }

    private void requireOwner() {
        if (!"owner".equalsIgnoreCase(TenantContext.ROLE.get())) {
            throw new ForbiddenException("Acesso restrito ao proprietário");
        }
    }
}
