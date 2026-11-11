import mysql from 'mysql2/promise';

async function updateClientPhones() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('Updating client phone numbers...\n');

    // Update Ajaya's phone number
    const [ajayaResult] = await pool.execute(
      'UPDATE clients SET phone = ? WHERE name = ?',
      ['1234567890', 'Ajaya']
    );
    console.log(`Updated Ajaya's phone number. Rows affected: ${ajayaResult.affectedRows}`);

    // Update Smarath's phone number
    const [smarathResult] = await pool.execute(
      'UPDATE clients SET phone = ? WHERE name = ?',
      ['0987654321', 'Smarath']
    );
    console.log(`Updated Smarath's phone number. Rows affected: ${smarathResult.affectedRows}`);

    // Verify the updates
    const [clients] = await pool.execute('SELECT id, name, phone FROM clients WHERE name IN (?, ?)', ['Ajaya', 'Smarath']);
    console.log('\nUpdated client phone numbers:');
    clients.forEach(c => console.log(`  ${c.name}: ${c.phone}`));

  } catch (error) {
    console.error('Error updating client phones:', error);
  } finally {
    pool.end();
  }
}

updateClientPhones();
