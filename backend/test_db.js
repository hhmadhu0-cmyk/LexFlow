import mysql from 'mysql2/promise';

async function testDatabase() {
  console.log('🧪 Testing Database Connection and Tables...\n');

  let connection;
  try {
    // Connect to database
    console.log('1. Connecting to database...');
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'ABCD',
      database: 'advocate_casebook'
    });
    console.log('✅ Database connected\n');

    // Check if case_files table exists
    console.log('2. Checking case_files table...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'case_files'"
    );

    if (tables.length === 0) {
      console.log('❌ case_files table does not exist\n');
      return;
    }
    console.log('✅ case_files table exists\n');

    // Check table structure
    console.log('3. Checking table structure...');
    const [columns] = await connection.execute(
      "DESCRIBE case_files"
    );
    console.log('Table columns:', columns.map(col => col.Field).join(', '));

    // Try a simple insert to test permissions
    console.log('4. Testing insert permissions...');
    try {
      const [result] = await connection.execute(
        'INSERT INTO case_files (case_id, filename, original_name, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
        [1, 'test.txt', 'test.txt', '/tmp/test.txt', 'testuser']
      );
      console.log('✅ Insert successful, ID:', result.insertId);

      // Clean up test record
      await connection.execute('DELETE FROM case_files WHERE id = ?', [result.insertId]);
      console.log('✅ Test record cleaned up');
    } catch (insertError) {
      console.log('❌ Insert failed:', insertError.message);
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testDatabase();
