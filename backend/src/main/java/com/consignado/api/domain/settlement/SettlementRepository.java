package com.consignado.api.domain.settlement;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SettlementRepository extends JpaRepository<Settlement, UUID>, JpaSpecificationExecutor<Settlement> {

    List<Settlement> findByResellerIdAndTenantId(UUID resellerId, UUID tenantId);

    List<Settlement> findByTenantIdAndSettlementDateBetween(UUID tenantId, LocalDate from, LocalDate to);

    Optional<Settlement> findFirstByResellerIdAndTenantIdOrderBySettlementDateDesc(UUID resellerId, UUID tenantId);
}
