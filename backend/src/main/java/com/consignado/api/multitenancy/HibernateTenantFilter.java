package com.consignado.api.multitenancy;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;

import org.hibernate.Session;

@Aspect
@Component
@Slf4j
public class HibernateTenantFilter {

    @PersistenceContext
    private EntityManager entityManager;

    @Around("@within(org.springframework.stereotype.Service)")
    public Object applyTenantFilter(ProceedingJoinPoint pjp) throws Throwable {
        if (!TenantContext.TENANT_ID.isBound()) {
            return pjp.proceed();
        }

        var tenantId = TenantContext.TENANT_ID.get();
        Session session = entityManager.unwrap(Session.class);

        session.enableFilter("tenantFilter").setParameter("tenantId", tenantId);

        try {
            return pjp.proceed();
        } finally {
            session.disableFilter("tenantFilter");
        }
    }
}
