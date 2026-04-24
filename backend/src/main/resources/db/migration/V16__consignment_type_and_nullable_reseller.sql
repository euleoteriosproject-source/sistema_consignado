-- Permite lotes de estoque para gestoras (sem revendedora)
ALTER TABLE consignments ALTER COLUMN reseller_id DROP NOT NULL;

ALTER TABLE consignments
  ADD COLUMN consignment_type VARCHAR(20) NOT NULL DEFAULT 'reseller'
    CHECK (consignment_type IN ('reseller', 'manager_stock'));

CREATE INDEX idx_consignments_type ON consignments(tenant_id, consignment_type);
