CREATE TABLE consignment_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  consignment_id    UUID NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES products(id),
  quantity_sent     INTEGER NOT NULL CHECK (quantity_sent > 0),
  quantity_sold     INTEGER NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0),
  quantity_lost     INTEGER NOT NULL DEFAULT 0 CHECK (quantity_lost >= 0),
  sale_price        NUMERIC(15,2) NOT NULL,
  commission_rate   NUMERIC(5,2) NOT NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','partially_settled','settled')),
  CONSTRAINT qty_integrity CHECK (quantity_sold + quantity_returned + quantity_lost <= quantity_sent)
);
CREATE INDEX idx_consignment_items_consignment ON consignment_items(consignment_id);
CREATE INDEX idx_consignment_items_product     ON consignment_items(product_id);
