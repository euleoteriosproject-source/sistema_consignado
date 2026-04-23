package com.consignado.api.domain.support;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {
    List<SupportTicket> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
