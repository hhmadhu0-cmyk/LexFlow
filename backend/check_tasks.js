import mysql from 'mysql2/promise';

async function checkTasks() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: 'ABCD',
      database: 'advocate_casebook'
    });

    console.log('Checking and fixing database contents...\n');

    // Check staff
    const [staff] = await pool.execute('SELECT id, name, username FROM staff');
    console.log('Staff members:', staff.length);
    staff.forEach(s => console.log(`  - ${s.name} (${s.username}) - ID: ${s.id}`));

    // Check clients
    const [clients] = await pool.execute('SELECT id, name FROM clients');
    console.log('\nClients:', clients.length);
    clients.forEach(c => console.log(`  - ${c.name} - ID: ${c.id}`));

    // Check cases
    const [cases] = await pool.execute('SELECT id, title, client FROM cases');
    console.log('\nCases:', cases.length);
    cases.forEach(c => console.log(`  - "${c.title}" for client: ${c.client} - ID: ${c.id}`));

    // Check tasks
    const [tasks] = await pool.execute('SELECT id, title, assigned_to, client_id, case_id FROM tasks');
    console.log('\nTasks:', tasks.length);
    tasks.forEach(t => console.log(`  - "${t.title}" assigned to staff ID: ${t.assigned_to}, client ID: ${t.client_id}, case ID: ${t.case_id}`));

    // Fix tasks based on proper client-staff assignment
    // Shrusti (client ID: 3) should be assigned to Lokesh (staff ID: 1)
    // Ajay (client ID: 4) should be assigned to Ravi (staff ID: 3)
    console.log('\nFixing task assignments based on client-staff relationships...');

    // First, assign tasks based on case client relationships
    // Case ID: 1 is for client "Ajay" - should be assigned to Ravi (staff ID: 3)
    await pool.execute('UPDATE tasks SET assigned_to = ?, client_id = ? WHERE case_id = ?',
      [3, 4, 1]); // Ravi's staff ID is 3, Ajay's client ID is 4, case ID: 1
    console.log('Assigned tasks for case "Rash and Negligent driving Case" (Ajay) to staff Ravi');

    // Case ID: 3 is for client "Shrusti" - should be assigned to Lokesh (staff ID: 1)
    await pool.execute('UPDATE tasks SET assigned_to = ?, client_id = ? WHERE case_id = ?',
      [1, 3, 3]); // Lokesh's staff ID is 1, Shrusti's client ID is 3, case ID: 3
    console.log('Assigned tasks for case "Robbery" (Shrusti) to staff Lokesh');

    // Also fix any remaining tasks with null client_id/case_id
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      if (task.client_id === null || task.case_id === null) {
        // For remaining tasks, assign based on staff
        if (task.assigned_to === 1) { // Lokesh
          await pool.execute('UPDATE tasks SET client_id = ?, case_id = ? WHERE id = ?',
            [3, 3, task.id]); // Shrusti and her case
          console.log(`Fixed remaining task "${task.title}": assigned to Shrusti`);
        } else if (task.assigned_to === 3) { // Ravi
          await pool.execute('UPDATE tasks SET client_id = ?, case_id = ? WHERE id = ?',
            [4, 1, task.id]); // Ajay and his case
          console.log(`Fixed remaining task "${task.title}": assigned to Ajay`);
        }
      }
    }

    // Re-check tasks after fixing
    const [fixedTasks] = await pool.execute('SELECT id, title, assigned_to, client_id, case_id FROM tasks');
    console.log('\nTasks after fixing:', fixedTasks.length);
    fixedTasks.forEach(t => console.log(`  - "${t.title}" assigned to staff ID: ${t.assigned_to}, client ID: ${t.client_id}, case ID: ${t.case_id}`));

    pool.end();
  } catch (e) {
    console.error('DB Error:', e.message);
  }
}

checkTasks();
