import mysql from 'mysql2/promise';

async function fixLokeshTask() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== FIXING LOKESH TASK ASSIGNMENT ===\n');

    // Get Lokesh's staff ID
    const [lokeshStaff] = await pool.execute('SELECT id FROM staff WHERE username = ?', ['Lokesh']);
    if (lokeshStaff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = lokeshStaff[0].id;
    console.log('Lokesh ID:', lokeshId);

    // Get Lokesh's task
    const [lokeshTasks] = await pool.execute('SELECT id, title, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log('\nLokesh tasks:');
    lokeshTasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" - Client ID: ${t.client_id}, Case ID: ${t.case_id}`));

    if (lokeshTasks.length === 0) {
      console.log('No tasks found for Lokesh');
      return;
    }

    // Find the case "Rash and Negligent driving Case"
    const [rashCase] = await pool.execute('SELECT id, title, client FROM cases WHERE title = ?', ['Rash and Negligent driving Case']);
    if (rashCase.length === 0) {
      console.log('Case "Rash and Negligent driving Case" not found');
      return;
    }
    console.log(`\nFound case: "${rashCase[0].title}" (ID: ${rashCase[0].id}) with client: "${rashCase[0].client}"`);

    // Find the client "Smarath"
    const [smarathClient] = await pool.execute('SELECT id, name FROM clients WHERE name = ?', ['Smarath']);
    if (smarathClient.length === 0) {
      console.log('Client "Smarath" not found');
      return;
    }
    console.log(`Found client: "${smarathClient[0].name}" (ID: ${smarathClient[0].id})`);

    // Update the task to link to the case and client
    const taskId = lokeshTasks[0].id;
    console.log(`\nUpdating task ${taskId} to link to case ${rashCase[0].id} and client ${smarathClient[0].id}`);
    await pool.execute('UPDATE tasks SET case_id = ?, client_id = ? WHERE id = ?', [rashCase[0].id, smarathClient[0].id, taskId]);
    console.log('Task updated successfully');

    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    const [updatedTasks] = await pool.execute('SELECT id, title, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log('Updated Lokesh tasks:');
    updatedTasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" - Client ID: ${t.client_id}, Case ID: ${t.case_id}`));

    // Test the staff client endpoint
    const [staffClients] = await pool.execute(`
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

    console.log(`\nClients Lokesh should now see (${staffClients.length}):`);
    staffClients.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    if (staffClients.length > 0) {
      console.log('\n✅ SUCCESS: Lokesh can now see clients!');
    } else {
      console.log('\n❌ ISSUE PERSISTS: Lokesh still sees no clients');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

fixLokeshTask();
