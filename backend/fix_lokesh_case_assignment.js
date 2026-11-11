import mysql from 'mysql2/promise';

async function fixLokeshCaseAssignment() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== FIXING LOKESH CASE ASSIGNMENT ===');

    // Get Lokesh's tasks
    const [tasks] = await pool.execute(`
      SELECT t.id, t.title, t.client_id, t.case_id, c.name as client_name, cs.title as case_title, cs.client as case_client
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN cases cs ON t.case_id = cs.id
      WHERE t.assigned_to = 1
    `);

    console.log('Lokesh tasks:');
    tasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" -> Client: ${t.client_name} (ID: ${t.client_id}), Case: ${t.case_title} (ID: ${t.case_id}), Case Client: ${t.case_client}`));

    // For task 1, update the case client to match the task client (Smarath)
    if (tasks[0] && tasks[0].case_id) {
      console.log(`\nUpdating case ${tasks[0].case_id} client from "${tasks[0].case_client}" to "${tasks[0].client_name}"`);
      await pool.execute('UPDATE cases SET client = ? WHERE id = ?', [tasks[0].client_name, tasks[0].case_id]);
    }

    // For task 6, since it has no case_id, that's fine

    // Verify the changes
    console.log('\n=== VERIFICATION ===');
    const [updatedTasks] = await pool.execute(`
      SELECT t.id, t.title, t.client_id, t.case_id, c.name as client_name, cs.title as case_title, cs.client as case_client
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN cases cs ON t.case_id = cs.id
      WHERE t.assigned_to = 1
    `);

    console.log('Updated Lokesh tasks:');
    updatedTasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" -> Client: ${t.client_name} (ID: ${t.client_id}), Case: ${t.case_title} (ID: ${t.case_id}), Case Client: ${t.case_client}`));

    // Test the staff client endpoint
    const [staffClients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = 1
      UNION
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = 1
      ORDER BY name
    `, [1, 1]);

    console.log('\nClients Lokesh should now see:');
    staffClients.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

fixLokeshCaseAssignment();
