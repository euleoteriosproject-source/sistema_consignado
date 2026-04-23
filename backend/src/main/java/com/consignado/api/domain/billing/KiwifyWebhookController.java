package com.consignado.api.domain.billing;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.config.AppProperties;
import com.consignado.api.domain.tenant.TenantProvisioningService;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/webhooks/kiwify")
@RequiredArgsConstructor
@Slf4j
public class KiwifyWebhookController {

    private final AppProperties appProperties;
    private final TenantProvisioningService provisioningService;

    @PostMapping
    public ResponseEntity<Void> handle(
            @RequestBody JsonNode payload,
            @RequestParam(required = false) String token) {

        String expectedToken = appProperties.kiwify().webhookToken();
        String receivedToken = token != null ? token
            : (payload.has("token") ? payload.get("token").asText() : "");

        log.info("Kiwify webhook: expectedToken={} receivedToken={} queryParam={} bodyToken={}",
            expectedToken, receivedToken, token,
            payload.has("token") ? payload.get("token").asText() : "N/A");

        if (!expectedToken.equals(receivedToken)) {
            log.warn("Kiwify webhook: token inválido - esperado={} recebido={}", expectedToken, receivedToken);
            return ResponseEntity.status(401).build();
        }

        String event = payload.has("event") ? payload.get("event").asText() : "";
        log.info("Kiwify webhook recebido: event={}", event);

        if (!"order_approved".equals(event) && !"purchase.approved".equals(event)) {
            return ResponseEntity.ok().build();
        }

        try {
            JsonNode data = payload.get("data");
            if (data == null) return ResponseEntity.ok().build();

            JsonNode customer = data.get("customer");
            JsonNode product  = data.get("product");
            if (customer == null || product == null) return ResponseEntity.ok().build();

            String email    = customer.has("email") ? customer.get("email").asText() : null;
            String name     = customer.has("full_name") ? customer.get("full_name").asText()
                            : customer.has("name") ? customer.get("name").asText() : "Cliente";

            // Tenta resolver o plano pelo nome do plano de assinatura
            String planName = "";
            if (data.has("subscription") && data.get("subscription").has("plan")
                    && data.get("subscription").get("plan").has("name")) {
                planName = data.get("subscription").get("plan").get("name").asText();
            } else if (product.has("name")) {
                planName = product.get("name").asText();
            }

            if (email == null || email.isBlank()) {
                log.warn("Kiwify webhook: email ausente no payload");
                return ResponseEntity.ok().build();
            }

            String plan = resolvePlanByName(planName);
            log.info("Kiwify webhook: email={} planName={} resolvedPlan={}", email, planName, plan);
            provisioningService.provisionFromKiwify(email, name, plan);

        } catch (Exception e) {
            log.error("Kiwify webhook: erro ao processar payload", e);
        }

        return ResponseEntity.ok().build();
    }

    private String resolvePlanByName(String planName) {
        if (planName == null) return "basic";
        String lower = planName.toLowerCase();
        if (lower.contains("premium")) return "premium";
        if (lower.contains("pro"))     return "pro";
        return "basic";
    }
}
