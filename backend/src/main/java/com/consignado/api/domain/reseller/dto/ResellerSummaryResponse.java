package com.consignado.api.domain.reseller.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ResellerSummaryResponse(
    UUID id,
    String name,
    String phone,
    String email,
    String status,
    UUID managerId,
    String managerName,
    int openConsignments,
    BigDecimal openValue,
    BigDecimal pendingReceivable,
    OffsetDateTime createdAt
) {}
