package com.consignado.api.product;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consignado.api.domain.product.Product;
import com.consignado.api.domain.product.ProductImageRepository;
import com.consignado.api.domain.product.ProductRepository;
import com.consignado.api.domain.product.ProductService;
import com.consignado.api.domain.product.dto.ProductRequest;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;
import com.consignado.api.storage.SupabaseStorageService;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductImageRepository imageRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private SupabaseStorageService storageService;
    @InjectMocks private ProductService productService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID   = UUID.randomUUID();

    @Test
    void create_withDuplicateCode_throwsBusinessException() {
        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(buildTenant("premium")));
        when(productRepository.countByTenantIdAndDeletedAtIsNull(TENANT_ID)).thenReturn(0L);
        when(productRepository.existsByCodeAndTenantId(any(), any())).thenReturn(true);
        var request = buildRequest("P001");

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> productService.create(request)))));
    }

    @Test
    void create_withInvalidCategory_throwsBusinessException() {
        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(buildTenant("premium")));
        when(productRepository.countByTenantIdAndDeletedAtIsNull(TENANT_ID)).thenReturn(0L);
        var request = new ProductRequest("Anel ouro", "INVALIDO", new BigDecimal("50.00"),
            null, null, null, null, null);

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> productService.create(request)))));
    }

    @Test
    void create_withValidData_setsStockAvailableEqualToStockTotal() throws Exception {
        when(tenantRepository.findById(TENANT_ID)).thenReturn(Optional.of(buildTenant("premium")));
        when(productRepository.countByTenantIdAndDeletedAtIsNull(TENANT_ID)).thenReturn(0L);
        when(productRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var request = buildRequestWithStock(10);

        var response = ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> productService.create(request))));

        assertNotNull(response);
        assertEquals(10, response.stockTotal());
        assertEquals(10, response.stockAvailable());
    }

    @Test
    void findById_withNonExistentId_throwsResourceNotFoundException() {
        var id = UUID.randomUUID();
        when(productRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> productService.findById(id)))));
    }

    @Test
    void updateStatus_setsActiveFlag() throws Exception {
        var id = UUID.randomUUID();
        var product = buildProduct(id);
        when(productRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(product));
        when(productRepository.save(any())).thenReturn(product);

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner", () -> {
                    productService.updateStatus(id, false);
                    return null;
                })));

        verify(productRepository).save(argThat(p -> !p.isActive()));
    }

    @Test
    void update_withStockReductionBelowAvailable_throwsBusinessException() {
        var id = UUID.randomUUID();
        var product = buildProduct(id);
        product.setStockTotal(10);
        product.setStockAvailable(3);
        when(productRepository.findByIdAndDeletedAtIsNull(id)).thenReturn(Optional.of(product));
        var request = buildRequestWithStock(5);

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> productService.update(id, request)))));
    }

    private Tenant buildTenant(String plan) {
        var tenant = new Tenant();
        tenant.setId(TENANT_ID);
        tenant.setName("Test Tenant");
        tenant.setSlug("test");
        tenant.setPlan(plan);
        return tenant;
    }

    private ProductRequest buildRequest(String code) {
        return new ProductRequest("Anel ouro", "anel", new BigDecimal("50.00"),
            code, null, null, null, null);
    }

    private ProductRequest buildRequestWithStock(int stock) {
        return new ProductRequest("Anel ouro", "anel", new BigDecimal("50.00"),
            null, null, null, null, stock);
    }

    private Product buildProduct(UUID id) {
        var product = new Product();
        product.setId(id);
        product.setTenantId(TENANT_ID);
        product.setName("Anel ouro");
        product.setCategory("anel");
        product.setSalePrice(new BigDecimal("50.00"));
        product.setCommissionRate(new BigDecimal("30.00"));
        product.setStockTotal(10);
        product.setStockAvailable(10);
        return product;
    }
}
