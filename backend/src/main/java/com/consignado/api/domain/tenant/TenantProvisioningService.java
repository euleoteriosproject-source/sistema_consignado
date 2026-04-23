package com.consignado.api.domain.tenant;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.security.SupabaseAuthAdminService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class TenantProvisioningService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final SupabaseAuthAdminService supabaseAuthAdminService;

    @Transactional
    public void provisionFromKiwify(String customerEmail, String customerName, String plan) {
        if (userRepository.findByEmail(customerEmail).isPresent()) {
            log.info("Kiwify webhook: tenant já existe para email={}, ignorando", customerEmail);
            return;
        }

        String slug = generateSlug(customerName);

        var tenant = new Tenant();
        tenant.setName(customerName);
        tenant.setSlug(ensureUniqueSlug(slug));
        tenant.setPlan(normalizePlan(plan));
        tenant.setActive(true);
        tenant.setSettings("{\"default_commission_rate\":30,\"default_return_days\":30,\"block_new_lot_if_overdue\":true}");
        var savedTenant = tenantRepository.save(tenant);

        UUID supabaseUid = supabaseAuthAdminService.inviteUser(customerEmail);

        if (userRepository.findBySupabaseUid(supabaseUid).isPresent()) {
            log.info("Kiwify webhook: supabase_uid={} já vinculado a outro tenant, ignorando", supabaseUid);
            return;
        }

        var user = new User();
        user.setTenantId(savedTenant.getId());
        user.setSupabaseUid(supabaseUid);
        user.setName(customerName);
        user.setEmail(customerEmail);
        user.setRole("owner");
        user.setActive(true);
        userRepository.save(user);

        log.info("Tenant provisionado via Kiwify: tenantId={} email={} plano={}", savedTenant.getId(), customerEmail, plan);
    }

    private String normalizePlan(String plan) {
        if (plan == null) return "basic";
        return switch (plan.toLowerCase()) {
            case "pro" -> "pro";
            case "premium" -> "premium";
            default -> "basic";
        };
    }

    private String generateSlug(String name) {
        return name.toLowerCase()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "")
            .substring(0, Math.min(50, name.length()));
    }

    private String ensureUniqueSlug(String base) {
        String candidate = base;
        int i = 1;
        while (tenantRepository.existsBySlug(candidate)) {
            candidate = base + "-" + i++;
        }
        return candidate;
    }
}
