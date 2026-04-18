package com.consignado.api.domain.product.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductRequest(
    @NotBlank(message = "Nome é obrigatório") String name,
    @NotBlank(message = "Categoria é obrigatória") String category,
    @NotNull(message = "Preço de venda é obrigatório")
    @DecimalMin(value = "0.00", message = "Preço de venda não pode ser negativo") BigDecimal salePrice,
    String code,
    String description,
    BigDecimal costPrice,
    BigDecimal commissionRate,
    Integer stockTotal
) {}
