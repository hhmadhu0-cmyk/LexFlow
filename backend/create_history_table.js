import mysql from 'mysql2/promise';

async function createHistoryTable() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Creating case_history table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS case_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        case_id INT NOT NULL,
        change_type VARCHAR(100) NOT NULL,
        field_name VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(255),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      );
    `;

    await pool.execute(createTableSQL);
    console.log('✅ case_history table created successfully!');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await pool.end();
  }
}

createHistoryTable();
