package com.consignado.api.domain.settings.dto;

public record BrandingResponse(
    String name,
    String logoUrl,
    String primaryColor
) {}
