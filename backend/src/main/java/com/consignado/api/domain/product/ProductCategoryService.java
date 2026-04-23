package com.consignado.api.domain.product;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductCategoryService {

    private final ProductCategoryRepository repository;

    @Transactional(readOnly = true)
    public List<String> listNames() {
        var tenantId = TenantContext.TENANT_ID.get();
        return repository.findByTenantIdAndActiveTrueOrderByNameAsc(tenantId)
            .stream().map(ProductCategory::getName).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductCategory> list() {
        var tenantId = TenantContext.TENANT_ID.get();
        return repository.findByTenantIdAndActiveTrueOrderByNameAsc(tenantId);
    }

    @Transactional
    public ProductCategory create(String name) {
        var tenantId = TenantContext.TENANT_ID.get();
        if (repository.existsByTenantIdAndNameIgnoreCase(tenantId, name.trim())) {
            throw new BusinessException("Categoria já existe: " + name);
        }
        var cat = new ProductCategory();
        cat.setTenantId(tenantId);
        cat.setName(name.trim());
        var saved = repository.save(cat);
        log.info("ProductCategory created id={} tenant={}", saved.getId(), tenantId);
        return saved;
    }

    @Transactional
    public void delete(UUID id) {
        var tenantId = TenantContext.TENANT_ID.get();
        var cat = repository.findById(id)
            .filter(c -> c.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Categoria", id));
        cat.setActive(false);
        repository.save(cat);
        log.info("ProductCategory deleted id={} tenant={}", id, tenantId);
    }
}
