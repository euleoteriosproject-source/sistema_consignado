package com.consignado.api.domain.reseller.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ResellerSummaryResponse(
    UUID id,
    String name,
    String phone,
    String email,
    String status,
    String managerName,
    int openConsignments,
    OffsetDateTime createdAt
) {}
