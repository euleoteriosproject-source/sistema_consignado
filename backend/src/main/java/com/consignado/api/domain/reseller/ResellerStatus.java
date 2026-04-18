package com.consignado.api.domain.reseller;

public enum ResellerStatus {
    ACTIVE, INACTIVE, BLOCKED;

    public String toDbValue() {
        return name().toLowerCase();
    }

    public static ResellerStatus fromDbValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
