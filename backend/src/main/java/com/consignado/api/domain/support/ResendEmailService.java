package com.consignado.api.domain.support;

import org.springframework.stereotype.Service;

import com.consignado.api.config.AppProperties;
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
public class ResendEmailService {

    private static final MediaType JSON = MediaType.get("application/json");
    private static final String RESEND_URL = "https://api.resend.com/emails";

    private final OkHttpClient httpClient;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public void sendSupportTicketEmail(String tenantName, String subject, String description,
                                       String priority, String ticketId) {
        AppProperties.ResendProperties cfg = appProperties.resend();
        if (cfg == null || cfg.apiKey() == null || cfg.apiKey().isBlank()
                || cfg.apiKey().equals("disabled")) {
            log.info("Resend não configurado — e-mail de suporte não enviado para ticket={}", ticketId);
            return;
        }

        String priorityLabel = switch (priority) {
            case "high"   -> "🔴 Alta";
            case "low"    -> "🟢 Baixa";
            default       -> "🟡 Média";
        };

        String html = """
            <h2>Novo chamado de suporte</h2>
            <table>
              <tr><td><strong>Tenant:</strong></td><td>%s</td></tr>
              <tr><td><strong>Assunto:</strong></td><td>%s</td></tr>
              <tr><td><strong>Prioridade:</strong></td><td>%s</td></tr>
              <tr><td><strong>ID:</strong></td><td>%s</td></tr>
            </table>
            <h3>Descrição</h3>
            <p style="white-space:pre-wrap">%s</p>
            """.formatted(tenantName, subject, priorityLabel, ticketId, description);

        try {
            ObjectNode body = objectMapper.createObjectNode();
            body.put("from", cfg.fromEmail());
            body.put("to", cfg.supportEmail());
            body.put("subject", "[Suporte %s] %s — %s".formatted(priorityLabel, tenantName, subject));
            body.put("html", html);

            Request request = new Request.Builder()
                .url(RESEND_URL)
                .post(RequestBody.create(objectMapper.writeValueAsBytes(body), JSON))
                .addHeader("Authorization", "Bearer " + cfg.apiKey())
                .build();

            try (var response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    log.info("E-mail de suporte enviado para ticket={}", ticketId);
                } else {
                    log.warn("Resend retornou status={} para ticket={}", response.code(), ticketId);
                }
            }
        } catch (Exception e) {
            log.warn("Falha ao enviar e-mail de suporte para ticket={}: {}", ticketId, e.getMessage());
        }
    }
}
