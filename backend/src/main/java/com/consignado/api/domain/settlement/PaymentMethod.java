package com.consignado.api.domain.settlement;

public enum PaymentMethod {
    CASH, PIX, TRANSFER, OTHER;

    public String toDbValue() {
        return name().toLowerCase();
    }
}
