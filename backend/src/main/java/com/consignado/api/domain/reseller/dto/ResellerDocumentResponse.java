package com.consignado.api.domain.reseller.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ResellerDocumentResponse(
    UUID id,
    String type,
    String storagePath,
    String fileName,
    String publicUrl,
    OffsetDateTime uploadedAt
) {}
