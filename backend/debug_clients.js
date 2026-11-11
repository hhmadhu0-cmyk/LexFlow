import mysql from 'mysql2/promise';

async function debugClients() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== DEBUGGING CLIENT FILTERING ===\n');

    // Get all clients
    const [clients] = await pool.execute('SELECT id, name FROM clients');
    console.log('All clients:');
    clients.forEach(c => console.log(`  ID ${c.id}: ${c.name}`));

    // Get all cases
    const [cases] = await pool.execute('SELECT id, title, client FROM cases');
    console.log('\nAll cases:');
    cases.forEach(c => console.log(`  ID ${c.id}: "${c.title}" - Client: "${c.client}"`));

    // Get all tasks
    const [tasks] = await pool.execute('SELECT id, title, assigned_to, client_id, case_id FROM tasks');
    console.log('\nAll tasks:');
    tasks.forEach(t => console.log(`  ID ${t.id}: "${t.title}" - Staff: ${t.assigned_to}, Client: ${t.client_id}, Case: ${t.case_id}`));

    // Test the query for Ravi (staff ID 3)
    console.log('\n=== TESTING QUERY FOR RAVI (staff ID 3) ===');
    const [raviClients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY cl.name
    `, [3]);

    console.log('Clients Ravi should see:');
    raviClients.forEach(c => console.log(`  ID ${c.id}: ${c.name}`));

    // Check what tasks Ravi has
    const [raviTasks] = await pool.execute('SELECT * FROM tasks WHERE assigned_to = ?', [3]);
    console.log('\nRavi\'s tasks:');
    raviTasks.forEach(t => console.log(`  ID ${t.id}: "${t.title}" - Client: ${t.client_id}, Case: ${t.case_id}`));

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugClients();
