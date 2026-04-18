package com.consignado.api.domain.product.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    String code,
    String name,
    String description,
    String category,
    BigDecimal costPrice,
    BigDecimal salePrice,
    BigDecimal commissionRate,
    int stockTotal,
    int stockAvailable,
    boolean active,
    List<ProductImageResponse> images,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
