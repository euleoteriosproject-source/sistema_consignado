package com.consignado.api.domain.support;

import java.util.List;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.support.dto.CreateSupportTicketRequest;
import com.consignado.api.domain.support.dto.SupportTicketResponse;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;
import com.consignado.api.storage.SupabaseStorageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupportService {

    private final SupportTicketRepository ticketRepository;
    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ResendEmailService resendEmailService;
    private final SupabaseStorageService storageService;

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
        ticket.setAttachmentUrl(request.attachmentUrl());
        ticket.setAttachmentName(request.attachmentName());

        var saved = ticketRepository.save(ticket);
        log.info("Support ticket created id={} tenant={}", saved.getId(), tenantId);

        var ownerEmail = userRepository.findById(userId).map(u -> u.getEmail()).orElse("");
        sendEmailAsync(tenant.getName(), saved, ownerEmail);

        return toResponse(saved);
    }

    @Transactional
    public SupportTicketResponse updateStatus(java.util.UUID ticketId, String status) {
        var tenantId = TenantContext.TENANT_ID.get();
        if (!java.util.List.of("open", "in_progress", "resolved").contains(status)) {
            throw new BusinessException("Status inválido: " + status);
        }
        var ticket = ticketRepository.findById(ticketId)
            .filter(t -> t.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Chamado", ticketId));
        ticket.setStatus(status);
        return toResponse(ticketRepository.save(ticket));
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> list() {
        var tenantId = TenantContext.TENANT_ID.get();
        return ticketRepository.findByTenantIdOrderByCreatedAtDesc(tenantId)
            .stream().map(this::toResponse).toList();
    }

    @Async
    protected void sendEmailAsync(String tenantName, SupportTicket ticket, String replyToEmail) {
        resendEmailService.sendSupportTicketEmail(
            tenantName, ticket.getSubject(), ticket.getDescription(),
            ticket.getPriority(), ticket.getId().toString(), replyToEmail
        );
    }

    public String uploadAttachment(org.springframework.web.multipart.MultipartFile file) {
        var storagePath = storageService.upload("support", file);
        return storageService.getSignedUrl(storagePath, 60L * 60 * 24 * 365 * 5);
    }

    private SupportTicketResponse toResponse(SupportTicket t) {
        return new SupportTicketResponse(
            t.getId(), t.getSubject(), t.getDescription(),
            t.getPriority(), t.getStatus(),
            t.getAttachmentUrl(), t.getAttachmentName(),
            t.getAdminResponse(), t.getRespondedAt(),
            t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
