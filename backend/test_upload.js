import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

async function testUpload() {
  console.log('🧪 Testing Case History Document Upload...\n');

  try {
    // Check if server is running
    console.log('1. Testing server connectivity...');
    const healthCheck = await fetch('http://localhost:5000/cases');
    if (!healthCheck.ok) {
      console.log('❌ Server not responding\n');
      return;
    }
    console.log('✅ Server is running\n');

    // Check if test file exists
    console.log('2. Checking test file...');
    if (!fs.existsSync('../test_upload.txt')) {
      console.log('❌ Test file not found\n');
      return;
    }
    console.log('✅ Test file exists\n');

    // Test upload
    console.log('3. Testing file upload...');
    const formData = new FormData();
    formData.append('files', fs.createReadStream('../test_upload.txt'));
    formData.append('uploadedBy', 'testuser');

    const uploadResponse = await fetch('http://localhost:5000/cases/1/history/documents', {
      method: 'POST',
      body: formData
    });

    console.log(`Response status: ${uploadResponse.status}`);
    console.log(`Response headers:`, uploadResponse.headers.raw());

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

testUpload();
