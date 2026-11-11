import mysql from 'mysql2/promise';

async function testQuery() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Testing first part of UNION (client_id):');
    const [part1] = await pool.execute('SELECT DISTINCT cl.* FROM clients cl INNER JOIN tasks t ON t.client_id = cl.id WHERE t.assigned_to = 1');
    part1.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    console.log('\nTesting second part of UNION (case_id):');
    const [part2] = await pool.execute('SELECT DISTINCT cl.* FROM clients cl INNER JOIN cases c ON cl.name = c.client INNER JOIN tasks t ON c.id = t.case_id WHERE t.assigned_to = 1');
    part2.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));

    console.log('\nTesting full UNION:');
    const [union] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = 1
      UNION
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = 1
      ORDER BY name
    `);
    union.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

testQuery();
