package com.consignado.api.reseller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerDocumentRepository;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.reseller.ResellerService;
import com.consignado.api.domain.reseller.dto.ResellerRequest;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;
import com.consignado.api.storage.SupabaseStorageService;

@ExtendWith(MockitoExtension.class)
class ResellerServiceTest {

    @Mock private ResellerRepository resellerRepository;
    @Mock private ResellerDocumentRepository documentRepository;
    @Mock private UserRepository userRepository;
    @Mock private SupabaseStorageService storageService;
    @InjectMocks private ResellerService resellerService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID   = UUID.randomUUID();
    private static final UUID MANAGER_ID = UUID.randomUUID();

    @Test
    void create_withDuplicateCpf_throwsBusinessException() {
        when(resellerRepository.existsByCpfAndTenantId(any(), any())).thenReturn(true);
        var request = buildRequest("12345678901");

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> resellerService.create(request)))));
    }

    @Test
    void create_withValidData_returnsResponse() throws Exception {
        when(userRepository.findById(MANAGER_ID)).thenReturn(Optional.of(buildManager()));
        when(resellerRepository.save(any())).thenReturn(buildReseller("Ana Silva"));
        var request = buildRequest(null);

        var response = ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> resellerService.create(request))));

        assertNotNull(response);
        assertEquals("Ana Silva", response.name());
    }

    @Test
    void findById_withNonExistentId_throwsResourceNotFoundException() {
        var id = UUID.randomUUID();
        when(resellerRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> resellerService.findById(id)))));
    }

    @Test
    void updateStatus_withInvalidStatus_throwsBusinessException() {
        var id = UUID.randomUUID();
        when(resellerRepository.findByIdAndDeletedAtIsNull(id))
            .thenReturn(Optional.of(buildReseller("Test")));

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> resellerService.updateStatus(id, "INVALID")))));
    }

    @Test
    void updateStatus_withValidStatus_savesNewStatus() throws Exception {
        var id = UUID.randomUUID();
        var reseller = buildReseller("Test");
        when(resellerRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(reseller));
        when(resellerRepository.save(any())).thenReturn(reseller);

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner", () -> {
                    resellerService.updateStatus(id, "inactive");
                    return null;
                })));

        verify(resellerRepository).save(argThat(r -> "inactive".equals(r.getStatus())));
    }

    private ResellerRequest buildRequest(String cpf) {
        return new ResellerRequest(
            "Ana Silva", "11999999999", MANAGER_ID, cpf,
            null, null, null, null, null, null, null, null, null, null,
            null, null, null, null, null, null, null, null
        );
    }

    private User buildManager() {
        var manager = new User();
        manager.setId(MANAGER_ID);
        manager.setTenantId(TENANT_ID);
        manager.setName("Gestora Test");
        manager.setEmail("gestora@test.com");
        manager.setRole("manager");
        return manager;
    }

    private Reseller buildReseller(String name) {
        var reseller = new Reseller();
        reseller.setId(UUID.randomUUID());
        reseller.setTenantId(TENANT_ID);
        reseller.setManagerId(MANAGER_ID);
        reseller.setName(name);
        reseller.setPhone("11999999999");
        reseller.setStatus("active");
        return reseller;
    }
}
