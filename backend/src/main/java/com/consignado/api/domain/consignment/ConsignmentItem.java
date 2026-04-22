package com.consignado.api.domain.consignment;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.Filter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "consignment_items")
@Filter(name = "tenantFilter", condition = "tenant_id = :tenantId")
public class ConsignmentItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "consignment_id", nullable = false)
    private UUID consignmentId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "quantity_sent", nullable = false)
    private int quantitySent;

    @Column(name = "quantity_sold", nullable = false)
    private int quantitySold = 0;

    @Column(name = "quantity_returned", nullable = false)
    private int quantityReturned = 0;

    @Column(name = "quantity_lost", nullable = false)
    private int quantityLost = 0;

    @Column(name = "sale_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal commissionRate;

    @Column(nullable = false, length = 30)
    private String status = "pending";

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }

    public UUID getConsignmentId() { return consignmentId; }
    public void setConsignmentId(UUID consignmentId) { this.consignmentId = consignmentId; }

    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }

    public int getQuantitySent() { return quantitySent; }
    public void setQuantitySent(int quantitySent) { this.quantitySent = quantitySent; }

    public int getQuantitySold() { return quantitySold; }
    public void setQuantitySold(int quantitySold) { this.quantitySold = quantitySold; }

    public int getQuantityReturned() { return quantityReturned; }
    public void setQuantityReturned(int quantityReturned) { this.quantityReturned = quantityReturned; }

    public int getQuantityLost() { return quantityLost; }
    public void setQuantityLost(int quantityLost) { this.quantityLost = quantityLost; }

    public BigDecimal getSalePrice() { return salePrice; }
    public void setSalePrice(BigDecimal salePrice) { this.salePrice = salePrice; }

    public BigDecimal getCommissionRate() { return commissionRate; }
    public void setCommissionRate(BigDecimal commissionRate) { this.commissionRate = commissionRate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
