-- Remove CHECK constraint fixo de categoria nos produtos
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

-- Tabela de categorias por tenant
CREATE TABLE product_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  name       VARCHAR(100) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_product_categories_tenant ON product_categories(tenant_id) WHERE active = true;

-- Categorias padrão para tenants existentes
INSERT INTO product_categories (tenant_id, name)
SELECT DISTINCT t.id, c.name
FROM tenants t
CROSS JOIN (
  VALUES ('Anel'),('Colar'),('Brinco'),('Pulseira'),('Tornozeleira'),('Conjunto'),('Outro')
) AS c(name);
