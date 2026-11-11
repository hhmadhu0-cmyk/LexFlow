import mysql from 'mysql2/promise';

async function changeRaviId() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== CHANGING RAVI ID FROM 3 TO 2 ===');

    // First, check if ID 2 is already taken
    const [existing] = await pool.execute('SELECT id, name FROM clients WHERE id = 2');
    if (existing.length > 0) {
      console.log(`ID 2 is already taken by: ${existing[0].name}`);
      return;
    }

    // Update foreign key references first
    console.log('Updating foreign key references...');

    // Update tasks
    const [taskResult] = await pool.execute('UPDATE tasks SET client_id = 2 WHERE client_id = 3');
    console.log(`Updated ${taskResult.affectedRows} tasks`);

    // Update invoices
    const [invoiceResult] = await pool.execute('UPDATE invoices SET client_id = 2 WHERE client_id = 3');
    console.log(`Updated ${invoiceResult.affectedRows} invoices`);

    // Update reports
    const [reportResult] = await pool.execute('UPDATE reports SET client_id = 2 WHERE client_id = 3');
    console.log(`Updated ${reportResult.affectedRows} reports`);

    // Now update the client ID
    const [clientResult] = await pool.execute('UPDATE clients SET id = 2 WHERE id = 3');
    console.log(`Updated ${clientResult.affectedRows} client(s)`);

    // Verify the change
    const [raviCheck] = await pool.execute('SELECT id, name FROM clients WHERE name = "Ravi"');
    if (raviCheck.length > 0) {
      console.log(`Ravi now has ID: ${raviCheck[0].id}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

changeRaviId();
