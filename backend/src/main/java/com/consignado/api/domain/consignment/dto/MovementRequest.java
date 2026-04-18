package com.consignado.api.domain.consignment.dto;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MovementRequest(
    @NotNull(message = "Item é obrigatório") UUID itemId,
    @NotBlank(message = "Tipo é obrigatório") String type,
    @NotNull(message = "Quantidade é obrigatória") @Min(value = 1, message = "Quantidade mínima é 1") Integer quantity
) {}
