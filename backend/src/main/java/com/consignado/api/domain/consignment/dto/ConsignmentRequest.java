package com.consignado.api.domain.consignment.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record ConsignmentRequest(
    @NotNull(message = "Revendedora é obrigatória") UUID resellerId,
    LocalDate deliveredAt,
    LocalDate expectedReturnAt,
    @NotEmpty(message = "Ao menos um item é obrigatório") @Valid List<ConsignmentItemRequest> items,
    String notes
) {}
