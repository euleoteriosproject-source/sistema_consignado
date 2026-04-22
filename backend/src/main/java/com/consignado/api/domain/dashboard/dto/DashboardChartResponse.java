package com.consignado.api.domain.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardChartResponse(List<DataPoint> monthlySales) {

    public record DataPoint(
        String month,
        BigDecimal totalValue,
        BigDecimal totalCommission,
        BigDecimal netReceived
    ) {}
}
