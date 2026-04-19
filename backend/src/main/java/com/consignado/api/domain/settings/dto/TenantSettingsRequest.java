package com.consignado.api.domain.settings.dto;

import jakarta.validation.constraints.NotBlank;

public record TenantSettingsRequest(
    @NotBlank(message = "Nome é obrigatório") String name,
    String logoUrl,
    String primaryColor,
    Integer defaultCommissionRate,
    Integer defaultReturnDays,
    Boolean blockNewLotIfOverdue
) {}
