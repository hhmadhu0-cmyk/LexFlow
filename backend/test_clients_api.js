import fetch from 'node-fetch';

async function testClientsAPI() {
  try {
    console.log('Testing clients API for Bavani...');
    const response = await fetch('http://localhost:5000/clients?advocate_username=Bavani');
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Clients for Bavani:', data);

    console.log('\nTesting clients API for advocate1...');
    const response2 = await fetch('http://localhost:5000/clients?advocate_username=advocate1');
    const data2 = await response2.json();
    console.log('Response status:', response2.status);
    console.log('Clients for advocate1:', data2);
  } catch (error) {
    console.error('Error:', error);
  }
}

testClientsAPI();
