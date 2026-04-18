package com.consignado.api.domain.product.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductImageResponse(
    UUID id,
    String storagePath,
    String publicUrl,
    int displayOrder,
    boolean isPrimary,
    OffsetDateTime createdAt
) {}
