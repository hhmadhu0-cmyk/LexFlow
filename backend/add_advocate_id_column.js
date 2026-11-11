import mysql from 'mysql2/promise';

async function addAdvocateIdColumn() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    // Check if advocate_id column exists
    const [columns] = await pool.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'clients' AND COLUMN_NAME = 'advocate_id'"
    );

    if (columns.length === 0) {
      // Add the advocate_id column
      await pool.execute(
        "ALTER TABLE clients ADD COLUMN advocate_id INT, ADD FOREIGN KEY (advocate_id) REFERENCES advocates(id) ON DELETE SET NULL"
      );
      console.log('advocate_id column added to clients table');
    } else {
      console.log('advocate_id column already exists');
    }

  } catch (error) {
    console.error('Error adding advocate_id column:', error);
  } finally {
    pool.end();
  }
}

addAdvocateIdColumn();
