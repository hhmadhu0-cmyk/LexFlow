import mysql from 'mysql2/promise';

async function assignAjayToBavani() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    // Get Bavani's ID
    const [advocateRows] = await pool.execute('SELECT id FROM advocates WHERE username = ?', ['Bavani']);
    if (advocateRows.length === 0) {
      console.log('Advocate Bavani not found');
      return;
    }
    const advocateId = advocateRows[0].id;

    // Update Ravi to assign to Bavani
    const [result] = await pool.execute(
      'UPDATE clients SET advocate_id = ? WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
      [advocateId, 'Ravi']
    );

    console.log('Updated Ravi to assign to Bavani, affected rows:', result.affectedRows);

  } catch (error) {
    console.error('Error assigning Ajay to Bavani:', error);
  } finally {
    pool.end();
  }
}

assignAjayToBavani();
