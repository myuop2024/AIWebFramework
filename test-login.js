import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login...');
    
    // First, check if the server is responding
    const healthCheck = await fetch('http://localhost:3101/api/health', {
      method: 'GET'
    });
    
    console.log('Health check status:', healthCheck.status);
    
    // Try to login
    const loginResponse = await fetch('http://localhost:3101/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password'
      })
    });
    
    console.log('Login status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const userData = await loginResponse.json();
      console.log('Login successful:', userData);
    } else {
      const errorData = await loginResponse.text();
      console.log('Login failed:', errorData);
    }
    
    // Try alternative login endpoint
    const altLoginResponse = await fetch('http://localhost:3101/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'password'
      })
    });
    
    console.log('Alternative login status:', altLoginResponse.status);
    
    if (altLoginResponse.ok) {
      const userData = await altLoginResponse.json();
      console.log('Alternative login successful:', userData);
    } else {
      const errorData = await altLoginResponse.text();
      console.log('Alternative login failed:', errorData);
    }
    
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

testLogin();