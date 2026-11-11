import mysql from 'mysql2/promise';

async function checkCaseStatus() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== CHECKING CASE STATUSES FOR LOKESH ===\n');

    // Get Lokesh's staff ID
    const [lokeshStaff] = await pool.execute('SELECT id, name FROM staff WHERE username = ?', ['Lokesh']);
    if (lokeshStaff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = lokeshStaff[0].id;
    console.log('Lokesh ID:', lokeshId);

    // Get cases assigned to Lokesh through tasks
    const [lokeshCases] = await pool.execute(`
      SELECT DISTINCT c.id, c.title, c.status, c.client
      FROM cases c
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY c.id
    `, [lokeshId]);

    console.log(`\nCases assigned to Lokesh (${lokeshCases.length} cases):`);
    lokeshCases.forEach((caseItem, index) => {
      console.log(`${index + 1}. "${caseItem.title}" - Client: ${caseItem.client}, Status: ${caseItem.status}`);
    });

    // Check if all cases are closed
    const allClosed = lokeshCases.every(caseItem => caseItem.status?.toLowerCase() === 'closed');
    console.log(`\nAll cases closed: ${allClosed ? 'YES' : 'NO'}`);

    if (!allClosed) {
      console.log('Cases that are not closed:');
      lokeshCases.filter(caseItem => caseItem.status?.toLowerCase() !== 'closed').forEach(caseItem => {
        console.log(`  - "${caseItem.title}" - Status: ${caseItem.status}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkCaseStatus();
