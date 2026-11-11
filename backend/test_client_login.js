import fetch from 'node-fetch';

async function testClientLogin() {
  try {
    const response = await fetch('http://localhost:5000/login/client', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'Ajay',
        password: 'Ajay123'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testClientLogin();
