CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  code            VARCHAR(50),
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  category        VARCHAR(50) NOT NULL
                    CHECK (category IN ('anel','colar','brinco','pulseira','tornozeleira','conjunto','outro')),
  cost_price      NUMERIC(15,2),
  sale_price      NUMERIC(15,2) NOT NULL CHECK (sale_price >= 0),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 30.00 CHECK (commission_rate BETWEEN 0 AND 100),
  stock_total     INTEGER NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  stock_available INTEGER NOT NULL DEFAULT 0 CHECK (stock_available >= 0),
  active          BOOLEAN NOT NULL DEFAULT true,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_products_tenant   ON products(tenant_id);
CREATE INDEX idx_products_category ON products(tenant_id, category) WHERE deleted_at IS NULL;
