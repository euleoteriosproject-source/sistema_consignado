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

    // Para o dono: manager_stock (todos) + reseller onde ele é o responsável direto
    @Query("SELECT c FROM Consignment c WHERE c.tenantId = :tenantId " +
           "AND c.status IN :statuses " +
           "AND (c.consignmentType = 'manager_stock' OR (c.consignmentType = 'reseller' AND c.managerId = :ownerId))")
    List<Consignment> findOwnerCirculation(
        @Param("tenantId") UUID tenantId,
        @Param("ownerId") UUID ownerId,
        @Param("statuses") List<String> statuses);

    @Query("SELECT COUNT(c) FROM Consignment c WHERE c.tenantId = :tenantId " +
           "AND c.status = :status " +
           "AND (c.consignmentType = 'manager_stock' OR (c.consignmentType = 'reseller' AND c.managerId = :ownerId))")
    long countOwnerCirculation(
        @Param("tenantId") UUID tenantId,
        @Param("ownerId") UUID ownerId,
        @Param("status") String status);

    // Filtra por tipo de consignment — evita dupla contagem (manager_stock + reseller)
    List<Consignment> findByTenantIdAndConsignmentTypeAndStatusIn(UUID tenantId, String consignmentType, List<String> statuses);

    List<Consignment> findByManagerIdAndConsignmentTypeAndStatusIn(UUID managerId, String consignmentType, List<String> statuses);

    long countByTenantIdAndStatus(UUID tenantId, String status);

    long countByTenantIdAndConsignmentTypeAndStatus(UUID tenantId, String consignmentType, String status);

    List<Consignment> findByManagerIdAndStatusIn(UUID managerId, List<String> statuses);

    List<Consignment> findByResellerIdInAndStatusIn(Collection<UUID> resellerIds, List<String> statuses);

    long countByManagerIdAndStatus(UUID managerId, String status);

    long countByManagerIdAndConsignmentTypeAndStatus(UUID managerId, String consignmentType, String status);

    @Query("SELECT c FROM Consignment c WHERE c.tenantId = :tenantId " +
           "AND c.status IN ('open','partially_settled') " +
           "AND c.expectedReturnAt = :today")
    List<Consignment> findDueTodayActive(
        @Param("tenantId") UUID tenantId,
        @Param("today") java.time.LocalDate today);

    @Modifying
    @Query("UPDATE Consignment c SET c.status = 'overdue' " +
           "WHERE c.status IN ('open', 'partially_settled') " +
           "AND c.expectedReturnAt IS NOT NULL " +
           "AND c.expectedReturnAt < :today")
    int markOverdue(@Param("today") LocalDate today);
}
