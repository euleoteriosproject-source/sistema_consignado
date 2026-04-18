CREATE TABLE tenants (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   VARCHAR(255) NOT NULL,
  slug                   VARCHAR(100) NOT NULL UNIQUE,
  logo_url               VARCHAR(500),
  primary_color          VARCHAR(7) DEFAULT '#B8860B',
  plan                   VARCHAR(20) NOT NULL DEFAULT 'basic'
                           CHECK (plan IN ('basic','pro','premium')),
  stripe_customer_id     VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  active                 BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at          TIMESTAMPTZ,
  settings               JSONB NOT NULL DEFAULT '{"default_commission_rate":30,"default_return_days":30,"block_new_lot_if_overdue":true}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
