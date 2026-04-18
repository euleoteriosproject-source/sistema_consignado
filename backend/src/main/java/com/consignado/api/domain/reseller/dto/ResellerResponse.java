package com.consignado.api.domain.reseller.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ResellerResponse(
    UUID id,
    String name,
    String phone,
    String phone2,
    String email,
    String cpf,
    LocalDate birthDate,
    String status,
    UUID managerId,
    String managerName,
    String addressStreet,
    String addressNumber,
    String addressComplement,
    String addressNeighborhood,
    String addressCity,
    String addressState,
    String addressZip,
    String instagram,
    String facebook,
    String tiktok,
    String reference1Name,
    String reference1Phone,
    String reference2Name,
    String reference2Phone,
    String notes,
    int openConsignments,
    BigDecimal openValue,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
