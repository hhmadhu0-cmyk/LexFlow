import mysql from 'mysql2/promise';

async function createCaseHistorySummariesTable() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'ABCD',
      database: 'advocate_casebook'
    });

    console.log('Connected to MySQL database');

    // Create case_history_summaries table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS case_history_summaries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        case_id INT NOT NULL,
        summary_text TEXT NOT NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        document_count INT DEFAULT 0,
        FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
      )
    `;

    await connection.execute(createTableQuery);
    console.log('case_history_summaries table created successfully');

  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the function
createCaseHistorySummariesTable();
