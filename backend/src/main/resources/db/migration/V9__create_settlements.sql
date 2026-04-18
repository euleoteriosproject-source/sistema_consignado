CREATE TABLE settlements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  reseller_id      UUID NOT NULL REFERENCES resellers(id),
  manager_id       UUID NOT NULL REFERENCES users(id),
  consignment_id   UUID REFERENCES consignments(id),
  settlement_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sold_value NUMERIC(15,2) NOT NULL CHECK (total_sold_value >= 0),
  total_commission NUMERIC(15,2) NOT NULL CHECK (total_commission >= 0),
  net_to_receive   NUMERIC(15,2) NOT NULL,
  payment_method   VARCHAR(20) NOT NULL
                     CHECK (payment_method IN ('cash','pix','transfer','other')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_settlements_tenant   ON settlements(tenant_id);
CREATE INDEX idx_settlements_reseller ON settlements(reseller_id);
CREATE INDEX idx_settlements_date     ON settlements(tenant_id, settlement_date DESC);
