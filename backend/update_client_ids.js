import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function updateClientIds() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook',
    multipleStatements: true
  });

  try {
    console.log('=== UPDATING CLIENT IDs TO BE SEQUENTIAL ===');

    // Read the SQL file
    const sqlFilePath = path.resolve(process.cwd(), 'update_client_id.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    await pool.execute(sqlContent);

    console.log('Client IDs updated successfully!');

    // Verify the changes
    const [clients] = await pool.execute('SELECT id, name FROM clients ORDER BY id');
    console.log('Current clients:');
    clients.forEach(client => {
      console.log(`- ID: ${client.id}, Name: ${client.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

updateClientIds();
