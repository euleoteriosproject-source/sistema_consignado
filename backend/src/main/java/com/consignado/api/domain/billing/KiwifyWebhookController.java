package com.consignado.api.domain.billing;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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

    @PostMapping("/{token}")
    public ResponseEntity<Void> handle(
            @PathVariable String token,
            @RequestBody JsonNode payload) {

        if (!appProperties.kiwify().webhookToken().equals(token)) {
            log.warn("Kiwify webhook: token inválido");
            return ResponseEntity.status(401).build();
        }

        String event = payload.has("webhook_event_type")
            ? payload.get("webhook_event_type").asText() : "";
        log.info("Kiwify webhook recebido: event={}", event);

        if (!"order_approved".equals(event)) {
            return ResponseEntity.ok().build();
        }

        try {
            JsonNode customer = payload.get("Customer");
            JsonNode product  = payload.get("Product");
            if (customer == null) return ResponseEntity.ok().build();

            String email = customer.has("email") ? customer.get("email").asText() : null;
            String name  = customer.has("full_name") ? customer.get("full_name").asText()
                         : customer.has("first_name") ? customer.get("first_name").asText() : "Cliente";

            if (email == null || email.isBlank()) {
                log.warn("Kiwify webhook: email ausente");
                return ResponseEntity.ok().build();
            }

            String planName = "";
            JsonNode subscription = payload.get("Subscription");
            if (subscription != null && subscription.has("plan")
                    && subscription.get("plan").has("name")) {
                planName = subscription.get("plan").get("name").asText();
            } else if (product != null && product.has("product_name")) {
                planName = product.get("product_name").asText();
            }

            String plan = resolvePlanByName(planName);
            log.info("Kiwify webhook: provisionando email={} name={} plan={}", email, name, plan);
            provisioningService.provisionFromKiwify(email, name, plan);

        } catch (Exception e) {
            log.error("Kiwify webhook: erro ao processar", e);
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
