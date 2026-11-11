-- Update invoices table to add missing columns
USE advocate_casebook;

-- Add amount_paid column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00;

-- Add remaining_amount column if it doesn't exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2) DEFAULT 0.00;

-- Update existing records to calculate remaining_amount
UPDATE invoices SET remaining_amount = amount_to_pay - amount_paid WHERE remaining_amount = 0.00 OR remaining_amount IS NULL;
