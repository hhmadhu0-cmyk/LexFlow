import mysql from 'mysql2/promise';

async function checkDuplicateTasks() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== CHECKING FOR DUPLICATE TASKS FOR LOKESH ===\n');

    // Get Lokesh's staff ID
    const [staff] = await pool.execute('SELECT id, name FROM staff WHERE name = ?', ['Lokesh']);
    if (staff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = staff[0].id;
    console.log(`Lokesh ID: ${lokeshId}`);

    // Get all tasks for Lokesh with full details
    const [tasks] = await pool.execute(`
      SELECT t.id, t.title, t.description, t.assigned_to, t.client_id, t.case_id, t.status,
             c.name as client_name, cs.title as case_title
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN cases cs ON t.case_id = cs.id
      WHERE t.assigned_to = ?
      ORDER BY t.id
    `, [lokeshId]);

    console.log(`\nAll tasks for Lokesh (${tasks.length}):`);
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ID ${task.id}: "${task.title}"`);
      console.log(`   - Client ID: ${task.client_id}, Client Name: ${task.client_name || 'NULL'}`);
      console.log(`   - Case ID: ${task.case_id}, Case Title: ${task.case_title || 'NULL'}`);
      console.log(`   - Status: ${task.status}`);
      console.log('');
    });

    // Check for duplicate task titles
    const titleCounts = {};
    tasks.forEach(task => {
      titleCounts[task.title] = (titleCounts[task.title] || 0) + 1;
    });

    console.log('Task title counts:');
    Object.entries(titleCounts).forEach(([title, count]) => {
      console.log(`"${title}": ${count} times`);
    });

    // Test the endpoint query step by step
    console.log('\n=== TESTING ENDPOINT QUERY ===');

    // First part: direct client_id matches
    const [directMatches] = await pool.execute(`
      SELECT DISTINCT cl.id, cl.name, t.id as task_id, t.title as task_title
      FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = ?
    `, [lokeshId]);

    console.log(`\nDirect client matches (${directMatches.length}):`);
    directMatches.forEach((match, index) => {
      console.log(`${index + 1}. Client: ${match.name} (ID: ${match.id}) - Task: "${match.task_title}" (ID: ${match.task_id})`);
    });

    // Second part: through case relationships
    const [caseMatches] = await pool.execute(`
      SELECT DISTINCT cl.id, cl.name, t.id as task_id, t.title as task_title, c.id as case_id, c.title as case_title
      FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
    `, [lokeshId]);

    console.log(`\nCase-based client matches (${caseMatches.length}):`);
    caseMatches.forEach((match, index) => {
      console.log(`${index + 1}. Client: ${match.name} (ID: ${match.id}) - Case: "${match.case_title}" (ID: ${match.case_id}) - Task: "${match.task_title}" (ID: ${match.task_id})`);
    });

    // Full UNION
    const [unionResult] = await pool.execute(`
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

    console.log(`\nFinal UNION result (${unionResult.length} clients):`);
    unionResult.forEach((client, index) => {
      console.log(`${index + 1}. ${client.name} (ID: ${client.id})`);
    });

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDuplicateTasks();
