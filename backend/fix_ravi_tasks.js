const mysql = require('mysql2/promise');

async function fixRaviTasks() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Fixing Ravi task assignments...');

    // Reassign Ajay's tasks from Ravi to Lokesh
    await pool.execute('UPDATE tasks SET assigned_to = 1 WHERE assigned_to = 3 AND client_id = 4');
    console.log('Reassigned Ajay tasks from Ravi to Lokesh');

    // Make sure Ravi only has Shrusti's tasks
    await pool.execute('UPDATE tasks SET assigned_to = 3 WHERE client_id = 3');
    console.log('Assigned Shrusti tasks to Ravi');

    const [tasks] = await pool.execute('SELECT title, assigned_to, client_id FROM tasks');
    console.log('Final task assignments:');
    tasks.forEach(t => console.log(`  - "${t.title}": staff ${t.assigned_to}, client ${t.client_id}`));

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRaviTasks();
