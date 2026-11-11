import mysql from 'mysql2/promise';

async function testLokeshClientsEndpoint() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== TESTING LOKESH CLIENTS ENDPOINT ===\n');

    // Get Lokesh's staff ID
    const [staff] = await pool.execute('SELECT id, name FROM staff WHERE name = ?', ['Lokesh']);
    if (staff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = staff[0].id;
    console.log(`Lokesh ID: ${lokeshId}`);

    // Test the exact query used in the endpoint
    const [rows] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = ?
      UNION
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY name
    `, [lokeshId, lokeshId]);

    console.log(`\nClients returned by endpoint query: ${rows.length}`);
    rows.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
    });

    // Also check what tasks Lokesh has
    const [tasks] = await pool.execute('SELECT id, title, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log(`\nLokesh's tasks: ${tasks.length}`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. "${task.title}" - Client ID: ${task.client_id}, Case ID: ${task.case_id}`);
    });

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLokeshClientsEndpoint();
