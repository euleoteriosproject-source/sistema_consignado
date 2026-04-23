CREATE TABLE support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  subject     VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority    VARCHAR(20) NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
  status      VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_support_tickets_tenant ON support_tickets(tenant_id, created_at DESC);
