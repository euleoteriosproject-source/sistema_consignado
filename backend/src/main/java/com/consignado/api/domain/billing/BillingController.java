package com.consignado.api.domain.billing;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.billing.dto.BillingPlanResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/billing")
@RequiredArgsConstructor
public class BillingController {

    private final BillingService billingService;

    @GetMapping("/plan")
    public ResponseEntity<BillingPlanResponse> getPlan() {
        return ResponseEntity.ok(billingService.getPlan());
    }

    @PostMapping("/portal")
    public ResponseEntity<Map<String, String>> createPortalSession() {
        String url = billingService.createPortalSession();
        return ResponseEntity.ok(Map.of("url", url));
    }
}
