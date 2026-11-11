import mysql from 'mysql2/promise';

async function createCaseHistoryDocumentsTable() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Creating case_history_documents table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS case_history_documents (
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
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
        FOREIGN KEY (history_id) REFERENCES case_history(id) ON DELETE SET NULL
      );
    `;

    await pool.execute(createTableSQL);
    console.log('✅ case_history_documents table created successfully!');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await pool.end();
  }
}

createCaseHistoryDocumentsTable();
