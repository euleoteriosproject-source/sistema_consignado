package com.consignado.api.domain.reseller.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateStatusRequest(
    @NotBlank(message = "Status é obrigatório") String status
) {}
