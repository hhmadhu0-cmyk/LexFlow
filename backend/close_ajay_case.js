import mysql from 'mysql2/promise';

async function closeAjayCase() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== CLOSING AJAY\'S CASE ===');

    // Find the case for Ajay
    const [ajayCase] = await pool.execute('SELECT id, title, status FROM cases WHERE client = ? AND title = ?', ['Ajay', 'Legal Consultation']);
    if (ajayCase.length === 0) {
      console.log('Ajay\'s case not found');
      return;
    }

    const caseId = ajayCase[0].id;
    console.log(`Found case ID ${caseId}: "${ajayCase[0].title}" - Current status: ${ajayCase[0].status}`);

    // Update the case status to Closed
    await pool.execute('UPDATE cases SET status = ? WHERE id = ?', ['Closed', caseId]);
    console.log('Case status updated to Closed');

    // Verify the change
    const [updatedCase] = await pool.execute('SELECT id, title, status FROM cases WHERE id = ?', [caseId]);
    console.log(`Verification: Case "${updatedCase[0].title}" - Status: ${updatedCase[0].status}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

closeAjayCase();
