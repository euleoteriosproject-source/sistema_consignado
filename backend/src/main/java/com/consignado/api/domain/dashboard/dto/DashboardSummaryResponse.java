package com.consignado.api.domain.dashboard.dto;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
    long activeResellers,
    long openConsignments,
    long overdueConsignments,
    int totalItemsOnConsignment,
    BigDecimal totalOpenValue,
    BigDecimal totalSettledThisMonth
) {}
