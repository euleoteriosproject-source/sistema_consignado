package com.consignado.api.domain.support;

import java.util.List;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.support.dto.CreateSupportTicketRequest;
import com.consignado.api.domain.support.dto.SupportTicketResponse;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupportService {

    private final SupportTicketRepository ticketRepository;
    private final TenantRepository tenantRepository;
    private final ResendEmailService resendEmailService;

    @Transactional
    public SupportTicketResponse create(CreateSupportTicketRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var userId   = TenantContext.USER_ID.get();

        var tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));

        var ticket = new SupportTicket();
        ticket.setTenantId(tenantId);
        ticket.setUserId(userId);
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        ticket.setPriority(request.priority() != null ? request.priority() : "medium");

        var saved = ticketRepository.save(ticket);
        log.info("Support ticket created id={} tenant={}", saved.getId(), tenantId);

        sendEmailAsync(tenant.getName(), saved);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> list() {
        var tenantId = TenantContext.TENANT_ID.get();
        return ticketRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
            .stream().map(this::toResponse).toList();
    }

    @Async
    protected void sendEmailAsync(String tenantName, SupportTicket ticket) {
        resendEmailService.sendSupportTicketEmail(
            tenantName, ticket.getSubject(), ticket.getDescription(),
            ticket.getPriority(), ticket.getId().toString()
        );
    }

    private SupportTicketResponse toResponse(SupportTicket t) {
        return new SupportTicketResponse(
            t.getId(), t.getSubject(), t.getDescription(),
            t.getPriority(), t.getStatus(), t.getCreatedAt()
        );
    }
}
