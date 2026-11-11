import mysql from 'mysql2/promise';

async function check() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('All clients:');
    const [clients] = await pool.execute('SELECT id, name FROM clients ORDER BY id');
    clients.forEach(c => console.log(`  ID: ${c.id}, Name: ${c.name}`));

    console.log('\nLokesh tasks with client details:');
    const [tasks] = await pool.execute('SELECT t.*, c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.assigned_to = 1');
    tasks.forEach(t => console.log(`  Task: "${t.title}", Client ID: ${t.client_id}, Client Name: ${t.client_name}, Case ID: ${t.case_id}`));

    console.log('\nCases with client names:');
    const [cases] = await pool.execute('SELECT id, title, client FROM cases ORDER BY id');
    cases.forEach(c => console.log(`  Case ID: ${c.id}, Title: "${c.title}", Client: "${c.client}"`));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

check();
