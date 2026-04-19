package com.consignado.api.domain.settings.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateManagerStatusRequest(
    @NotNull(message = "Status é obrigatório") Boolean active
) {}
