package com.consignado.api.domain.product;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findByProductIdOrderByDisplayOrder(UUID productId);

    List<ProductImage> findByProductIdInAndIsPrimaryTrue(Collection<UUID> productIds);

    Optional<ProductImage> findByIdAndTenantId(UUID id, UUID tenantId);

    int countByProductId(UUID productId);
}
