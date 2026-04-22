package com.consignado.api.security;

import java.io.IOException;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.consignado.api.config.AppProperties;
import com.consignado.api.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;

@Service
@RequiredArgsConstructor
@Slf4j
public class SupabaseAuthAdminService {

    private static final MediaType JSON = MediaType.get("application/json");

    private final OkHttpClient httpClient;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public UUID createUser(String email, String password) {
        String url = appProperties.supabase().url() + "/auth/v1/admin/users";
        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("email", email);
            body.put("password", password);
            body.put("email_confirm", true);

            Request request = new Request.Builder()
                .url(url)
                .post(RequestBody.create(objectMapper.writeValueAsBytes(body), JSON))
                .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
                .addHeader("apikey", appProperties.supabase().serviceRoleKey())
                .build();

            try (var response = httpClient.newCall(request).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "";
                if (!response.isSuccessful()) {
                    log.warn("Supabase create user failed: status={} body={}", response.code(), responseBody);
                    throw new BusinessException("Erro ao criar conta no Supabase: " + response.code());
                }
                var json = objectMapper.readTree(responseBody);
                return UUID.fromString(json.get("id").asText());
            }
        } catch (IOException e) {
            throw new BusinessException("Falha ao comunicar com Supabase Auth: " + e.getMessage());
        }
    }

    public void deleteUser(UUID supabaseUid) {
        String url = appProperties.supabase().url() + "/auth/v1/admin/users/" + supabaseUid;
        try {
            Request request = new Request.Builder()
                .url(url)
                .delete()
                .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
                .addHeader("apikey", appProperties.supabase().serviceRoleKey())
                .build();
            try (var response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    log.warn("Supabase delete user failed: uid={} status={}", supabaseUid, response.code());
                }
            }
        } catch (IOException e) {
            log.warn("Error deleting Supabase user {}: {}", supabaseUid, e.getMessage());
        }
    }
}
