package com.consignado.api.domain.settings;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.settings.dto.CreateManagerRequest;
import com.consignado.api.domain.settings.dto.ManagerResponse;
import com.consignado.api.domain.settings.dto.ProfileResponse;
import com.consignado.api.domain.settings.dto.TenantSettingsRequest;
import com.consignado.api.domain.settings.dto.TenantSettingsResponse;
import com.consignado.api.domain.settings.dto.UpdateManagerStatusRequest;
import com.consignado.api.domain.settings.dto.UpdateProfileRequest;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.ForbiddenException;
import com.consignado.api.shared.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public ResponseEntity<ApiResponse<TenantSettingsResponse>> getSettings() {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getSettings()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<TenantSettingsResponse>> updateSettings(
        @Valid @RequestBody TenantSettingsRequest request
    ) {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(settingsService.updateSettings(request)));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile() {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getProfile()));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(
        @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.updateProfile(request)));
    }

    @GetMapping("/managers")
    public ResponseEntity<ApiResponse<List<ManagerResponse>>> getManagers() {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getManagers()));
    }

    @PostMapping("/managers")
    public ResponseEntity<ApiResponse<ManagerResponse>> createManager(
        @Valid @RequestBody CreateManagerRequest request
    ) {
        requireOwner();
        return ResponseEntity.status(201).body(ApiResponse.created(settingsService.createManager(request)));
    }

    @PatchMapping("/managers/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateManagerStatus(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateManagerStatusRequest request
    ) {
        requireOwner();
        settingsService.updateManagerStatus(id, request.active());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    private void requireOwner() {
        if (!"owner".equalsIgnoreCase(TenantContext.ROLE.get())) {
            throw new ForbiddenException("Acesso restrito ao proprietário");
        }
    }
}
