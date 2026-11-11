import mysql from 'mysql2/promise';

async function testCaseHistory() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== Testing Case History Functionality ===\n');

    // Test 1: Check if case_history table exists
    console.log('1. Checking if case_history table exists...');
    const [tables] = await pool.execute('SHOW TABLES LIKE "case_history"');
    if (tables.length === 0) {
      console.log('❌ case_history table does not exist');
      return;
    }
    console.log('✅ case_history table exists');

    // Test 2: Check table structure
    console.log('\n2. Checking case_history table structure...');
    const [columns] = await pool.execute('DESCRIBE case_history');
    const expectedColumns = ['id', 'case_id', 'change_type', 'field_name', 'old_value', 'new_value', 'changed_by', 'changed_at', 'notes'];
    const actualColumns = columns.map(col => col.Field);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      return;
    }
    console.log('✅ Table structure is correct');

    // Test 3: Check current data
    console.log('\n3. Checking current history entries...');
    const [countResult] = await pool.execute('SELECT COUNT(*) as count FROM case_history');
    console.log(`📊 Current history entries: ${countResult[0].count}`);

    // Test 4: Insert a test history entry
    console.log('\n4. Testing manual history entry insertion...');
    const testCaseId = 1; // Assuming case ID 1 exists
    await pool.execute(
      'INSERT INTO case_history (case_id, change_type, field_name, old_value, new_value, changed_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [testCaseId, 'test_entry', 'status', 'Open', 'Closed', 'TestUser', 'Testing history functionality']
    );
    console.log('✅ Test history entry inserted');

    // Test 5: Retrieve history for the test case
    console.log('\n5. Testing history retrieval...');
    const [history] = await pool.execute(
      'SELECT * FROM case_history WHERE case_id = ? ORDER BY changed_at DESC LIMIT 5',
      [testCaseId]
    );
    console.log(`📋 Retrieved ${history.length} history entries for case ${testCaseId}`);
    if (history.length > 0) {
      console.log('Latest entry:', {
        change_type: history[0].change_type,
        field_name: history[0].field_name,
        old_value: history[0].old_value,
        new_value: history[0].new_value,
        changed_by: history[0].changed_by
      });
    }

    // Test 6: Test foreign key constraint
    console.log('\n6. Testing foreign key constraints...');
    try {
      await pool.execute(
        'INSERT INTO case_history (case_id, change_type, changed_by) VALUES (?, ?, ?)',
        [99999, 'test', 'TestUser'] // Non-existent case ID
      );
      console.log('❌ Foreign key constraint not working - should have failed');
    } catch (error) {
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('✅ Foreign key constraint working correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Clean up test data
    console.log('\n7. Cleaning up test data...');
    await pool.execute('DELETE FROM case_history WHERE changed_by = ?', ['TestUser']);
    console.log('✅ Test data cleaned up');

    console.log('\n=== All Tests Completed Successfully! ===');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testCaseHistory();
