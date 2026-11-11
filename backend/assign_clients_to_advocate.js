import mysql from 'mysql2/promise';

async function assignClientsToAdvocate() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== ASSIGNING ALL CLIENTS TO ADVOCATE BAVANI ===');

    // Get advocate ID for Bavani
    const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', ['Bavani']);
    if (advocateRows.length === 0) {
      console.log('Advocate Bavani not found!');
      return;
    }
    const advocateId = advocateRows[0].id;
    console.log('Advocate Bavani ID:', advocateId);

    // Assign all clients to Bavani
    const [result] = await pool.execute('UPDATE clients SET advocate_id = ?', [advocateId]);
    console.log(`Assigned ${result.affectedRows} clients to advocate Bavani`);

    // Verify the assignments
    const [clients] = await pool.execute(`
      SELECT c.name, c.id, a.name as advocate_name, a.username as advocate_username
      FROM clients c
      LEFT JOIN advocates a ON c.advocate_id = a.id
      ORDER BY c.id
    `);

    console.log('Current client assignments:');
    clients.forEach(client => {
      console.log(`- ${client.name} (ID: ${client.id}) -> Advocate: ${client.advocate_name} (${client.advocate_username})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

assignClientsToAdvocate();
