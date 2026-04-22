package com.consignado.api.domain.settlement;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "settlements")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, updatable = false)
    private UUID tenantId;

    @Column(name = "reseller_id", nullable = false)
    private UUID resellerId;

    @Column(name = "manager_id", nullable = false)
    private UUID managerId;

    @Column(name = "consignment_id")
    private UUID consignmentId;

    @Column(name = "settlement_date", nullable = false)
    private LocalDate settlementDate;

    @Column(name = "total_sold_value", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalSoldValue;

    @Column(name = "total_commission", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalCommission;

    @Column(name = "net_to_receive", nullable = false, precision = 15, scale = 2)
    private BigDecimal netToReceive;

    @Column(name = "payment_method", nullable = false, length = 20)
    private String paymentMethod;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public UUID getResellerId() { return resellerId; }
    public void setResellerId(UUID resellerId) { this.resellerId = resellerId; }

    public UUID getManagerId() { return managerId; }
    public void setManagerId(UUID managerId) { this.managerId = managerId; }

    public UUID getConsignmentId() { return consignmentId; }
    public void setConsignmentId(UUID consignmentId) { this.consignmentId = consignmentId; }

    public LocalDate getSettlementDate() { return settlementDate; }
    public void setSettlementDate(LocalDate settlementDate) { this.settlementDate = settlementDate; }

    public BigDecimal getTotalSoldValue() { return totalSoldValue; }
    public void setTotalSoldValue(BigDecimal totalSoldValue) { this.totalSoldValue = totalSoldValue; }

    public BigDecimal getTotalCommission() { return totalCommission; }
    public void setTotalCommission(BigDecimal totalCommission) { this.totalCommission = totalCommission; }

    public BigDecimal getNetToReceive() { return netToReceive; }
    public void setNetToReceive(BigDecimal netToReceive) { this.netToReceive = netToReceive; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
