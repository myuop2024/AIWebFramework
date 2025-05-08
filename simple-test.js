// Simple test script using fetch API directly
import fetch from 'node-fetch';

// Function to create a cookie jar
const cookieJar = {
  cookies: [],
  setCookies(setCookieHeader) {
    if (setCookieHeader) {
      // Extract just the cookie part before semi-colon
      const cookies = setCookieHeader.map(cookie => cookie.split(';')[0]);
      this.cookies = [...this.cookies, ...cookies];
    }
  },
  getCookieHeader() {
    return this.cookies.join('; ');
  }
};

async function testPredictions() {
  try {
    console.log('🔍 Testing AI Predictions API');
    console.log('===============================');
    
    // Login first
    console.log('\nStep 1: Logging in...');
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    // Save cookies
    const setCookieHeader = loginResponse.headers.raw()['set-cookie'];
    if (setCookieHeader) {
      cookieJar.setCookies(setCookieHeader);
      console.log('Cookies received:', cookieJar.getCookieHeader());
    } else {
      console.log('No cookies received from login');
    }
    
    // Call predictions API
    console.log('\nStep 2: Fetching predictions...');
    const predictionsResponse = await fetch('http://localhost:5000/api/admin/analytics/predictions', {
      method: 'GET',
      headers: {
        'Cookie': cookieJar.getCookieHeader()
      }
    });
    
    const predictionsData = await predictionsResponse.text();
    console.log('Predictions Response:');
    console.log(predictionsData);
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error('Error testing predictions:', error);
  }
}

testPredictions();