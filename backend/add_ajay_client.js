import mysql from 'mysql2/promise';

async function addAjayClient() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    // Check if Ajay already exists
    const [existing] = await pool.execute('SELECT id FROM clients WHERE LOWER(name) = ?', ['ajay']);
    if (existing.length > 0) {
      console.log('Client "Ajay" already exists with ID:', existing[0].id);
      return;
    }

    // Add the client
    const [result] = await pool.execute(
      'INSERT INTO clients (name, email, phone, address, username, password) VALUES (?, ?, ?, ?, ?, ?)',
      ['Ajay', 'ajay@example.com', '1234567890', 'Address', 'ajay_user', 'password123']
    );

    console.log('Client "Ajay" added successfully with ID:', result.insertId);

  } catch (error) {
    console.error('Error adding client:', error);
  } finally {
    pool.end();
  }
}

addAjayClient();
