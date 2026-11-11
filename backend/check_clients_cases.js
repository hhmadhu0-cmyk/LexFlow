import mysql from 'mysql2/promise';

async function checkClientsCases() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== CASES TABLE STRUCTURE ===');
    const [columns] = await pool.execute('DESCRIBE cases');
    columns.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));

    console.log('\n=== CASES DATA ===');
    const [cases] = await pool.execute('SELECT id, title, client FROM cases ORDER BY id');
    cases.forEach(c => console.log(`  Case ID: ${c.id}, Title: "${c.title}", Client: "${c.client}"`));

    console.log('\n=== CHECKING FOR SMARATH/SAMARTH CLIENT ===');
    const [samarth] = await pool.execute('SELECT * FROM clients WHERE LOWER(name) LIKE ?', ['%samarth%']);
    console.log('Samarth search results:', samarth.length);
    samarth.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    const [ajaya] = await pool.execute('SELECT * FROM clients WHERE LOWER(name) LIKE ?', ['%ajay%']);
    console.log('Ajay/Ajaya search results:', ajaya.length);
    ajaya.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    console.log('\n=== ALL CLIENTS ===');
    const [allClients] = await pool.execute('SELECT id, name FROM clients ORDER BY id');
    allClients.forEach(c => console.log(`  ID: ${c.id}, Name: ${c.name}`));

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

checkClientsCases();
