package com.consignado.api.storage;

import java.io.IOException;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.consignado.api.config.AppProperties;
import com.consignado.api.shared.exception.BusinessException;

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

    public String upload(String folder, MultipartFile file) {
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        String storagePath = folder + "/" + fileName;
        String bucket = appProperties.supabase().storageBucket();

        String url = appProperties.supabase().url()
            + "/storage/v1/object/" + bucket + "/" + storagePath;

        try {
            byte[] bytes = file.getBytes();
            String contentType = file.getContentType() != null
                ? file.getContentType() : "application/octet-stream";

            RequestBody body = RequestBody.create(bytes, MediaType.parse(contentType));

            Request request = new Request.Builder()
                .url(url)
                .post(body)
                .addHeader("Authorization", "Bearer " + appProperties.supabase().serviceRoleKey())
                .addHeader("Content-Type", contentType)
                .build();

            try (var response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    throw new BusinessException("Erro ao fazer upload: " + response.code());
                }
            }

            log.info("File uploaded to storage: {}", storagePath);
            return storagePath;

        } catch (IOException e) {
            throw new BusinessException("Falha ao enviar arquivo: " + e.getMessage());
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

    public String getPublicUrl(String storagePath) {
        String bucket = appProperties.supabase().storageBucket();
        return appProperties.supabase().url()
            + "/storage/v1/object/public/" + bucket + "/" + storagePath;
    }
}
