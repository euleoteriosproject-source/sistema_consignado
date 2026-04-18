package com.consignado.api.domain.product.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateProductStatusRequest(
    @NotNull(message = "Status é obrigatório") Boolean active
) {}
