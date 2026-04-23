package com.consignado.api.domain.settings;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.settings.dto.CreateManagerRequest;
import com.consignado.api.domain.settings.dto.ManagerResponse;
import com.consignado.api.domain.settings.dto.ProfileResponse;
import com.consignado.api.domain.settings.dto.TenantSettingsRequest;
import com.consignado.api.domain.settings.dto.TenantSettingsResponse;
import com.consignado.api.domain.settings.dto.UpdateProfileRequest;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.security.SupabaseAuthAdminService;
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
    private final ResellerRepository resellerRepository;
    private final ObjectMapper objectMapper;
    private final SupabaseAuthAdminService supabaseAuthAdminService;

    @Transactional(readOnly = true)
    public TenantSettingsResponse getSettings() {
        var tenant = loadTenant();
        return toResponse(tenant);
    }

    @Transactional
    public TenantSettingsResponse updateSettings(TenantSettingsRequest request) {
        var tenant = loadTenant();
        if (request.name() != null && !request.name().isBlank()) tenant.setName(request.name());
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

        boolean isInvite = request.password() == null || request.password().isBlank();
        UUID supabaseUid = isInvite
            ? supabaseAuthAdminService.inviteUser(request.email())
            : supabaseAuthAdminService.createUser(request.email(), request.password());

        var user = new User();
        user.setTenantId(tenantId);
        user.setSupabaseUid(supabaseUid);
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setRole("manager");
        user.setActive(!isInvite);
        user.setInvitePending(isInvite);

        var saved = userRepository.save(user);
        log.info("Manager created id={} tenant={}", saved.getId(), tenantId);
        return toManagerResponse(saved);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile() {
        var userId = TenantContext.USER_ID.get();
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        return new ProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole());
    }

    @Transactional
    public ProfileResponse updateProfile(UpdateProfileRequest request) {
        var userId = TenantContext.USER_ID.get();
        var user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        if (request.name() != null && !request.name().isBlank()) user.setName(request.name());
        if (request.phone() != null) user.setPhone(request.phone());
        userRepository.save(user);
        log.info("Profile updated userId={}", userId);
        return new ProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getPhone(), user.getRole());
    }

    @Transactional
    public void updateManagerStatus(UUID managerId, boolean active) {
        var tenantId = TenantContext.TENANT_ID.get();
        var user = userRepository.findById(managerId)
            .filter(u -> u.getTenantId().equals(tenantId) && "manager".equals(u.getRole()))
            .orElseThrow(() -> new ResourceNotFoundException("Gestora", managerId));

        if (!active) {
            long count = resellerRepository.countByManagerIdAndDeletedAtIsNull(managerId);
            if (count > 0) {
                throw new BusinessException(
                    "Este(a) gestor(a) possui " + count + " revendedor(es) vinculado(s). Transfira-os antes de desativar.");
            }
        }

        user.setActive(active);
        if (active) user.setInvitePending(false);
        userRepository.save(user);
        log.info("Manager status updated id={} active={}", managerId, active);
    }

    @Transactional
    public void transferResellers(UUID fromManagerId, UUID toManagerId) {
        var tenantId = TenantContext.TENANT_ID.get();
        userRepository.findById(toManagerId)
            .filter(u -> u.getTenantId().equals(tenantId) && "manager".equals(u.getRole()))
            .orElseThrow(() -> new ResourceNotFoundException("Gestor(a) destino", toManagerId));

        var resellers = resellerRepository.findByManagerIdAndDeletedAtIsNull(fromManagerId);
        resellers.forEach(r -> r.setManagerId(toManagerId));
        resellerRepository.saveAll(resellers);
        log.info("Transferred {} resellers from manager={} to manager={}", resellers.size(), fromManagerId, toManagerId);
    }

    @Transactional
    public void deleteManager(UUID managerId) {
        var tenantId = TenantContext.TENANT_ID.get();
        var user = userRepository.findById(managerId)
            .filter(u -> u.getTenantId().equals(tenantId) && "manager".equals(u.getRole()))
            .orElseThrow(() -> new ResourceNotFoundException("Gestora", managerId));

        long count = resellerRepository.countByManagerIdAndDeletedAtIsNull(managerId);
        if (count > 0) {
            throw new BusinessException(
                "Este(a) gestor(a) possui " + count + " revendedor(es). Transfira-os antes de excluir.");
        }

        supabaseAuthAdminService.deleteUser(user.getSupabaseUid());
        userRepository.delete(user);
        log.info("Manager deleted id={} tenant={}", managerId, tenantId);
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

    private static final String DEFAULT_SETTINGS =
        "{\"default_commission_rate\":30,\"default_return_days\":30,\"block_new_lot_if_overdue\":true}";

    private String buildSettingsJson(Tenant tenant, TenantSettingsRequest request) {
        try {
            String raw = (tenant.getSettings() != null && !tenant.getSettings().isBlank())
                ? tenant.getSettings() : DEFAULT_SETTINGS;
            JsonNode parsed = objectMapper.readTree(raw);
            ObjectNode node = parsed instanceof ObjectNode on ? on : objectMapper.createObjectNode();
            if (request.defaultCommissionRate() != null)
                node.put("default_commission_rate", request.defaultCommissionRate());
            if (request.defaultReturnDays() != null)
                node.put("default_return_days", request.defaultReturnDays());
            if (request.blockNewLotIfOverdue() != null)
                node.put("block_new_lot_if_overdue", request.blockNewLotIfOverdue());
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            log.warn("Failed to parse settings JSON, resetting to defaults: {}", e.getMessage());
            return DEFAULT_SETTINGS;
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
            u.isActive(), u.isInvitePending(), u.getCreatedAt());
    }
}
