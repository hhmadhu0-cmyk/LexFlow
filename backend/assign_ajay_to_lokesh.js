import mysql from 'mysql2/promise';

async function assignAjayToLokesh() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== ASSIGNING AJAY TO LOKESH ===');

    // Get Lokesh's staff ID
    const [lokeshStaff] = await pool.execute('SELECT id, name FROM staff WHERE username = ?', ['Lokesh']);
    if (lokeshStaff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = lokeshStaff[0].id;
    console.log('Lokesh ID:', lokeshId);

    // Get Ajay's client ID
    const [ajayClient] = await pool.execute('SELECT id, name FROM clients WHERE name = ?', ['Ajay']);
    if (ajayClient.length === 0) {
      console.log('Ajay not found in clients table');
      return;
    }
    const ajayId = ajayClient[0].id;
    console.log('Ajay ID:', ajayId);

    // Check if Ajay already has a case
    const [ajayCases] = await pool.execute('SELECT id, title FROM cases WHERE client = ?', ['Ajay']);
    let caseId = null;

    if (ajayCases.length === 0) {
      // Create a case for Ajay
      console.log('Creating a case for Ajay...');
      const [caseResult] = await pool.execute(
        'INSERT INTO cases (title, case_type, status, client) VALUES (?, ?, ?, ?)',
        ['Legal Consultation', 'Civil', 'Open', 'Ajay']
      );
      caseId = caseResult.insertId;
      console.log('Created case ID:', caseId);
    } else {
      caseId = ajayCases[0].id;
      console.log('Using existing case ID:', caseId);
    }

    // Create a task for Lokesh to handle Ajay's case
    console.log('Creating task for Lokesh to handle Ajay\'s case...');
    const [taskResult] = await pool.execute(
      'INSERT INTO tasks (title, description, assigned_to, assigned_by, client_id, case_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['Handle Ajay\'s Legal Consultation', 'Provide legal consultation and case management for client Ajay', lokeshId, 1, ajayId, caseId]
    );
    console.log('Created task ID:', taskResult.insertId);

    // Verify the assignment
    console.log('\n=== VERIFICATION ===');
    const [lokeshTasks] = await pool.execute(`
      SELECT t.id, t.title, c.name as client_name, cs.title as case_title
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN cases cs ON t.case_id = cs.id
      WHERE t.assigned_to = ?
    `, [lokeshId]);

    console.log('Lokesh tasks after assignment:');
    lokeshTasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" -> Client: ${t.client_name}, Case: ${t.case_title}`));

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

    console.log('\nClients Lokesh should now see:');
    staffClients.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

assignAjayToLokesh();
