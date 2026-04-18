package com.consignado.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
    String frontendUrl,
    SupabaseProperties supabase,
    JwtProperties jwt
) {

    public record SupabaseProperties(
        String url,
        String anonKey,
        String serviceRoleKey,
        String jwtSecret,
        String storageBucket
    ) {}

    public record JwtProperties(
        String secret
    ) {}
}
