ALTER TABLE support_tickets
  ADD COLUMN admin_response TEXT,
  ADD COLUMN responded_at   TIMESTAMPTZ;
