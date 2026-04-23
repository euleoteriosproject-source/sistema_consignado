package com.consignado.api.domain.support.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SupportTicketResponse(
    UUID id,
    String subject,
    String description,
    String priority,
    String status,
    OffsetDateTime createdAt
) {}
