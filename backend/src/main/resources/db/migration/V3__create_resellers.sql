CREATE TABLE resellers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  manager_id           UUID NOT NULL REFERENCES users(id),
  name                 VARCHAR(255) NOT NULL,
  cpf                  VARCHAR(255),
  birth_date           DATE,
  phone                VARCHAR(20) NOT NULL,
  phone2               VARCHAR(20),
  email                VARCHAR(255),
  address_street       VARCHAR(255),
  address_number       VARCHAR(20),
  address_complement   VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city         VARCHAR(100),
  address_state        CHAR(2),
  address_zip          VARCHAR(9),
  instagram            VARCHAR(100),
  facebook             VARCHAR(100),
  tiktok               VARCHAR(100),
  reference1_name      VARCHAR(255),
  reference1_phone     VARCHAR(20),
  reference2_name      VARCHAR(255),
  reference2_phone     VARCHAR(20),
  notes                TEXT,
  status               VARCHAR(20) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive','blocked')),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resellers_tenant  ON resellers(tenant_id);
CREATE INDEX idx_resellers_manager ON resellers(manager_id);
CREATE INDEX idx_resellers_status  ON resellers(tenant_id, status) WHERE deleted_at IS NULL;
