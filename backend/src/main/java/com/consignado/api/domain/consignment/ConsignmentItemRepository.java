package com.consignado.api.domain.consignment;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsignmentItemRepository extends JpaRepository<ConsignmentItem, UUID> {

    List<ConsignmentItem> findByConsignmentId(UUID consignmentId);

    List<ConsignmentItem> findByConsignmentIdIn(Collection<UUID> consignmentIds);

    @org.springframework.data.jpa.repository.Query(
        "SELECT ci.consignmentId, SUM(ci.quantitySent), SUM(ci.quantitySold), SUM(ci.quantityReturned), SUM(ci.quantityLost), " +
        "SUM(ci.salePrice * (ci.quantitySent - ci.quantitySold - ci.quantityReturned - ci.quantityLost)) " +
        "FROM ConsignmentItem ci WHERE ci.consignmentId IN :ids GROUP BY ci.consignmentId")
    List<Object[]> aggregateTotalsByConsignmentIds(@org.springframework.data.repository.query.Param("ids") Collection<UUID> ids);

    @org.springframework.data.jpa.repository.Query(
        "SELECT ci.consignmentId, SUM(ci.quantitySold * ci.salePrice), " +
        "SUM(ci.quantitySold * ci.salePrice * ci.commissionRate / 100) " +
        "FROM ConsignmentItem ci WHERE ci.consignmentId IN :ids " +
        "GROUP BY ci.consignmentId")
    List<Object[]> aggregateSoldValueByConsignmentIds(@org.springframework.data.repository.query.Param("ids") Collection<UUID> ids);

    Optional<ConsignmentItem> findByIdAndConsignmentIdAndTenantId(UUID id, UUID consignmentId, UUID tenantId);

    List<ConsignmentItem> findByProductIdAndTenantId(UUID productId, UUID tenantId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT ci.productId FROM ConsignmentItem ci " +
        "JOIN Consignment c ON c.id = ci.consignmentId " +
        "WHERE c.managerId = :managerId AND c.consignmentType = 'manager_stock' " +
        "AND c.status NOT IN ('settled')")
    List<UUID> findProductIdsByActiveManagerStockForManager(
        @org.springframework.data.repository.query.Param("managerId") UUID managerId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT ci.productId, " +
        "SUM(ci.quantitySent), " +
        "SUM(ci.quantitySent - ci.quantitySold - ci.quantityReturned - ci.quantityLost) " +
        "FROM ConsignmentItem ci " +
        "JOIN Consignment c ON c.id = ci.consignmentId " +
        "WHERE c.managerId = :managerId AND c.consignmentType = 'manager_stock' " +
        "AND c.status NOT IN ('settled') " +
        "GROUP BY ci.productId")
    List<Object[]> findManagerStockQuantitiesByProduct(
        @org.springframework.data.repository.query.Param("managerId") UUID managerId);
}
