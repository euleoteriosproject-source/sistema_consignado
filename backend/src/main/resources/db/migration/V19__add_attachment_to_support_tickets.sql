ALTER TABLE support_tickets
  ADD COLUMN attachment_url  TEXT,
  ADD COLUMN attachment_name VARCHAR(255);
