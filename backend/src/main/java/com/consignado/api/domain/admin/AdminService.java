package com.consignado.api.domain.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.admin.dto.AdminStatsResponse;
import com.consignado.api.domain.admin.dto.AdminTenantResponse;
import com.consignado.api.domain.admin.dto.AdminTicketResponse;
import com.consignado.api.domain.admin.dto.UpdateTenantRequest;
import com.consignado.api.domain.support.SupportTicket;
import com.consignado.api.domain.support.SupportTicketRepository;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class AdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final SupportTicketRepository ticketRepository;

    @Transactional(readOnly = true)
    public List<AdminTenantResponse> listTenants() {
        return tenantRepository.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .map(t -> {
                long userCount = userRepository.findByTenantIdAndRole(t.getId(), "manager").size();
                return toTenantResponse(t, userCount);
            }).toList();
    }

    @Transactional
    public AdminTenantResponse updateTenant(UUID tenantId, UpdateTenantRequest req) {
        var tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
        if (req.plan() != null) tenant.setPlan(req.plan());
        if (req.active() != null) tenant.setActive(req.active());
        if (req.name() != null && !req.name().isBlank()) tenant.setName(req.name());
        tenantRepository.save(tenant);
        log.info("Admin updated tenant={} plan={} active={}", tenantId, req.plan(), req.active());
        long managers = userRepository.findByTenantIdAndRole(tenantId, "manager").size();
        return toTenantResponse(tenant, managers);
    }

    @Transactional(readOnly = true)
    public List<AdminTicketResponse> listAllTickets() {
        return ticketRepository.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .map(t -> {
                var tenant = tenantRepository.findById(t.getTenantId()).orElse(null);
                return toTicketResponse(t, tenant != null ? tenant.getName() : "—");
            }).toList();
    }

    @Transactional
    public AdminTicketResponse updateTicketStatus(UUID ticketId, String status) {
        var ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Chamado", ticketId));
        ticket.setStatus(status);
        ticketRepository.save(ticket);
        var tenant = tenantRepository.findById(ticket.getTenantId()).orElse(null);
        return toTicketResponse(ticket, tenant != null ? tenant.getName() : "—");
    }

    @Transactional
    public AdminTicketResponse respondToTicket(UUID ticketId, String response, String status) {
        var ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResourceNotFoundException("Chamado", ticketId));
        if (response != null && !response.isBlank()) {
            ticket.setAdminResponse(response.trim());
            ticket.setRespondedAt(java.time.OffsetDateTime.now());
        }
        if (status != null && !status.isBlank()) {
            ticket.setStatus(status);
        }
        ticketRepository.save(ticket);
        log.info("Admin responded to ticket={} status={}", ticketId, status);
        var tenant = tenantRepository.findById(ticket.getTenantId()).orElse(null);
        return toTicketResponse(ticket, tenant != null ? tenant.getName() : "—");
    }

    @Transactional(readOnly = true)
    public AdminStatsResponse stats() {
        long tenants = tenantRepository.count();
        long users   = userRepository.count();
        long openTickets = ticketRepository.findAll().stream()
            .filter(t -> !"resolved".equals(t.getStatus())).count();
        return new AdminStatsResponse(tenants, users, openTickets);
    }

    private AdminTenantResponse toTenantResponse(Tenant t, long managerCount) {
        return new AdminTenantResponse(
            t.getId(), t.getName(), t.getSlug(), t.getPlan(),
            t.isActive(), managerCount, t.getTrialEndsAt(), t.getCreatedAt()
        );
    }

    private AdminTicketResponse toTicketResponse(SupportTicket t, String tenantName) {
        return new AdminTicketResponse(
            t.getId(), tenantName, t.getSubject(), t.getDescription(),
            t.getPriority(), t.getStatus(),
            t.getAttachmentUrl(), t.getAttachmentName(),
            t.getAdminResponse(), t.getRespondedAt(),
            t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
