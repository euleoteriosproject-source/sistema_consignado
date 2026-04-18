package com.consignado.api.domain.product.dto;

public record ProductFilterRequest(
    String search,
    String category,
    Boolean active
) {}
