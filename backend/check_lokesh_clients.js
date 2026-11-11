import mysql from 'mysql2/promise';

async function checkLokeshClients() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Checking Lokesh clients...\n');

    // Get Lokesh's staff ID
    const [lokeshStaff] = await pool.execute('SELECT id, name FROM staff WHERE username = ?', ['Lokesh']);
    if (lokeshStaff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = lokeshStaff[0].id;
    console.log('Lokesh ID:', lokeshId);

    // Get all tasks assigned to Lokesh
    const [lokeshTasks] = await pool.execute('SELECT * FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log('Lokesh tasks:', lokeshTasks.length);
    lokeshTasks.forEach(t => console.log(`  - Task: "${t.title}", Client ID: ${t.client_id}, Case ID: ${t.case_id}`));

    // Get clients that should be visible to Lokesh (clients from cases with tasks assigned to Lokesh)
    const [lokeshClients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY cl.name
    `, [lokeshId]);
    console.log('\nClients Lokesh should see:', lokeshClients.length);
    lokeshClients.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    // Check if there are tasks without client_id but with case_id
    const [tasksWithoutClient] = await pool.execute('SELECT * FROM tasks WHERE assigned_to = ? AND client_id IS NULL', [lokeshId]);
    if (tasksWithoutClient.length > 0) {
      console.log('\nTasks without client_id:', tasksWithoutClient.length);
      tasksWithoutClient.forEach(t => console.log(`  - Task: "${t.title}", Case ID: ${t.case_id}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkLokeshClients();
