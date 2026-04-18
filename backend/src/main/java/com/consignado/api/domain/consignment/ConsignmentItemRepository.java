package com.consignado.api.domain.consignment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsignmentItemRepository extends JpaRepository<ConsignmentItem, UUID> {

    List<ConsignmentItem> findByConsignmentId(UUID consignmentId);

    Optional<ConsignmentItem> findByIdAndConsignmentIdAndTenantId(UUID id, UUID consignmentId, UUID tenantId);
}
