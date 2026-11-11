import mysql from 'mysql2/promise';

async function updateDatabase() {
  let connection;

  try {
    // Create connection
    connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: 'ABCD',
      database: 'advocate_casebook'
    });

    console.log('Connected to database');

    // Check if amount_paid column exists, if not add it
    console.log('Adding amount_paid column...');
    const [amountPaidColumns] = await connection.execute(`
      SHOW COLUMNS FROM invoices LIKE 'amount_paid'
    `);
    if (amountPaidColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE invoices
        ADD COLUMN amount_paid DECIMAL(10,2) DEFAULT 0.00
      `);
    }

    // Check if remaining_amount column exists, if not add it
    console.log('Adding remaining_amount column...');
    const [remainingAmountColumns] = await connection.execute(`
      SHOW COLUMNS FROM invoices LIKE 'remaining_amount'
    `);
    if (remainingAmountColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE invoices
        ADD COLUMN remaining_amount DECIMAL(10,2) DEFAULT 0.00
      `);
    }

    // Check if status column exists, if not add it
    console.log('Adding status column...');
    const [statusColumns] = await connection.execute(`
      SHOW COLUMNS FROM invoices LIKE 'status'
    `);
    if (statusColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE invoices
        ADD COLUMN status VARCHAR(50) DEFAULT 'Pending'
      `);
    }

    // Check if due_date column exists, if not add it
    console.log('Adding due_date column...');
    const [dueDateColumns] = await connection.execute(`
      SHOW COLUMNS FROM invoices LIKE 'due_date'
    `);
    if (dueDateColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE invoices
        ADD COLUMN due_date DATE
      `);
    }

    // Update existing records to calculate remaining_amount
    console.log('Updating remaining_amount for existing records...');
    await connection.execute(`
      UPDATE invoices
      SET remaining_amount = amount_to_pay - amount_paid
      WHERE remaining_amount = 0.00 OR remaining_amount IS NULL
    `);

    console.log('Database update completed successfully!');

  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the update
updateDatabase();
