package com.consignado.api.domain.billing.dto;

import java.time.OffsetDateTime;

public record BillingPlanResponse(
    String plan,
    String priceLabel,
    boolean active,
    OffsetDateTime trialEndsAt,
    boolean onTrial,
    int maxManagers,
    int maxResellers,
    int maxProducts,
    int currentManagers,
    int currentResellers,
    int currentProducts
) {}
