package com.consignado.api.domain.reseller;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ResellerRepository extends JpaRepository<Reseller, UUID>, JpaSpecificationExecutor<Reseller> {

    boolean existsByCpfAndTenantId(String cpf, UUID tenantId);

    Optional<Reseller> findByIdAndDeletedAtIsNull(UUID id);
}
