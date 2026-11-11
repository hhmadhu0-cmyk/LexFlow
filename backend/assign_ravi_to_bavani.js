import mysql from 'mysql2/promise';

async function assignRaviToBavani() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== ASSIGNING RAVI TO BAVANI ===');

    // Get Bavani's advocate ID
    const [bavaniRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', ['Bavani']);
    if (bavaniRows.length === 0) {
      console.log('Bavani advocate not found');
      return;
    }
    const bavaniId = bavaniRows[0].id;
    console.log(`Bavani advocate ID: ${bavaniId}`);

    // Update Ravi's advocate_id
    const [result] = await pool.execute('UPDATE clients SET advocate_id = ? WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [bavaniId, 'Ravi']);
    console.log(`Updated ${result.affectedRows} client(s) named Ravi`);

    // Verify the assignment
    const [raviClients] = await pool.execute('SELECT c.*, a.name as advocate_name, a.username as advocate_username FROM clients c LEFT JOIN advocates a ON c.advocate_id = a.id WHERE LOWER(TRIM(c.name)) = LOWER(TRIM("Ravi"))');
    if (raviClients.length > 0) {
      raviClients.forEach(c => {
        console.log(`Ravi now assigned to: ${c.advocate_name} (${c.advocate_username})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

assignRaviToBavani();
