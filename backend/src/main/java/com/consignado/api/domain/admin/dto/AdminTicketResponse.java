package com.consignado.api.domain.admin.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminTicketResponse(
    UUID id,
    String tenantName,
    String subject,
    String description,
    String priority,
    String status,
    String attachmentUrl,
    String attachmentName,
    String adminResponse,
    OffsetDateTime respondedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
