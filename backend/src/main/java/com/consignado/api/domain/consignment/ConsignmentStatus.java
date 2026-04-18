package com.consignado.api.domain.consignment;

public enum ConsignmentStatus {
    OPEN, PARTIALLY_SETTLED, SETTLED, OVERDUE;

    public String toDbValue() {
        return name().toLowerCase();
    }
}
