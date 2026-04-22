package com.consignado.api.domain.reseller;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ResellerDocumentRepository extends JpaRepository<ResellerDocument, UUID> {

    List<ResellerDocument> findByResellerId(UUID resellerId);

    Optional<ResellerDocument> findByIdAndTenantId(UUID id, UUID tenantId);

    long countByResellerId(UUID resellerId);
}
