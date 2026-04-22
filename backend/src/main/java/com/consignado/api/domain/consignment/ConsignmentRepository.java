package com.consignado.api.domain.consignment;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConsignmentRepository extends JpaRepository<Consignment, UUID>, JpaSpecificationExecutor<Consignment> {

    Optional<Consignment> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Consignment> findByResellerIdAndTenantId(UUID resellerId, UUID tenantId);

    List<Consignment> findByTenantIdAndStatusIn(UUID tenantId, List<String> statuses);

    long countByTenantIdAndStatus(UUID tenantId, String status);

    List<Consignment> findByManagerIdAndStatusIn(UUID managerId, List<String> statuses);

    List<Consignment> findByResellerIdInAndStatusIn(Collection<UUID> resellerIds, List<String> statuses);

    long countByManagerIdAndStatus(UUID managerId, String status);

    @Modifying
    @Query("UPDATE Consignment c SET c.status = 'overdue' " +
           "WHERE c.status IN ('open', 'partially_settled') " +
           "AND c.expectedReturnAt IS NOT NULL " +
           "AND c.expectedReturnAt < :today")
    int markOverdue(@Param("today") LocalDate today);
}
