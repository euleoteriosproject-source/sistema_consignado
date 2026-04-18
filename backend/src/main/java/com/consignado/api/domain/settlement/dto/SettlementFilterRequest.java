package com.consignado.api.domain.settlement.dto;

import java.time.LocalDate;
import java.util.UUID;

public record SettlementFilterRequest(
    UUID resellerId,
    LocalDate from,
    LocalDate to
) {}
