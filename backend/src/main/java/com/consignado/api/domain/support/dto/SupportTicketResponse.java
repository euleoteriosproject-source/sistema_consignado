package com.consignado.api.domain.support.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SupportTicketResponse(
    UUID id,
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
