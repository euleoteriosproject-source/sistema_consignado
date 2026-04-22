package com.consignado.api.domain.consignment.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record BatchMovementRequest(
    @NotEmpty(message = "Movimentações são obrigatórias") @Valid List<Item> movements,
    LocalDate movementDate
) {
    public record Item(
        @NotNull(message = "Item é obrigatório") UUID itemId,
        int quantitySold,
        int quantityReturned,
        int quantityLost,
        String notes
    ) {}
}
