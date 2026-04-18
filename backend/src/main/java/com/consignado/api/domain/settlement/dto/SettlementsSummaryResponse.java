package com.consignado.api.domain.settlement.dto;

import java.math.BigDecimal;

public record SettlementsSummaryResponse(
    long totalSettlements,
    BigDecimal totalSoldValue,
    BigDecimal totalCommission,
    BigDecimal totalNetReceived
) {}
