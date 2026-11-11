-- Add original_suit column to cases table if it doesn't exist
ALTER TABLE cases ADD COLUMN IF NOT EXISTS original_suit VARCHAR(255);
