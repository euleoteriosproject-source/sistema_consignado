package com.consignado.api.domain.consignment.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ConsignmentItemMovementResponse(
    UUID id,
    String movementType,
    int quantity,
    String notes,
    OffsetDateTime createdAt
) {}
