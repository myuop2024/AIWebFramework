import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login...');
    
    // First, check if the server is responding
    const healthCheck = await fetch('http://localhost:3101/api/health', {
      method: 'GET'
    }).catch(err => {
      console.log('Health check failed:', err.message);
      return { status: 'error', ok: false };
    });
    
    console.log('Health check status:', healthCheck.status);
    
    // Try direct login route
    const loginResponse = await fetch('http://localhost:3101/api/login', {
      method: 'GET',
      redirect: 'manual',
    }).catch(err => {
      console.log('Login redirect failed:', err.message);
      return { status: 'error', ok: false };
    });
    
    console.log('Login redirect status:', loginResponse.status);
    
    if (loginResponse.ok) {
      console.log('Headers:', loginResponse.headers);
    }
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

testLogin();
