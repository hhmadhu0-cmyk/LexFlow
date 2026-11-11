import mysql from 'mysql2/promise';

async function testStaffEndpoints() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Testing staff endpoints for Ravi...\n');

    // Check Ravi's staff record
    const [raviStaff] = await pool.execute('SELECT * FROM staff WHERE username = ?', ['Ravi']);
    console.log('Ravi staff record:', raviStaff[0]);

    if (raviStaff.length > 0) {
      const advocateId = raviStaff[0].advocate_id;
      console.log('Ravi advocate_id:', advocateId);

      // Check tasks assigned by Ravi's advocate
      const [advocateTasks] = await pool.execute('SELECT * FROM tasks WHERE assigned_by = ?', [advocateId]);
      console.log('Tasks assigned by Ravi advocate:', advocateTasks);

      // Check clients that should be visible to Ravi (clients from cases with tasks assigned to Ravi)
      const [raviClients] = await pool.execute(`
        SELECT DISTINCT cl.* FROM clients cl
        INNER JOIN cases c ON cl.name = c.client
        INNER JOIN tasks t ON c.id = t.case_id
        WHERE t.assigned_to = ?
        ORDER BY cl.name
      `, [raviStaff[0].id]);
      console.log('Clients Ravi should see:', raviClients);

      // Check Ravi's tasks
      const [raviTasks] = await pool.execute('SELECT * FROM tasks WHERE assigned_to = ?', [raviStaff[0].id]);
      console.log('Ravi tasks:', raviTasks);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

testStaffEndpoints();
