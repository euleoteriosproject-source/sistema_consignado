CREATE TABLE reseller_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  reseller_id  UUID NOT NULL REFERENCES resellers(id) ON DELETE CASCADE,
  type         VARCHAR(30) NOT NULL
                 CHECK (type IN ('rg_front','rg_back','cnh_front','cnh_back','proof_of_address','selfie','other')),
  storage_path VARCHAR(500) NOT NULL,
  file_name    VARCHAR(255),
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reseller_docs_reseller ON reseller_documents(reseller_id);
