package com.consignado.api.domain.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SettlementResponse(
    UUID id,
    UUID resellerId,
    String resellerName,
    UUID managerId,
    String managerName,
    UUID consignmentId,
    LocalDate settlementDate,
    BigDecimal totalSoldValue,
    BigDecimal totalCommission,
    BigDecimal netToReceive,
    String paymentMethod,
    String notes,
    OffsetDateTime createdAt
) {}
