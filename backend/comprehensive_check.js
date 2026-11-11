import mysql from 'mysql2/promise';

async function comprehensiveCheck() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== LOKESH COMPREHENSIVE CHECK ===');

    // Get Lokesh's staff details
    const [staff] = await pool.execute('SELECT * FROM staff WHERE username = ?', ['Lokesh']);
    console.log('Lokesh staff record:', staff[0]);

    // Get all tasks assigned to Lokesh
    const [tasks] = await pool.execute('SELECT t.*, c.name as client_name, cs.title as case_title FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN cases cs ON t.case_id = cs.id WHERE t.assigned_to = 1');
    console.log('\nAll tasks for Lokesh:', tasks.length);
    tasks.forEach((t, i) => console.log(`  ${i+1}. Task: "${t.title}", Client: ${t.client_name || 'null'} (ID: ${t.client_id}), Case: ${t.case_title || 'null'} (ID: ${t.case_id})`));

    // Check if Samarth is a client
    const [samarth] = await pool.execute('SELECT * FROM clients WHERE name LIKE ?', ['%Samarth%']);
    console.log('\nSamarth client search:', samarth.length > 0 ? samarth[0] : 'Not found');

    // Get all clients that should be visible to Lokesh
    const [clients] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      WHERE cl.id IN (
        SELECT DISTINCT t.client_id FROM tasks t WHERE t.assigned_to = 1 AND t.client_id IS NOT NULL
        UNION
        SELECT DISTINCT c.client_id FROM cases c
        INNER JOIN tasks t ON c.id = t.case_id
        WHERE t.assigned_to = 1 AND c.client_id IS NOT NULL
      )
      ORDER BY cl.name
    `);
    console.log('\nClients that should be visible to Lokesh:', clients.length);
    clients.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

comprehensiveCheck();
