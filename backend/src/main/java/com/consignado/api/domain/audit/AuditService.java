package com.consignado.api.domain.audit;

import java.util.UUID;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional
    public void log(UUID tenantId, UUID userId, String action, String entityType, UUID entityId) {
        try {
            var entry = new AuditLog();
            entry.setTenantId(tenantId);
            entry.setUserId(userId);
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log action={} entity={}/{}", action, entityType, entityId, e);
        }
    }

    @Async
    @Transactional
    public void log(UUID tenantId, UUID userId, String action, String entityType, UUID entityId, String payload) {
        try {
            var entry = new AuditLog();
            entry.setTenantId(tenantId);
            entry.setUserId(userId);
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setPayload(payload);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            log.error("Failed to write audit log action={} entity={}/{}", action, entityType, entityId, e);
        }
    }
}
