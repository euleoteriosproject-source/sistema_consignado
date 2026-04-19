package com.consignado.api.domain.settings.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TenantSettingsResponse(
    UUID id,
    String name,
    String slug,
    String logoUrl,
    String primaryColor,
    String plan,
    int defaultCommissionRate,
    int defaultReturnDays,
    boolean blockNewLotIfOverdue,
    OffsetDateTime trialEndsAt,
    OffsetDateTime createdAt
) {}
