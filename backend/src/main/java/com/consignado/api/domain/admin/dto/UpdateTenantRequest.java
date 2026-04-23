package com.consignado.api.domain.admin.dto;

public record UpdateTenantRequest(String name, String plan, Boolean active) {}
