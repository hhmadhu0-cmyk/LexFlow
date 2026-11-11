import mysql from 'mysql2/promise';

async function detailedLokeshCheck() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== DETAILED LOKESH CLIENT CHECK ===\n');

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

    // Check each task individually
    for (const task of tasks) {
      console.log(`\n--- Checking Task ID ${task.id} ---`);

      if (task.client_id) {
        // Direct client_id match
        const [clients] = await pool.execute('SELECT id, name FROM clients WHERE id = ?', [task.client_id]);
        console.log(`Direct client match for client_id ${task.client_id}: ${clients.length > 0 ? clients[0].name : 'NOT FOUND'}`);
      }

      if (task.case_id) {
        // Through case relationship
        const [cases] = await pool.execute('SELECT id, title, client FROM cases WHERE id = ?', [task.case_id]);
        if (cases.length > 0) {
          const caseData = cases[0];
          console.log(`Case ID ${task.case_id}: "${caseData.title}" - Client name: "${caseData.client}"`);

          // Find client by name
          const [clients] = await pool.execute('SELECT id, name FROM clients WHERE name = ?', [caseData.client]);
          console.log(`Client lookup by name "${caseData.client}": ${clients.length > 0 ? `ID ${clients[0].id}` : 'NOT FOUND'}`);
        } else {
          console.log(`Case ID ${task.case_id}: NOT FOUND`);
        }
      }
    }

    // Test the first part of the UNION query (direct client_id)
    console.log('\n=== TESTING FIRST PART OF UNION (direct client_id) ===');
    const [directClients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = ?
    `, [lokeshId]);

    console.log(`Direct client matches: ${directClients.length}`);
    directClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
    });

    // Test the second part of the UNION query (through cases)
    console.log('\n=== TESTING SECOND PART OF UNION (through cases) ===');
    const [caseClients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
    `, [lokeshId]);

    console.log(`Case-based client matches: ${caseClients.length}`);
    caseClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
    });

    // Test the full UNION query
    console.log('\n=== TESTING FULL UNION QUERY ===');
    const [unionClients] = await pool.execute(`
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

    console.log(`Full UNION result: ${unionClients.length} clients`);
    unionClients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
    });

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

detailedLokeshCheck();
