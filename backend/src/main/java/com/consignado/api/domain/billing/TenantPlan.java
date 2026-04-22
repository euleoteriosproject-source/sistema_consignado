package com.consignado.api.domain.billing;

public enum TenantPlan {

    BASIC("basic", 1, 20, 50, 1_073_741_824L),
    PRO("pro", 3, 100, Integer.MAX_VALUE, 5_368_709_120L),
    PREMIUM("premium", Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE, 21_474_836_480L);

    private final String value;
    private final int maxManagers;
    private final int maxResellers;
    private final int maxProducts;
    private final long maxStorageBytes;

    TenantPlan(String value, int maxManagers, int maxResellers, int maxProducts, long maxStorageBytes) {
        this.value = value;
        this.maxManagers = maxManagers;
        this.maxResellers = maxResellers;
        this.maxProducts = maxProducts;
        this.maxStorageBytes = maxStorageBytes;
    }

    public String getValue() { return value; }
    public int getMaxManagers() { return maxManagers; }
    public int getMaxResellers() { return maxResellers; }
    public int getMaxProducts() { return maxProducts; }
    public long getMaxStorageBytes() { return maxStorageBytes; }

    public static TenantPlan from(String value) {
        for (TenantPlan plan : values()) {
            if (plan.value.equalsIgnoreCase(value)) return plan;
        }
        return BASIC;
    }

    public String priceLabel() {
        return switch (this) {
            case BASIC   -> "R$ 147/mês";
            case PRO     -> "R$ 197/mês";
            case PREMIUM -> "R$ 397/mês";
        };
    }
}
