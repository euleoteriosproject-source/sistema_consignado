package com.consignado.api.domain.settings.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateManagerRequest(
    @NotBlank(message = "Nome é obrigatório") String name,
    @NotBlank(message = "Email é obrigatório") @Email(message = "Email inválido") String email,
    String phone
) {}
