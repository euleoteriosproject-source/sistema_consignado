-- Signed URLs com JWT excedem VARCHAR(500); usa TEXT sem limite
ALTER TABLE tenants ALTER COLUMN logo_url TYPE TEXT;
