package com.consignado.api.domain.reseller.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ResellerRequest(
    @NotBlank(message = "Nome é obrigatório") String name,
    @NotBlank(message = "Telefone é obrigatório") String phone,
    @NotNull(message = "Gestora é obrigatória") UUID managerId,
    String cpf,
    LocalDate birthDate,
    String phone2,
    String email,
    String addressStreet,
    String addressNumber,
    String addressComplement,
    String addressNeighborhood,
    String addressCity,
    String addressState,
    String addressZip,
    String instagram,
    String facebook,
    String tiktok,
    String reference1Name,
    String reference1Phone,
    String reference2Name,
    String reference2Phone,
    String notes
) {}
