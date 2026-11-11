import mysql from 'mysql2/promise';

async function resetAndAddAjay() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    // Truncate the clients table to reset auto-increment to 1
    await pool.execute('TRUNCATE TABLE clients');
    console.log('Clients table truncated, auto-increment reset to 1');

    // Add the Ajay client
    const [result] = await pool.execute(
      'INSERT INTO clients (name, email, phone, address, username, password) VALUES (?, ?, ?, ?, ?, ?)',
      ['Ajay', 'ajay@example.com', '1234567890', 'Address', 'ajay_user', 'password123']
    );

    console.log('Client "Ajay" added successfully with ID:', result.insertId);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

resetAndAddAjay();
