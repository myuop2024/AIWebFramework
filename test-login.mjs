import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing unified /api/auth/login endpoint...');

    // POST to /api/auth/login with test credentials
    const loginResponse = await fetch('http://localhost:3101/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass',
        deviceId: 'test-device-123'
      }),
      redirect: 'manual',
    });

    console.log('Login response status:', loginResponse.status);
    const data = await loginResponse.json().catch(() => ({}));
    console.log('Login response body:', data);

    if (loginResponse.ok) {
      console.log('Login test PASSED');
    } else {
      console.log('Login test FAILED');
    }
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

testLogin();
