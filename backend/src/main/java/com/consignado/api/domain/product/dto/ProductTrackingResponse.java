package com.consignado.api.domain.product.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ProductTrackingResponse(
    UUID id,
    String code,
    String name,
    int stockTotal,
    int stockAvailable,
    int stockOnConsignment,
    int totalSold,
    int totalReturned,
    int totalLost,
    BigDecimal totalConsignedValue,
    List<ConsignmentLocation> locations
) {
    public record ConsignmentLocation(
        UUID consignmentId,
        UUID resellerId,
        String resellerName,
        UUID managerId,
        String managerName,
        int quantityOnConsignment,
        LocalDate deliveredAt
    ) {}
}
