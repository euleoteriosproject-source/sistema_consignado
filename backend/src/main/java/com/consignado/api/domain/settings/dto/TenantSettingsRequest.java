package com.consignado.api.domain.settings.dto;

public record TenantSettingsRequest(
    String name,
    String logoUrl,
    String primaryColor,
    Integer defaultCommissionRate,
    Integer defaultReturnDays,
    Boolean blockNewLotIfOverdue
) {}
