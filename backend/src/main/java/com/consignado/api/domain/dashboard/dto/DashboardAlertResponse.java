package com.consignado.api.domain.dashboard.dto;

import java.time.LocalDate;
import java.util.UUID;

public record DashboardAlertResponse(
    UUID consignmentId,
    UUID resellerId,
    String resellerName,
    LocalDate expectedReturnAt,
    int daysOverdue
) {}
