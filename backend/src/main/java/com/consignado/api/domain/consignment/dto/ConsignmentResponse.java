package com.consignado.api.domain.consignment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ConsignmentResponse(
    UUID id,
    UUID resellerId,
    String resellerName,
    UUID managerId,
    String managerName,
    LocalDate deliveredAt,
    LocalDate expectedReturnAt,
    String status,
    String notes,
    List<ConsignmentItemResponse> items,
    BigDecimal totalSentValue,
    BigDecimal totalSoldValue,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
