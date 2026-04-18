package com.consignado.api.domain.consignment.dto;

import java.util.UUID;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ConsignmentItemRequest(
    @NotNull(message = "Produto é obrigatório") UUID productId,
    @NotNull(message = "Quantidade é obrigatória") @Min(value = 1, message = "Quantidade mínima é 1") Integer quantitySent
) {}
