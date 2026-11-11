import mysql from 'mysql2/promise';

async function checkDB() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: 'ABCD',
      database: 'advocate_casebook'
    });

    const [rows] = await pool.execute('SHOW TABLES');
    console.log('Tables found:', rows.map(r => Object.values(r)[0]));

    // Check if case_history_documents table exists
    const [tableCheck] = await pool.execute("SHOW TABLES LIKE 'case_history_documents'");
    if (tableCheck.length === 0) {
      console.log('case_history_documents table does not exist. Creating it...');

      await pool.execute(`
        CREATE TABLE case_history_documents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          case_id INT NOT NULL,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size BIGINT NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          uploaded_by VARCHAR(100) DEFAULT 'System',
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        )
      `);
      console.log('case_history_documents table created successfully.');
    } else {
      console.log('case_history_documents table exists.');
    }

    pool.end();
  } catch (e) {
    console.error('DB Error:', e.message);
  }
}

checkDB();
