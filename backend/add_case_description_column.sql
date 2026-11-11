-- Add case_description column to invoices table if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS case_description TEXT;
