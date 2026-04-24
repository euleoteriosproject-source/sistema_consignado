package com.consignado.api.storage;

import java.io.IOException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.consignado.api.config.AppProperties;
import com.consignado.api.shared.exception.BusinessException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;

@Service
@Slf4j
@RequiredArgsConstructor
public class SupabaseStorageService {

    private final OkHttpClient httpClient;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public String upload(String folder, MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String safeName = originalName != null
            ? originalName.replaceAll("[^a-zA-Z0-9._-]", "_")
            : "file";
        String fileName = UUID.randomUUID() + "_" + safeName;
        String storagePath = folder + "/" + fileName;
        String bucket = appProperties.supabase().storageBucket();

        String url = appProperties.supabase().url()
            + "/storage/v1/object/" + bucket + "/" + storagePath;

        try {
            byte[] bytes = file.getBytes();
            String contentType = resolveContentType(file, safeName);

            log.info("Uploading file to storage: path={} size={} contentType={}", storagePath, bytes.length, contentType);

            RequestBody body = RequestBody.create(bytes, MediaType.parse(contentType));

            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
                .addHeader("Content-Type", contentType)
                .addHeader("x-upsert", "true")
                .build();

            try (var response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    String responseBody = response.body() != null ? response.body().string() : "(no body)";
                    log.error("Storage upload failed: status={} body={} url={}", response.code(), responseBody, url);
                    throw new BusinessException("Erro ao fazer upload: " + response.code() + " — " + responseBody);
                }
            }

            log.info("File uploaded successfully: {}", storagePath);
            return storagePath;

        } catch (IOException e) {
            throw new BusinessException("Falha ao enviar arquivo: " + e.getMessage());
        }
    }

    /**
     * Generates signed URLs for multiple paths in a single API call.
     * Returns map of storagePath → signedUrl; missing paths are omitted.
     */
    public java.util.Map<String, String> getSignedUrls(java.util.List<String> storagePaths, long expiresInSeconds) {
        if (storagePaths == null || storagePaths.isEmpty()) return java.util.Map.of();

        String bucket = appProperties.supabase().storageBucket();
        String url = appProperties.supabase().url()
            + "/storage/v1/object/sign/" + bucket;

        try {
            var pathsJson = objectMapper.writeValueAsString(
                java.util.Map.of("paths", storagePaths, "expiresIn", expiresInSeconds));
            RequestBody body = RequestBody.create(pathsJson.getBytes(), MediaType.parse("application/json"));

            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
                .build();

            try (var response = httpClient.newCall(request).execute()) {
                String responseBody = response.body() != null ? response.body().string() : "[]";
                if (!response.isSuccessful()) {
                    log.error("Batch signed URL failed: status={} body={}", response.code(), responseBody);
                    return java.util.Map.of();
                }
                var arr = objectMapper.readTree(responseBody);
                var result = new java.util.HashMap<String, String>();
                if (arr.isArray()) {
                    for (var node : arr) {
                        String path = node.path("path").asText();
                        String signedPath = node.path("signedURL").asText();
                        if (!path.isBlank() && !signedPath.isBlank()) {
                            result.put(path, appProperties.supabase().url() + "/storage/v1" + signedPath);
                        }
                    }
                }
                return result;
            }
        } catch (IOException e) {
            log.warn("Failed to batch sign URLs: {}", e.getMessage());
            return java.util.Map.of();
        }
    }

    /**
     * Generates a signed URL for a private bucket file.
     * @param storagePath path returned by upload()
     * @param expiresInSeconds how long the URL remains valid
     */
    public String getSignedUrl(String storagePath, long expiresInSeconds) {
        String bucket = appProperties.supabase().storageBucket();
        String url = appProperties.supabase().url()
            + "/storage/v1/object/sign/" + bucket + "/" + storagePath;

        String jsonBody = "{\"expiresIn\":" + expiresInSeconds + "}";
        RequestBody body = RequestBody.create(jsonBody.getBytes(), MediaType.parse("application/json"));

        Request request = new Request.Builder()
            .url(url)
            .post(body)
            .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
            .build();

        try (var response = httpClient.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "{}";
            if (!response.isSuccessful()) {
                log.error("Failed to generate signed URL: status={} body={}", response.code(), responseBody);
                throw new BusinessException("Erro ao gerar URL de acesso: " + response.code());
            }
            var node = objectMapper.readTree(responseBody);
            String signedPath = node.path("signedURL").asText();
            if (signedPath.isBlank()) {
                throw new BusinessException("Resposta inválida do storage ao gerar URL");
            }
            // signedURL é relativo a supabaseUrl/storage/v1
            return appProperties.supabase().url() + "/storage/v1" + signedPath;
        } catch (IOException e) {
            throw new BusinessException("Falha ao gerar URL assinada: " + e.getMessage());
        }
    }

    public void delete(String storagePath) {
        String bucket = appProperties.supabase().storageBucket();
        String url = appProperties.supabase().url()
            + "/storage/v1/object/" + bucket + "/" + storagePath;

        Request request = new Request.Builder()
            .url(url)
            .delete()
            .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
            .build();

        try (var response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                log.warn("Failed to delete file from storage: {} status={}", storagePath, response.code());
            }
        } catch (IOException e) {
            log.warn("Error deleting file from storage: {}", e.getMessage());
        }
    }

    private String resolveContentType(MultipartFile file, String fileName) {
        if (file.getContentType() != null && !file.getContentType().equals("application/octet-stream")) {
            return file.getContentType();
        }
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png"))  return "image/png";
        if (lower.endsWith(".gif"))  return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".pdf"))  return "application/pdf";
        return file.getContentType() != null ? file.getContentType() : "application/octet-stream";
    }
}
