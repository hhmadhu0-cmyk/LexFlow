-- Clear all data from advocate_casebook database
USE advocate_casebook;

-- Disable foreign key checks to allow deletion
SET FOREIGN_KEY_CHECKS = 0;

-- Delete data from tables in correct order (considering foreign keys)
DELETE FROM tasks;
DELETE FROM staff;
DELETE FROM advocates;
DELETE FROM reports;
DELETE FROM invoices;
DELETE FROM messages;
DELETE FROM accounts;
DELETE FROM clients;
DELETE FROM cases;

-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Optional: Reset auto-increment counters
ALTER TABLE cases AUTO_INCREMENT = 1;
ALTER TABLE clients AUTO_INCREMENT = 1;
ALTER TABLE invoices AUTO_INCREMENT = 1;
ALTER TABLE accounts AUTO_INCREMENT = 1;
ALTER TABLE messages AUTO_INCREMENT = 1;
ALTER TABLE advocates AUTO_INCREMENT = 1;
ALTER TABLE staff AUTO_INCREMENT = 1;
ALTER TABLE tasks AUTO_INCREMENT = 1;
ALTER TABLE reports AUTO_INCREMENT = 1;

SELECT 'Database cleared successfully' AS status;
