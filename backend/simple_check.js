import mysql from 'mysql2/promise';

async function simpleCheck() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== SIMPLE CHECK FOR LOKESH ===\n');

    // Get Lokesh's staff ID
    const [lokeshStaff] = await pool.execute('SELECT id, name FROM staff WHERE username = ?', ['Lokesh']);
    if (lokeshStaff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = lokeshStaff[0].id;
    console.log('Lokesh ID:', lokeshId);

    // Get all tasks assigned to Lokesh
    const [lokeshTasks] = await pool.execute('SELECT id, title, assigned_to, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log('\nLokesh tasks:', lokeshTasks.length);
    lokeshTasks.forEach(t => console.log(`  - "${t.title}" (client_id: ${t.client_id}, case_id: ${t.case_id})`));

    // Get clients that should be visible to Lokesh
    const [lokeshClients] = await pool.execute(`
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
    console.log('\nClients Lokesh should see:', lokeshClients.length);
    lokeshClients.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

simpleCheck();
