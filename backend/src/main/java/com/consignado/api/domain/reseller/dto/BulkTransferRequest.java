package com.consignado.api.domain.reseller.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record BulkTransferRequest(
    @NotEmpty List<UUID> resellerIds,
    @NotNull UUID targetManagerId
) {}
