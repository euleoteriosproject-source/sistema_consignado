package com.consignado.api.domain.settings.dto;

import java.util.UUID;

public record ProfileResponse(
    UUID id,
    String name,
    String email,
    String phone,
    String role
) {}
