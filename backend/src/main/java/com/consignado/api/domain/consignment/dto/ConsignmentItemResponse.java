package com.consignado.api.domain.consignment.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ConsignmentItemResponse(
    UUID id,
    UUID productId,
    String productName,
    String productCode,
    int quantitySent,
    int quantitySold,
    int quantityReturned,
    int quantityLost,
    BigDecimal salePrice,
    BigDecimal commissionRate,
    String status,
    BigDecimal soldValue,
    BigDecimal commissionValue,
    List<ConsignmentItemMovementResponse> movements
) {}
