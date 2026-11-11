import mysql from 'mysql2/promise';

async function fixTasks() {
  try {
    const pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: 'ABCD',
      database: 'advocate_casebook'
    });

    console.log('Fixing task assignments...\n');

    // Get all tasks, clients, and cases
    const [tasks] = await pool.execute('SELECT id, title, assigned_to FROM tasks');
    const [clients] = await pool.execute('SELECT id, name FROM clients');
    const [cases] = await pool.execute('SELECT id, title, client FROM cases');

    console.log(`Found ${tasks.length} tasks, ${clients.length} clients, ${cases.length} cases`);

    if (tasks.length > 0 && clients.length > 0 && cases.length > 0) {
      // Link tasks to clients and cases
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const client = clients[i % clients.length]; // Cycle through clients
        const caseItem = cases[i % cases.length]; // Cycle through cases

        await pool.execute('UPDATE tasks SET client_id = ?, case_id = ? WHERE id = ?',
          [client.id, caseItem.id, task.id]);

        console.log(`Linked task "${task.title}" to client "${client.name}" and case "${caseItem.title}"`);
      }
    }

    console.log('\nTask assignments fixed successfully!');
    pool.end();
  } catch (e) {
    console.error('DB Error:', e.message);
  }
}

fixTasks();
