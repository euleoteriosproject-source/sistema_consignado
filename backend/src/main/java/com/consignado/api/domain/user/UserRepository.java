package com.consignado.api.domain.user;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findBySupabaseUid(UUID supabaseUid);

    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);

    List<User> findByTenantIdAndActiveTrue(UUID tenantId);

    List<User> findByTenantIdAndRole(UUID tenantId, String role);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);

    Optional<User> findFirstByEmailIgnoreCaseAndActiveTrue(String email);
}
