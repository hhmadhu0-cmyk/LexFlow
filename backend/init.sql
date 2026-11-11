CREATE DATABASE IF NOT EXISTS advocate_casebook;
USE advocate_casebook;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS case_history_documents;
DROP TABLE IF EXISTS case_files;
DROP TABLE IF EXISTS case_history;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS advocates;

SET FOREIGN_KEY_CHECKS = 1;


CREATE TABLE advocates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'advocate',
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT
);


CREATE TABLE cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    case_type VARCHAR(100),
    fir_number VARCHAR(50),
    court_name VARCHAR(255),
    accused_name VARCHAR(255),
    ipc_sections TEXT,
    original_suit VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    client VARCHAR(255) NOT NULL,
    nextHearing VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    username VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    advocate_id INT,
    FOREIGN KEY (advocate_id) REFERENCES advocates(id)
    ON DELETE SET NULL
);


CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client VARCHAR(255) NOT NULL,
    client_id INT,
    case_id INT,
    case_description TEXT,
    case_status VARCHAR(50),
    staff_handling VARCHAR(255),
    amount_to_pay DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    dueDate DATE,
    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE SET NULL,
    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE SET NULL
);


CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    balance DECIMAL(15,2) NOT NULL,
    lastUpdated DATE
);


CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    sender_username VARCHAR(255) NOT NULL,
    sender_role ENUM('advocate','staff','client') NOT NULL,
    recipient_username VARCHAR(255) NOT NULL,
    recipient_role ENUM('advocate','staff','client') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE CASCADE
);


CREATE TABLE staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    advocate_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'staff',
    profile TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (advocate_id) REFERENCES advocates(id)
    ON DELETE CASCADE
);


CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    assigned_to INT NOT NULL,
    assigned_by INT NOT NULL,
    client_id INT,
    case_id INT,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (assigned_to) REFERENCES staff(id)
    ON DELETE CASCADE,

    FOREIGN KEY (assigned_by) REFERENCES advocates(id)
    ON DELETE CASCADE,

    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE SET NULL,

    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE SET NULL
);


CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    client_id INT NOT NULL,
    content TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (client_id) REFERENCES clients(id)
    ON DELETE CASCADE
);
CREATE TABLE case_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    change_type VARCHAR(100) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE CASCADE
);


CREATE TABLE case_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE CASCADE
);


CREATE TABLE case_history_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    history_id INT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) DEFAULT 'general',
    summary TEXT,
    notes TEXT,
    uploaded_by VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE CASCADE,

    FOREIGN KEY (history_id) REFERENCES case_history(id)
    ON DELETE SET NULL
);


SET FOREIGN_KEY_CHECKS = 1;