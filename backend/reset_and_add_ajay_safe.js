import mysql from 'mysql2/promise';

async function resetAndAddAjaySafe() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    // Delete all invoices first (due to foreign key constraint)
    await pool.execute('DELETE FROM invoices');
    console.log('All invoices deleted');

    // Delete all tasks (due to foreign key constraint)
    await pool.execute('DELETE FROM tasks');
    console.log('All tasks deleted');

    // Delete all cases (due to foreign key constraint)
    await pool.execute('DELETE FROM cases');
    console.log('All cases deleted');

    // Now delete all clients
    await pool.execute('DELETE FROM clients');
    console.log('All clients deleted');

    // Reset auto-increment for clients table
    await pool.execute('ALTER TABLE clients AUTO_INCREMENT = 1');
    console.log('Auto-increment reset to 1');

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

resetAndAddAjaySafe();
