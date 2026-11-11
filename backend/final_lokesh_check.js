import mysql from 'mysql2/promise';

async function finalLokeshCheck() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== FINAL LOKESH CLIENT CHECK ===\n');

    // Get Lokesh's staff ID
    const [staff] = await pool.execute('SELECT id, name FROM staff WHERE name = ?', ['Lokesh']);
    if (staff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = staff[0].id;
    console.log(`Lokesh ID: ${lokeshId}`);

    // Get all tasks for Lokesh
    const [tasks] = await pool.execute('SELECT id, title, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log(`\nLokesh's tasks (${tasks.length}):`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. "${task.title}" - Client ID: ${task.client_id}, Case ID: ${task.case_id}`);
    });

    // Test the exact endpoint query
    const [clients] = await pool.execute(`
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

    console.log(`\nClients returned by endpoint (${clients.length}):`);
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
    });

    // Check if there are any issues with the data
    if (clients.length !== 2) {
      console.log('\nISSUE DETECTED: Expected 2 clients but got', clients.length);

      // Check each task individually
      for (const task of tasks) {
        console.log(`\nChecking task "${task.title}":`);

        if (task.client_id) {
          const [clientCheck] = await pool.execute('SELECT id, name FROM clients WHERE id = ?', [task.client_id]);
          console.log(`  Direct client lookup: ${clientCheck.length > 0 ? clientCheck[0].name : 'NOT FOUND'}`);
        }

        if (task.case_id) {
          const [caseCheck] = await pool.execute('SELECT id, title, client FROM cases WHERE id = ?', [task.case_id]);
          if (caseCheck.length > 0) {
            const caseData = caseCheck[0];
            console.log(`  Case lookup: "${caseData.title}" - Client: "${caseData.client}"`);
            const [clientFromCase] = await pool.execute('SELECT id, name FROM clients WHERE name = ?', [caseData.client]);
            console.log(`  Client from case: ${clientFromCase.length > 0 ? clientFromCase[0].name : 'NOT FOUND'}`);
          }
        }
      }
    }

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

finalLokeshCheck();
