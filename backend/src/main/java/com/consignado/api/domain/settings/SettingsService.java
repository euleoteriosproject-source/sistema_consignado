package com.consignado.api.domain.settings;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.settings.dto.CreateManagerRequest;
import com.consignado.api.domain.settings.dto.ManagerResponse;
import com.consignado.api.domain.settings.dto.TenantSettingsRequest;
import com.consignado.api.domain.settings.dto.TenantSettingsResponse;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class SettingsService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public TenantSettingsResponse getSettings() {
        var tenant = loadTenant();
        return toResponse(tenant);
    }

    @Transactional
    public TenantSettingsResponse updateSettings(TenantSettingsRequest request) {
        var tenant = loadTenant();
        tenant.setName(request.name());
        if (request.logoUrl() != null)     tenant.setLogoUrl(request.logoUrl());
        if (request.primaryColor() != null) tenant.setPrimaryColor(request.primaryColor());

        if (request.defaultCommissionRate() != null
                || request.defaultReturnDays() != null
                || request.blockNewLotIfOverdue() != null) {
            tenant.setSettings(buildSettingsJson(tenant, request));
        }

        tenantRepository.save(tenant);
        log.info("Settings updated for tenant={}", tenant.getId());
        return toResponse(tenant);
    }

    @Transactional(readOnly = true)
    public List<ManagerResponse> getManagers() {
        var tenantId = TenantContext.TENANT_ID.get();
        return userRepository.findByTenantIdAndRole(tenantId, "manager").stream()
            .map(this::toManagerResponse).toList();
    }

    @Transactional
    public ManagerResponse createManager(CreateManagerRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var tenant = loadTenant();

        var currentCount = userRepository.findByTenantIdAndRole(tenantId, "manager").size();
        if (currentCount >= maxManagers(tenant.getPlan())) {
            throw new BusinessException("Limite de gestoras atingido para o plano " + tenant.getPlan());
        }

        if (userRepository.existsByEmailAndTenantId(request.email(), tenantId)) {
            throw new BusinessException("E-mail já cadastrado neste tenant");
        }

        var user = new User();
        user.setTenantId(tenantId);
        user.setSupabaseUid(UUID.randomUUID()); // placeholder — real flow uses Supabase invite
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setRole("manager");
        user.setActive(true);

        var saved = userRepository.save(user);
        log.info("Manager created id={} tenant={}", saved.getId(), tenantId);
        return toManagerResponse(saved);
    }

    @Transactional
    public void updateManagerStatus(UUID managerId, boolean active) {
        var tenantId = TenantContext.TENANT_ID.get();
        var user = userRepository.findById(managerId)
            .filter(u -> u.getTenantId().equals(tenantId) && "manager".equals(u.getRole()))
            .orElseThrow(() -> new ResourceNotFoundException("Gestora", managerId));
        user.setActive(active);
        userRepository.save(user);
        log.info("Manager status updated id={} active={}", managerId, active);
    }

    private Tenant loadTenant() {
        var tenantId = TenantContext.TENANT_ID.get();
        return tenantRepository.findById(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
    }

    private int maxManagers(String plan) {
        return switch (plan) {
            case "basic" -> 1;
            case "pro"   -> 3;
            default      -> Integer.MAX_VALUE;
        };
    }

    private String buildSettingsJson(Tenant tenant, TenantSettingsRequest request) {
        try {
            ObjectNode node = (ObjectNode) objectMapper.readTree(tenant.getSettings());
            if (request.defaultCommissionRate() != null)
                node.put("default_commission_rate", request.defaultCommissionRate());
            if (request.defaultReturnDays() != null)
                node.put("default_return_days", request.defaultReturnDays());
            if (request.blockNewLotIfOverdue() != null)
                node.put("block_new_lot_if_overdue", request.blockNewLotIfOverdue());
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            log.warn("Failed to parse settings JSON, keeping original: {}", e.getMessage());
            return tenant.getSettings();
        }
    }

    private TenantSettingsResponse toResponse(Tenant t) {
        var commissionRate = 30;
        var returnDays = 30;
        var blockOverdue = true;
        try {
            JsonNode node = objectMapper.readTree(t.getSettings());
            commissionRate = node.path("default_commission_rate").asInt(30);
            returnDays     = node.path("default_return_days").asInt(30);
            blockOverdue   = node.path("block_new_lot_if_overdue").asBoolean(true);
        } catch (Exception ignored) {}

        return new TenantSettingsResponse(
            t.getId(), t.getName(), t.getSlug(), t.getLogoUrl(), t.getPrimaryColor(),
            t.getPlan(), commissionRate, returnDays, blockOverdue,
            t.getTrialEndsAt(), t.getCreatedAt()
        );
    }

    private ManagerResponse toManagerResponse(User u) {
        return new ManagerResponse(u.getId(), u.getName(), u.getEmail(), u.getPhone(),
            u.isActive(), u.getCreatedAt());
    }
}
