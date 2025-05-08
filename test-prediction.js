// Test script for the new prediction functionality
import axios from 'axios';

async function testPredictions() {
  try {
    // Login as admin first to get session cookie
    const loginResponse = await axios.post('http://localhost:5000/api/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      withCredentials: true
    });
    
    console.log('Login successful. User:', loginResponse.data);
    
    // Get the cookie from login response
    const cookies = loginResponse.headers['set-cookie'];
    
    // Make request to predictions endpoint
    console.log('\nFetching predictions:');
    const predictionsResponse = await axios.get('http://localhost:5000/api/admin/analytics/predictions', {
      headers: {
        Cookie: cookies
      }
    });
    
    console.log('\nPrediction Results:');
    console.log(JSON.stringify(predictionsResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing predictions:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testPredictions();