package com.consignado.api.settings;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consignado.api.domain.settings.SettingsService;
import com.consignado.api.domain.settings.dto.CreateManagerRequest;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class SettingsServiceTest {

    @Mock private TenantRepository tenantRepository;
    @Mock private UserRepository userRepository;
    @Mock private ObjectMapper objectMapper;
    @InjectMocks private SettingsService settingsService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID   = UUID.randomUUID();

    @Test
    void createManager_whenBasicPlanFull_throwsBusinessException() {
        var tenant = buildTenant("basic");
        var existing = buildManager();

        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(userRepository.findByTenantIdAndRole(TENANT_ID, "manager")).thenReturn(List.of(existing));

        var request = new CreateManagerRequest("Nova Gestora", "nova@email.com", null);

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> settingsService.createManager(request)))));
    }

    @Test
    void createManager_withDuplicateEmail_throwsBusinessException() {
        var tenant = buildTenant("pro");

        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(userRepository.findByTenantIdAndRole(TENANT_ID, "manager")).thenReturn(List.of());
        when(userRepository.existsByEmailAndTenantId("dup@email.com", TENANT_ID)).thenReturn(true);

        var request = new CreateManagerRequest("Gestora", "dup@email.com", null);

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> settingsService.createManager(request)))));
    }

    @Test
    void createManager_withProPlanAndCapacity_createsUser() throws Exception {
        var tenant = buildTenant("pro");
        var saved  = buildManager();

        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(tenant));
        when(userRepository.findByTenantIdAndRole(TENANT_ID, "manager")).thenReturn(List.of());
        when(userRepository.existsByEmailAndTenantId(any(), any())).thenReturn(false);
        when(userRepository.save(any())).thenReturn(saved);

        var request = new CreateManagerRequest("Gestora Nova", "nova@email.com", "11999999999");

        var result = ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> settingsService.createManager(request))));

        assertNotNull(result);
        verify(userRepository).save(argThat(u -> "manager".equals(u.getRole()) && TENANT_ID.equals(u.getTenantId())));
    }

    @Test
    void updateManagerStatus_togglesActiveField() throws Exception {
        var manager = buildManager();

        when(userRepository.findById(manager.getId())).thenReturn(Optional.of(manager));

        ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                    () -> settingsService.updateManagerStatus(manager.getId(), false))));

        verify(userRepository).save(argThat(u -> !u.isActive()));
    }

    // ---- builders ----

    private Tenant buildTenant(String plan) {
        var t = new Tenant();
        t.setId(TENANT_ID);
        t.setName("Empresa Teste");
        t.setSlug("empresa-teste");
        t.setPlan(plan);
        t.setSettings("{\"default_commission_rate\":30,\"default_return_days\":30,\"block_new_lot_if_overdue\":true}");
        return t;
    }

    private User buildManager() {
        var u = new User();
        u.setId(UUID.randomUUID());
        u.setTenantId(TENANT_ID);
        u.setSupabaseUid(UUID.randomUUID());
        u.setName("Gestora Teste");
        u.setEmail("gestora@email.com");
        u.setRole("manager");
        u.setActive(true);
        return u;
    }
}
