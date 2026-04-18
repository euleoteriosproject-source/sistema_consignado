package com.consignado.api.domain.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardChartResponse(List<DataPoint> points) {

    public record DataPoint(
        String period,
        BigDecimal totalSold,
        BigDecimal totalCommission,
        BigDecimal netReceived
    ) {}
}
