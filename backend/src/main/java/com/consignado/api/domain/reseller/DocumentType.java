package com.consignado.api.domain.reseller;

public enum DocumentType {
    RG_FRONT, RG_BACK, CNH_FRONT, CNH_BACK, PROOF_OF_ADDRESS, SELFIE, OTHER;

    public String toDbValue() {
        return name().toLowerCase();
    }
}
