package com.consignado.api.domain.reseller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ResellerBalanceResponse(
    UUID resellerId,
    String resellerName,
    int openConsignmentsCount,
    BigDecimal totalSentValue,
    BigDecimal totalSoldValue,
    BigDecimal totalCommissionDue,
    BigDecimal netToReceive,
    long totalSettlementsCount,
    LocalDate lastSettlementDate
) {}
