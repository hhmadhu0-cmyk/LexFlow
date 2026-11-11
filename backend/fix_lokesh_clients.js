import mysql from 'mysql2/promise';

async function fixLokeshClients() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: 'ABCD',
    database: 'advocate_casebook'
  });

  try {
    console.log('=== FIXING LOKESH CLIENT ASSIGNMENTS ===\n');

    // Get Lokesh's staff ID
    const [staff] = await pool.execute('SELECT id, name FROM staff WHERE name = ?', ['Lokesh']);
    if (staff.length === 0) {
      console.log('Lokesh not found in staff table');
      return;
    }
    const lokeshId = staff[0].id;
    console.log(`Lokesh ID: ${lokeshId}`);

    // Get all clients
    const [allClients] = await pool.execute('SELECT id, name FROM clients ORDER BY name');
    console.log('\nAll clients:');
    allClients.forEach(client => console.log(`  ${client.id}: ${client.name}`));

    // Get current tasks for Lokesh
    const [currentTasks] = await pool.execute('SELECT id, title, client_id, case_id FROM tasks WHERE assigned_to = ?', [lokeshId]);
    console.log(`\nCurrent tasks for Lokesh (${currentTasks.length}):`);
    currentTasks.forEach(task => console.log(`  Task ${task.id}: "${task.title}" - Client ID: ${task.client_id}, Case ID: ${task.case_id}`));

    // Check what clients Lokesh should have based on tasks
    const expectedClientIds = [...new Set(currentTasks.map(task => task.client_id).filter(id => id !== null))];
    console.log(`\nExpected client IDs for Lokesh: ${expectedClientIds.join(', ')}`);

    // Test the endpoint query
    const [endpointResult] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = ?
      UNION
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY name
    `, [lokeshId, lokeshId]);

    console.log(`\nCurrent endpoint result (${endpointResult.length} clients):`);
    endpointResult.forEach(client => console.log(`  ${client.id}: ${client.name}`));

    // If we have 2 expected clients but only 1 in result, there's an issue
    if (expectedClientIds.length === 2 && endpointResult.length === 1) {
      console.log('\nISSUE DETECTED: Expected 2 clients but got 1');

      // Check if the missing client exists
      const missingClientId = expectedClientIds.find(id => !endpointResult.some(c => c.id === id));
      if (missingClientId) {
        const [missingClient] = await pool.execute('SELECT id, name FROM clients WHERE id = ?', [missingClientId]);
        console.log(`Missing client: ${missingClient[0].name} (ID: ${missingClientId})`);

        // Check the task for this client
        const taskForMissingClient = currentTasks.find(task => task.client_id === missingClientId);
        if (taskForMissingClient) {
          console.log(`Task for missing client: "${taskForMissingClient.title}" (ID: ${taskForMissingClient.id})`);

          // The issue might be that the task has client_id but no corresponding case, or vice versa
          // Let's ensure the task has both client_id and case_id properly set

          if (taskForMissingClient.case_id) {
            // Check if the case exists and has the correct client
            const [caseData] = await pool.execute('SELECT id, title, client FROM cases WHERE id = ?', [taskForMissingClient.case_id]);
            if (caseData.length > 0) {
              console.log(`Case exists: "${caseData[0].title}" with client "${caseData[0].client}"`);

              // If the case client name doesn't match the task client_id, fix it
              const [taskClient] = await pool.execute('SELECT name FROM clients WHERE id = ?', [taskForMissingClient.client_id]);
              if (taskClient.length > 0 && caseData[0].client !== taskClient[0].name) {
                console.log(`Case client mismatch: case has "${caseData[0].client}" but task client is "${taskClient[0].name}"`);
                console.log('Updating case client to match task client...');
                await pool.execute('UPDATE cases SET client = ? WHERE id = ?', [taskClient[0].name, taskForMissingClient.case_id]);
                console.log('Case updated successfully');
              }
            } else {
              console.log('Case not found for task, this might be the issue');
            }
          } else {
            console.log('Task has client_id but no case_id - this could cause the UNION query to miss it');
            // Try to find or create a case for this client
            const [existingCases] = await pool.execute('SELECT id, title FROM cases WHERE client = ?', [missingClient[0].name]);
            if (existingCases.length > 0) {
              console.log(`Found existing case for client: "${existingCases[0].title}" (ID: ${existingCases[0].id})`);
              console.log('Updating task to link to this case...');
              await pool.execute('UPDATE tasks SET case_id = ? WHERE id = ?', [existingCases[0].id, taskForMissingClient.id]);
              console.log('Task updated successfully');
            } else {
              console.log('No case found for client, creating a default case...');
              const [result] = await pool.execute(
                'INSERT INTO cases (title, client, status) VALUES (?, ?, ?)',
                [`Case for ${missingClient[0].name}`, missingClient[0].name, 'Open']
              );
              console.log(`Created case with ID: ${result.insertId}`);
              await pool.execute('UPDATE tasks SET case_id = ? WHERE id = ?', [result.insertId, taskForMissingClient.id]);
              console.log('Task updated to link to new case');
            }
          }
        }
      }
    }

    // Test the endpoint again after fixes
    const [finalResult] = await pool.execute(`
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN tasks t ON t.client_id = cl.id
      WHERE t.assigned_to = ?
      UNION
      SELECT DISTINCT cl.* FROM clients cl
      INNER JOIN cases c ON cl.name = c.client
      INNER JOIN tasks t ON c.id = t.case_id
      WHERE t.assigned_to = ?
      ORDER BY name
    `, [lokeshId, lokeshId]);

    console.log(`\nFinal endpoint result (${finalResult.length} clients):`);
    finalResult.forEach(client => console.log(`  ${client.id}: ${client.name}`));

    if (finalResult.length === 2) {
      console.log('\n✅ SUCCESS: Lokesh now sees 2 clients as expected!');
    } else {
      console.log(`\n❌ ISSUE PERSISTS: Still showing ${finalResult.length} clients instead of 2`);
    }

    pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixLokeshClients();
