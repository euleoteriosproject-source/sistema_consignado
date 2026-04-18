package com.consignado.api.domain.product.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductTrackingResponse(
    UUID id,
    String code,
    String name,
    int stockTotal,
    int stockAvailable,
    int stockOnConsignment,
    BigDecimal totalConsignedValue
) {}
