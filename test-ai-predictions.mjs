// Enhanced test script for AI predictions using ES modules
import axios from 'axios';
import { promises as fs } from 'fs';
import assert from 'assert';

// Create an axios instance with cookie support
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
});

// For storing cookies between requests
const cookieJar = {
  cookies: null,
  setCookies(cookies) {
    this.cookies = cookies;
  },
  getCookieHeader() {
    return this.cookies ? { Cookie: this.cookies.join('; ') } : {};
  }
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAIPredictions() {
  try {
    console.log('🔍 Testing Enhanced AI Prediction Functionality');
    console.log('==============================================\n');
    
    // Step 1: Login as admin
    console.log('Step 1: Logging in as admin...');
    const loginResponse = await api.post('/api/login', {
      username: 'admin',
      password: 'admin123'
    });
    assert.strictEqual(loginResponse.status, 200, 'Login request failed');
    
    // Save cookies for subsequent requests
    if (loginResponse.headers['set-cookie']) {
      cookieJar.setCookies(loginResponse.headers['set-cookie']);
      console.log('✅ Login successful');
    } else {
      throw new Error('No cookies returned from login');
    }
    
    // Step 2: Get general predictions (without specifying a station)
    console.log('\nStep 2: Fetching general predictions...');
    const generalPredictionsResponse = await api.get('/api/admin/analytics/predictions', {
      headers: cookieJar.getCookieHeader()
    });
    assert.strictEqual(generalPredictionsResponse.status, 200, 'Predictions request failed');
    assert.ok(Array.isArray(generalPredictionsResponse.data), 'Prediction data should be an array');
    
    console.log('General predictions received:');
    console.log(JSON.stringify(generalPredictionsResponse.data, null, 2));
    
    // Step 3: Test predictions for a specific station (if stations exist)
    console.log('\nStep 3: Checking for polling stations...');
    const stationsResponse = await api.get('/api/polling-stations', {
      headers: cookieJar.getCookieHeader()
    });
    
    if (stationsResponse.data && stationsResponse.data.length > 0) {
      const firstStation = stationsResponse.data[0];
      console.log(`Found polling station: ${firstStation.name} (ID: ${firstStation.id})`);
      
      console.log(`\nFetching predictions for station ID ${firstStation.id}...`);
      const stationPredictionsResponse = await api.get(`/api/admin/analytics/predictions/${firstStation.id}`, {
        headers: cookieJar.getCookieHeader()
      });
      
      console.log(`Predictions for station ${firstStation.name}:`);
      console.log(JSON.stringify(stationPredictionsResponse.data, null, 2));
    } else {
      console.log('⚠️ No polling stations found, skipping station-specific predictions');
    }
    
    // Step 4: Create a test report if none exist
    console.log('\nStep 4: Testing with real report data...');
    const reportsResponse = await api.get('/api/reports', {
      headers: cookieJar.getCookieHeader()
    });
    
    if (reportsResponse.data && reportsResponse.data.length === 0) {
      // No reports exist, create a test report
      console.log('No reports found. Creating a test report...');
      
      // Find polling station for the report
      let stationId = null;
      if (stationsResponse.data && stationsResponse.data.length > 0) {
        stationId = stationsResponse.data[0].id;
      }
      
      if (stationId) {
        const testReport = {
          title: 'Test Report for AI Analysis',
          description: 'This report was created to test the AI prediction functionality',
          pollingStationId: stationId,
          category: 'voter eligibility disputes',
          severity: 'medium',
          content: {
            details: 'Multiple voters were turned away due to ID verification issues',
            votersAffected: 15,
            timeOfIncident: new Date().toISOString(),
            witnessCount: 3
          },
          status: 'pending'
        };
        
        const createReportResponse = await api.post('/api/reports', testReport, {
          headers: cookieJar.getCookieHeader()
        });
        
        console.log('✅ Test report created successfully');
        console.log('Waiting 2 seconds before re-testing predictions...');
        await sleep(2000);
        
        // Re-test predictions with the new report
        console.log('\nRe-testing predictions after adding report...');
        const updatedPredictionsResponse = await api.get('/api/admin/analytics/predictions', {
          headers: cookieJar.getCookieHeader()
        });
        
        console.log('Updated predictions received:');
        console.log(JSON.stringify(updatedPredictionsResponse.data, null, 2));
      } else {
        console.log('⚠️ No polling stations available to create test report');
      }
    } else {
      console.log(`Found ${reportsResponse.data.length} existing reports`);
    }
    
    console.log('\n==============================================');
    console.log('✅ AI Prediction testing completed');
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received', error.request);
    }
    process.exitCode = 1;
  }
}

// Run the test
testAIPredictions();
