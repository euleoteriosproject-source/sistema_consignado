package com.consignado.api.domain.product.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductSummaryResponse(
    UUID id,
    String code,
    String name,
    String category,
    BigDecimal salePrice,
    int stockTotal,
    int stockAvailable,
    boolean active,
    String primaryImageUrl,
    OffsetDateTime createdAt
) {}
