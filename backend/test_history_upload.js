import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

const BASE_URL = 'http://localhost:5000';

async function testHistoryDocumentUpload() {
  console.log('🧪 Testing Case History Document Upload...\n');

  try {
    // Check if server is running
    console.log('1. Checking server connectivity...');
    const healthCheck = await fetch(`${BASE_URL}/cases`);
    if (!healthCheck.ok) {
      console.log('❌ Server not responding\n');
      return;
    }
    console.log('✅ Server is running\n');

    // Check if test file exists
    const testFilePath = './test_document.txt';
    if (!fs.existsSync(testFilePath)) {
      console.log('❌ Test file not found. Creating one...\n');
      fs.writeFileSync(testFilePath, 'This is a test document for upload testing.');
    }

    // Test upload to case ID 1 (assuming it exists)
    console.log('2. Testing history document upload...');
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath));
    formData.append('uploadedBy', 'TestUser');

    const uploadResponse = await fetch(`${BASE_URL}/cases/1/history/documents`, {
      method: 'POST',
      body: formData,
    });

    console.log('Upload response status:', uploadResponse.status);
    console.log('Upload response headers:', uploadResponse.headers.raw());

    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      console.log('✅ Upload successful:', result);
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload failed:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testHistoryDocumentUpload();
