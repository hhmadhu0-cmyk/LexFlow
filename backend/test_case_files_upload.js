import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';

async function testCaseFilesUpload() {
  console.log('🧪 Testing Case Files Upload...\n');

  try {
    // Check if server is running
    console.log('1. Testing server connectivity...');
    const healthCheck = await makeRequest('http://localhost:5000/cases', 'GET');
    if (healthCheck.statusCode !== 200) {
      console.log('❌ Server not responding\n');
      return;
    }
    console.log('✅ Server is running\n');

    // Check if test file exists
    console.log('2. Checking test file...');
    if (!fs.existsSync('./test_upload.txt')) {
      console.log('❌ Test file not found\n');
      return;
    }
    console.log('✅ Test file exists\n');

    // Test upload
    console.log('3. Testing case files upload...');
    const fileContent = fs.readFileSync('./test_upload.txt');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2, 9);
    
    const postData = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="files"; filename="test_upload.txt"\r\n`,
      `Content-Type: text/plain\r\n\r\n`,
      fileContent,
      `\r\n--${boundary}\r\n`,
      `Content-Disposition: form-data; name="uploadedBy"\r\n\r\n`,
      `testuser\r\n`,
      `--${boundary}--\r\n`
    ].join('');

    const uploadResponse = await makeRequest('http://localhost:5000/cases/1/files', 'POST', postData, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(postData)
    });

    console.log(`Response status: ${uploadResponse.statusCode}`);
    console.log(`Response headers:`, uploadResponse.headers);

    if (uploadResponse.statusCode === 200) {
      try {
        const result = JSON.parse(uploadResponse.data);
        console.log('✅ Upload successful:', result);
      } catch (parseError) {
        console.log('❌ Upload response is not valid JSON:', uploadResponse.data);
      }
    } else {
      console.log('❌ Upload failed:', uploadResponse.data);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

testCaseFilesUpload();
