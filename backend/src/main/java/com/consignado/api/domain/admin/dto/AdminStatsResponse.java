package com.consignado.api.domain.admin.dto;

public record AdminStatsResponse(long totalTenants, long totalUsers, long openTickets) {}
