package com.consignado.api.security;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.config.AppProperties;
import com.consignado.api.domain.billing.BillingService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.model.Subscription;
import com.stripe.net.Webhook;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/webhooks")
@Slf4j
@RequiredArgsConstructor
public class StripeWebhookController {

    private final BillingService billingService;
    private final AppProperties appProperties;

    @PostMapping("/stripe")
    public ResponseEntity<Void> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, appProperties.stripe().webhookSecret());
        } catch (SignatureVerificationException e) {
            log.warn("Invalid Stripe webhook signature: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }

        log.info("Received Stripe webhook event={}", event.getType());

        switch (event.getType()) {
            case "customer.subscription.updated" -> handleSubscriptionUpdated(event);
            case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
            default -> log.debug("Unhandled Stripe event type={}", event.getType());
        }

        return ResponseEntity.ok().build();
    }

    private void handleSubscriptionUpdated(Event event) {
        event.getDataObjectDeserializer().getObject().ifPresent(obj -> {
            if (obj instanceof Subscription sub) {
                String customerId = sub.getCustomer();
                String plan = extractPlan(sub);
                boolean active = "active".equals(sub.getStatus()) || "trialing".equals(sub.getStatus());
                billingService.handleSubscriptionUpdated(customerId, plan, active);
            }
        });
    }

    private void handleSubscriptionDeleted(Event event) {
        event.getDataObjectDeserializer().getObject().ifPresent(obj -> {
            if (obj instanceof Subscription sub) {
                billingService.handleSubscriptionCanceled(sub.getCustomer());
            }
        });
    }

    private String extractPlan(Subscription sub) {
        if (sub.getItems() == null || sub.getItems().getData().isEmpty()) return "basic";
        var priceId = sub.getItems().getData().getFirst().getPrice().getId();
        if (priceId.contains("premium")) return "premium";
        if (priceId.contains("pro"))     return "pro";
        return "basic";
    }
}
