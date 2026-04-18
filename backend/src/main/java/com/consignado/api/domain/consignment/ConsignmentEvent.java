package com.consignado.api.domain.consignment;

import java.math.BigDecimal;
import java.util.UUID;

public sealed interface ConsignmentEvent
    permits ConsignmentCreated, ItemSold, ItemReturned, ItemLost, ConsignmentSettled {}

record ConsignmentCreated(UUID consignmentId, UUID resellerId) implements ConsignmentEvent {}

record ItemSold(UUID itemId, int quantity, BigDecimal value) implements ConsignmentEvent {}

record ItemReturned(UUID itemId, int quantity) implements ConsignmentEvent {}

record ItemLost(UUID itemId, int quantity) implements ConsignmentEvent {}

record ConsignmentSettled(UUID consignmentId, BigDecimal netValue) implements ConsignmentEvent {}
