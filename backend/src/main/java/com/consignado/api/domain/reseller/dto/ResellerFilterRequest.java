package com.consignado.api.domain.reseller.dto;

import java.util.UUID;

public record ResellerFilterRequest(
    String search,
    String status,
    UUID managerId
) {}
