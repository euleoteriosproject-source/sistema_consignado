package com.consignado.api.domain.settings.dto;

public record UpdateProfileRequest(
    String name,
    String phone
) {}
