package com.consignado.api.domain.consignment;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsignmentItemMovementRepository extends JpaRepository<ConsignmentItemMovement, UUID> {

    List<ConsignmentItemMovement> findByItemIdOrderByCreatedAtAsc(UUID itemId);

    List<ConsignmentItemMovement> findByConsignmentIdOrderByCreatedAtAsc(UUID consignmentId);
}
