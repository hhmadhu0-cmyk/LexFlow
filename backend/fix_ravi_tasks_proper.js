import mysql from 'mysql2/promise';

async function fixRaviTasksProper() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Checking current task assignments...');

    // Get all tasks
    const [tasks] = await pool.execute('SELECT id, title, assigned_to, client_id FROM tasks');
    console.log('Current tasks:');
    tasks.forEach(t => console.log(`  ID ${t.id}: "${t.title}" - staff ${t.assigned_to}, client ${t.client_id}`));

    // Get staff info
    const [staff] = await pool.execute('SELECT id, name FROM staff');
    console.log('\nStaff:');
    staff.forEach(s => console.log(`  ID ${s.id}: ${s.name}`));

    // Get clients
    const [clients] = await pool.execute('SELECT id, name FROM clients');
    console.log('\nClients:');
    clients.forEach(c => console.log(`  ID ${c.id}: ${c.name}`));

    // Ravi is staff ID 3, should only have Shrusti's tasks (client ID 3)
    console.log('\nFixing Ravi (staff 3) to only have Shrusti (client 3) tasks...');

    // First, reassign all of Ravi's tasks to Lokesh (staff 1) except Shrusti's
    await pool.execute('UPDATE tasks SET assigned_to = 1 WHERE assigned_to = 3 AND client_id != 3');
    console.log('Reassigned non-Shrusti tasks from Ravi to Lokesh');

    // Make sure Shrusti's tasks are assigned to Ravi
    await pool.execute('UPDATE tasks SET assigned_to = 3 WHERE client_id = 3');
    console.log('Ensured Shrusti tasks are assigned to Ravi');

    // Check final assignments
    const [finalTasks] = await pool.execute('SELECT id, title, assigned_to, client_id FROM tasks');
    console.log('\nFinal task assignments:');
    finalTasks.forEach(t => console.log(`  ID ${t.id}: "${t.title}" - staff ${t.assigned_to}, client ${t.client_id}`));

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRaviTasksProper();
