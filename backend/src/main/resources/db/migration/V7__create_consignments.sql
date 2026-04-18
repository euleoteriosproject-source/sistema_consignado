CREATE TABLE consignments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  reseller_id        UUID NOT NULL REFERENCES resellers(id),
  manager_id         UUID NOT NULL REFERENCES users(id),
  delivered_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_at DATE,
  status             VARCHAR(30) NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','partially_settled','settled','overdue')),
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_consignments_tenant   ON consignments(tenant_id);
CREATE INDEX idx_consignments_reseller ON consignments(reseller_id);
CREATE INDEX idx_consignments_status   ON consignments(tenant_id, status);
CREATE INDEX idx_consignments_overdue  ON consignments(tenant_id, expected_return_at)
  WHERE status IN ('open','partially_settled');
