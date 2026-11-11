import mysql from 'mysql2/promise';

async function checkLokeshTasks() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== CHECKING LOKESH TASKS ===\n');

    // Get Lokesh's staff ID
    const [staff] = await pool.execute('SELECT id, name FROM staff WHERE name = ?', ['Lokesh']);
    if (staff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = staff[0].id;
    console.log(`Lokesh ID: ${lokeshId}`);

    // Get all tasks assigned to Lokesh
    const [tasks] = await pool.execute('SELECT id, title, assigned_to, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log(`\nLokesh's tasks (${tasks.length}):`);
    tasks.forEach(t => console.log(`  ID ${t.id}: "${t.title}" - Client: ${t.client_id}, Case: ${t.case_id}`));

    // Get unique client IDs from Lokesh's tasks
    const clientIds = [...new Set(tasks.map(t => t.client_id))];
    console.log(`\nUnique client IDs from Lokesh's tasks: ${clientIds.join(', ')}`);

    // Get client names for these IDs
    if (clientIds.length > 0) {
      const [clients] = await pool.execute(`SELECT id, name FROM clients WHERE id IN (${clientIds.join(',')})`);
      console.log('\nClients Lokesh should see:');
      clients.forEach(c => console.log(`  ID ${c.id}: ${c.name}`));
    }

    // Test the staff endpoint query
    console.log('\n=== TESTING STAFF ENDPOINT QUERY ===');
    const [endpointClients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY cl.name
    `, [lokeshId]);

    console.log('Clients returned by endpoint:');
    endpointClients.forEach(c => console.log(`  ID ${c.id}: ${c.name}`));

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLokeshTasks();
