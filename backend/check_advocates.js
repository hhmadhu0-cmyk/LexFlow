import mysql from 'mysql2/promise';

async function checkAdvocates() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    const [rows] = await pool.execute('SELECT * FROM advocates');
    console.log('Advocates in database:', rows.length);
    rows.forEach(advocate => {
      console.log(`- ${advocate.name} (ID: ${advocate.id}, Username: ${advocate.username})`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkAdvocates();
