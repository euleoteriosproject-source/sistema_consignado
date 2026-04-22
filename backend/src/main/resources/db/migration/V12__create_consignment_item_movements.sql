CREATE TABLE consignment_item_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  consignment_id UUID NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  item_id        UUID NOT NULL REFERENCES consignment_items(id) ON DELETE CASCADE,
  movement_type  VARCHAR(20) NOT NULL CHECK (movement_type IN ('sold','returned','lost','settle')),
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_movements_item       ON consignment_item_movements(item_id);
CREATE INDEX idx_item_movements_consignment ON consignment_item_movements(consignment_id);
