import mysql from 'mysql2/promise';

async function testLokeshEndpoints() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Testing staff endpoints for Lokesh...\n');

    // Check Lokesh's staff record
    const [lokeshStaff] = await pool.execute('SELECT * FROM staff WHERE username = ?', ['Lokesh']);
    console.log('Lokesh staff record:', lokeshStaff[0]);

    if (lokeshStaff.length > 0) {
      const advocateId = lokeshStaff[0].advocate_id;
      console.log('Lokesh advocate_id:', advocateId);

      // Check tasks assigned by Lokesh's advocate
      const [advocateTasks] = await pool.execute('SELECT * FROM tasks WHERE assigned_by = ?', [advocateId]);
      console.log('Tasks assigned by Lokesh advocate:', advocateTasks);

      // Check clients that should be visible to Lokesh (clients from cases with tasks assigned to Lokesh)
      const [lokeshClients] = await pool.execute(`
        SELECT DISTINCT cl.* FROM clients cl
        INNER JOIN cases c ON cl.name = c.client
        INNER JOIN tasks t ON c.id = t.case_id
        WHERE t.assigned_to = ?
        ORDER BY cl.name
      `, [lokeshStaff[0].id]);
      console.log('Clients Lokesh should see:', lokeshClients);

      // Check Lokesh's tasks
      const [lokeshTasks] = await pool.execute('SELECT * FROM tasks WHERE assigned_to = ?', [lokeshStaff[0].id]);
      console.log('Lokesh tasks:', lokeshTasks);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

testLokeshEndpoints();
