package com.consignado.api.domain.consignment.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ConsignmentSummaryResponse(
    UUID id,
    UUID resellerId,
    String resellerName,
    UUID managerId,
    String managerName,
    LocalDate deliveredAt,
    LocalDate expectedReturnAt,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
