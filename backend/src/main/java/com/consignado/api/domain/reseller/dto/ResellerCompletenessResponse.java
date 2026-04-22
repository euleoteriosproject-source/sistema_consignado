package com.consignado.api.domain.reseller.dto;

import java.util.List;

public record ResellerCompletenessResponse(
    boolean complete,
    List<String> missing
) {}
