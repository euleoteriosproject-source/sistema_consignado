package com.consignado.api.domain.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SettlementRequest(
    @NotNull(message = "Revendedora é obrigatória") UUID resellerId,
    UUID consignmentId,
    LocalDate settlementDate,
    BigDecimal totalSoldValue,
    BigDecimal totalCommission,
    @NotBlank(message = "Forma de pagamento é obrigatória") String paymentMethod,
    String notes
) {}
