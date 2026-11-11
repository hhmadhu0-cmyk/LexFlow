import mysql from 'mysql2/promise';

async function fixLokeshClients() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== FIXING LOKESH CLIENT ASSIGNMENTS ===');

    // Check current clients
    const [clients] = await pool.execute('SELECT id, name FROM clients ORDER BY id');
    console.log('Current clients:');
    clients.forEach(c => console.log(`  ${c.id}: ${c.name}`));

    // Check if Smarath and Ajaya exist
    const [smarathCheck] = await pool.execute('SELECT id FROM clients WHERE LOWER(name) = ?', ['smarath']);
    const [ajayaCheck] = await pool.execute('SELECT id FROM clients WHERE LOWER(name) = ?', ['ajaya']);

    let smarathId, ajayaId;

    if (smarathCheck.length === 0) {
      // Create Smarath client
      console.log('\nCreating Smarath client...');
      const [result] = await pool.execute(
        'INSERT INTO clients (name, email, phone, address, username, password) VALUES (?, ?, ?, ?, ?, ?)',
        ['Smarath', 'smarath@example.com', '0000000000', 'Address', 'smarath_user', 'password123']
      );
      smarathId = result.insertId;
      console.log(`Smarath client created with ID: ${smarathId}`);
    } else {
      smarathId = smarathCheck[0].id;
      console.log(`Smarath client already exists with ID: ${smarathId}`);
    }

    if (ajayaCheck.length === 0) {
      // Create Ajaya client
      console.log('\nCreating Ajaya client...');
      const [result] = await pool.execute(
        'INSERT INTO clients (name, email, phone, address, username, password) VALUES (?, ?, ?, ?, ?, ?)',
        ['Ajaya', 'ajaya@example.com', '0000000000', 'Address', 'ajaya_user', 'password123']
      );
      ajayaId = result.insertId;
      console.log(`Ajaya client created with ID: ${ajayaId}`);
    } else {
      ajayaId = ajayaCheck[0].id;
      console.log(`Ajaya client already exists with ID: ${ajayaId}`);
    }

    // Get Lokesh's current tasks
    const [lokeshTasks] = await pool.execute('SELECT id, title, client_id FROM tasks WHERE assigned_to = 1');
    console.log('\nLokesh current tasks:');
    lokeshTasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" -> Client ID: ${t.client_id}`));

    // Update task assignments
    if (lokeshTasks.length >= 1) {
      console.log(`\nUpdating first task to Smarath (ID: ${smarathId})`);
      await pool.execute('UPDATE tasks SET client_id = ? WHERE id = ?', [smarathId, lokeshTasks[0].id]);
    }

    if (lokeshTasks.length >= 2) {
      console.log(`\nUpdating second task to Ajaya (ID: ${ajayaId})`);
      await pool.execute('UPDATE tasks SET client_id = ? WHERE id = ?', [ajayaId, lokeshTasks[1].id]);
    }

    // Verify the changes
    console.log('\n=== VERIFICATION ===');
    const [updatedTasks] = await pool.execute(`
      SELECT t.id, t.title, t.client_id, c.name as client_name
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.assigned_to = 1
    `);
    console.log('Updated Lokesh tasks:');
    updatedTasks.forEach(t => console.log(`  Task ${t.id}: "${t.title}" -> ${t.client_name} (ID: ${t.client_id})`));

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

fixLokeshClients();
