package com.consignado.api.domain.settings.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ManagerResponse(
    UUID id,
    String name,
    String email,
    String phone,
    boolean active,
    OffsetDateTime createdAt
) {}
