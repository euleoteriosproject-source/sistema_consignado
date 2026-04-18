package com.consignado.api.domain.product;

public enum ProductCategory {
    ANEL, COLAR, BRINCO, PULSEIRA, TORNOZELEIRA, CONJUNTO, OUTRO;

    public String toDbValue() {
        return name().toLowerCase();
    }

    public static ProductCategory fromDbValue(String value) {
        return valueOf(value.toUpperCase());
    }
}
