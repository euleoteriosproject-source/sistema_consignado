package com.consignado.api.domain.billing;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.config.AppProperties;
import com.consignado.api.domain.billing.dto.BillingPlanResponse;
import com.consignado.api.domain.product.ProductRepository;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.tenant.Tenant;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Customer;
import com.stripe.model.billingportal.Session;
import com.stripe.param.CustomerCreateParams;
import com.stripe.param.billingportal.SessionCreateParams;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class BillingService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final ResellerRepository resellerRepository;
    private final ProductRepository productRepository;
    private final AppProperties appProperties;

    @PostConstruct
    void init() {
        Stripe.apiKey = appProperties.stripe().secretKey();
    }

    @Transactional(readOnly = true)
    public BillingPlanResponse getPlan() {
        var tenantId = TenantContext.TENANT_ID.get();
        var tenant = loadTenant(tenantId);
        var plan = TenantPlan.from(tenant.getPlan());

        int currentManagers = userRepository.findByTenantIdAndRole(tenantId, "manager").size();
        int currentResellers = (int) resellerRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
        int currentProducts = (int) productRepository.countByTenantIdAndDeletedAtIsNull(tenantId);

        boolean onTrial = tenant.getTrialEndsAt() != null
            && tenant.getTrialEndsAt().isAfter(OffsetDateTime.now());

        return new BillingPlanResponse(
            plan.getValue(),
            plan.priceLabel(),
            tenant.isActive(),
            tenant.getTrialEndsAt(),
            onTrial,
            plan.getMaxManagers(),
            plan.getMaxResellers(),
            plan.getMaxProducts(),
            currentManagers,
            currentResellers,
            currentProducts
        );
    }

    @Transactional
    public String createPortalSession() {
        var tenantId = TenantContext.TENANT_ID.get();
        var tenant = loadTenant(tenantId);

        try {
            String customerId = ensureStripeCustomer(tenant);

            Session session = Session.create(
                SessionCreateParams.builder()
                    .setCustomer(customerId)
                    .setReturnUrl(appProperties.frontendUrl() + "/configuracoes")
                    .build()
            );
            log.info("Stripe portal session created for tenant={}", tenantId);
            return session.getUrl();
        } catch (StripeException e) {
            log.error("Failed to create Stripe portal session for tenant={}: {}", tenantId, e.getMessage());
            throw new BusinessException("Erro ao acessar portal de cobrança: " + e.getMessage());
        }
    }

    @Transactional
    public void handleSubscriptionUpdated(String stripeCustomerId, String plan, boolean active) {
        tenantRepository.findByStripeCustomerId(stripeCustomerId).ifPresent(tenant -> {
            tenant.setPlan(plan);
            tenant.setActive(active);
            tenantRepository.save(tenant);
            log.info("Tenant plan updated via Stripe webhook customerId={} plan={} active={}",
                stripeCustomerId, plan, active);
        });
    }

    @Transactional
    public void handleSubscriptionCanceled(String stripeCustomerId) {
        tenantRepository.findByStripeCustomerId(stripeCustomerId).ifPresent(tenant -> {
            tenant.setActive(false);
            tenantRepository.save(tenant);
            log.info("Tenant deactivated via Stripe webhook customerId={}", stripeCustomerId);
        });
    }

    private String ensureStripeCustomer(Tenant tenant) throws StripeException {
        if (tenant.getStripeCustomerId() != null) {
            return tenant.getStripeCustomerId();
        }

        Customer customer = Customer.create(
            CustomerCreateParams.builder()
                .setEmail(findOwnerEmail(tenant.getId()))
                .setName(tenant.getName())
                .putMetadata("tenant_id", tenant.getId().toString())
                .build()
        );

        tenant.setStripeCustomerId(customer.getId());
        tenantRepository.save(tenant);
        log.info("Stripe customer created id={} for tenant={}", customer.getId(), tenant.getId());
        return customer.getId();
    }

    private String findOwnerEmail(UUID tenantId) {
        return userRepository.findByTenantIdAndRole(tenantId, "owner").stream()
            .findFirst()
            .map(u -> u.getEmail())
            .orElse("owner@unknown.com");
    }

    private Tenant loadTenant(UUID tenantId) {
        return tenantRepository.findById(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
    }
}
