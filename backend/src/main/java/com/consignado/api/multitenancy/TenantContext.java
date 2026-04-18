package com.consignado.api.multitenancy;

import java.util.UUID;

public final class TenantContext {

    public static final ScopedValue<UUID> TENANT_ID = ScopedValue.newInstance();
    public static final ScopedValue<UUID> USER_ID = ScopedValue.newInstance();
    public static final ScopedValue<String> ROLE = ScopedValue.newInstance();

    private TenantContext() {}
}
