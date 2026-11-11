import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test data
const testCaseId = 1; // Assuming case with ID 1 exists

async function testEndpoints() {
  console.log('🧪 Testing Case History Documents API Endpoints...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const healthCheck = await fetch(`${BASE_URL}/cases`);
    if (healthCheck.ok) {
      console.log('✅ Server is running\n');
    } else {
      console.log('❌ Server not responding\n');
      return;
    }

    // Test 2: Check if case exists
    console.log('2. Testing case retrieval...');
    const caseResponse = await fetch(`${BASE_URL}/cases/${testCaseId}`);
    if (caseResponse.ok) {
      const caseData = await caseResponse.json();
      console.log(`✅ Case ${testCaseId} exists: ${caseData.title}\n`);
    } else {
      console.log(`❌ Case ${testCaseId} not found\n`);
      return;
    }

    // Test 3: Check history documents endpoint (should return empty initially)
    console.log('3. Testing history documents retrieval...');
    const historyDocsResponse = await fetch(`${BASE_URL}/cases/${testCaseId}/history/documents`);
    if (historyDocsResponse.ok) {
      const historyDocs = await historyDocsResponse.json();
      console.log(`✅ History documents endpoint working. Found ${historyDocs.documents?.length || 0} documents\n`);
    } else {
      console.log('❌ History documents endpoint failed\n');
    }

    // Test 4: Check history summaries endpoint
    console.log('4. Testing history summaries retrieval...');
    const summariesResponse = await fetch(`${BASE_URL}/cases/${testCaseId}/history/summaries`);
    if (summariesResponse.ok) {
      const summaries = await summariesResponse.json();
      console.log(`✅ History summaries endpoint working. Found ${summaries.summaries?.length || 0} summaries\n`);
    } else {
      console.log('❌ History summaries endpoint failed\n');
    }

    console.log('🎉 Basic endpoint testing completed!');
    console.log('\n📝 Note: File upload and AI summarization tests require the server to be running and a test file to be available.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run tests
testEndpoints();
