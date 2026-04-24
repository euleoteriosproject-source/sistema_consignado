package com.consignado.api.domain.consignment.dto;

import java.time.LocalDate;
import java.util.UUID;

public record ConsignmentFilterRequest(
    String status,
    UUID resellerId,
    UUID managerId,
    String consignmentType,
    LocalDate from,
    LocalDate to
) {}
