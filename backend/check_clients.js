import mysql from 'mysql2/promise';

async function checkClients() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    const [rows] = await pool.execute('SELECT c.*, a.name as advocate_name, a.username as advocate_username FROM clients c LEFT JOIN advocates a ON c.advocate_id = a.id');
    console.log('Clients in database:', rows.length);
    rows.forEach(client => {
      console.log(`- ${client.name} (ID: ${client.id}) - Advocate: ${client.advocate_name || 'None'} (${client.advocate_username || 'None'})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkClients();
