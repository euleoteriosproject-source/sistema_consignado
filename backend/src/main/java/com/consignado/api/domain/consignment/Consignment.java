package com.consignado.api.domain.consignment;

import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.Filter;

import com.consignado.api.shared.entity.TimestampedEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "consignments")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Consignment extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "reseller_id", nullable = false)
    private UUID resellerId;

    @Column(name = "manager_id", nullable = false)
    private UUID managerId;

    @Column(name = "delivered_at", nullable = false)
    private LocalDate deliveredAt = LocalDate.now();

    @Column(name = "expected_return_at")
    private LocalDate expectedReturnAt;

    @Column(nullable = false, length = 30)
    private String status = "open";

    @Column(columnDefinition = "TEXT")
    private String notes;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public UUID getResellerId() { return resellerId; }
    public void setResellerId(UUID resellerId) { this.resellerId = resellerId; }

    public UUID getManagerId() { return managerId; }
    public void setManagerId(UUID managerId) { this.managerId = managerId; }

    public LocalDate getDeliveredAt() { return deliveredAt; }
    public void setDeliveredAt(LocalDate deliveredAt) { this.deliveredAt = deliveredAt; }

    public LocalDate getExpectedReturnAt() { return expectedReturnAt; }
    public void setExpectedReturnAt(LocalDate expectedReturnAt) { this.expectedReturnAt = expectedReturnAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
