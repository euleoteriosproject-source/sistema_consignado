package com.consignado.api.domain.admin.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminTenantResponse(
    UUID id,
    String name,
    String slug,
    String plan,
    boolean active,
    long managerCount,
    OffsetDateTime trialEndsAt,
    OffsetDateTime createdAt
) {}
