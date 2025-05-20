import fetch from 'node-fetch';

async function registerTestUser() {
  try {
    console.log('Registering test user at /api/auth/register ...');
    const response = await fetch('http://localhost:3101/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        deviceId: 'test-device-123'
      })
    });
    console.log('Register response status:', response.status);
    const data = await response.json().catch(() => ({}));
    console.log('Register response body:', data);
    if (response.ok) {
      console.log('Test user registration PASSED');
    } else {
      console.log('Test user registration FAILED');
    }
  } catch (error) {
    console.error('Error in registration:', error.message);
  }
}

registerTestUser(); 