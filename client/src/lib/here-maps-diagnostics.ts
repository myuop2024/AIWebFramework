/**
 * HERE Maps Diagnostics
 * Tool to diagnose and test HERE Maps API configuration
 */

import { getHereApiKey, isHereMapsConfigured } from './here-maps-config';
import { hereMapsService } from './here-maps';

export interface DiagnosticResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export interface HereDiagnostics {
  apiKeyConfigured: DiagnosticResult;
  apiKeyValid: DiagnosticResult;
  geocodingTest: DiagnosticResult;
  reverseGeocodingTest: DiagnosticResult;
  routingTest: DiagnosticResult;
  overallStatus: 'working' | 'partial' | 'failed';
}

// Run comprehensive HERE Maps diagnostics
export async function runHereDiagnostics(): Promise<HereDiagnostics> {
  const results: HereDiagnostics = {
    apiKeyConfigured: { status: 'error', message: 'Not checked' },
    apiKeyValid: { status: 'error', message: 'Not checked' },
    geocodingTest: { status: 'error', message: 'Not checked' },
    reverseGeocodingTest: { status: 'error', message: 'Not checked' },
    routingTest: { status: 'error', message: 'Not checked' },
    overallStatus: 'failed'
  };

  // Test 1: Check if API key is configured
  try {
    const isConfigured = isHereMapsConfigured();
    if (isConfigured) {
      results.apiKeyConfigured = {
        status: 'success',
        message: 'API key is configured'
      };
    } else {
      results.apiKeyConfigured = {
        status: 'error',
        message: 'API key is not configured'
      };
      return results; // No point continuing if not configured
    }
  } catch (error) {
    results.apiKeyConfigured = {
      status: 'error',
      message: 'Failed to check API key configuration',
      details: error
    };
    return results;
  }

  // Test 2: Validate API key format
  try {
    const apiKey = getHereApiKey();
    if (apiKey && apiKey.length > 20) {
      results.apiKeyValid = {
        status: 'success',
        message: 'API key format appears valid',
        details: { keyLength: apiKey.length }
      };
    } else {
      results.apiKeyValid = {
        status: 'warning',
        message: 'API key format may be invalid',
        details: { keyLength: apiKey?.length || 0 }
      };
    }
  } catch (error) {
    results.apiKeyValid = {
      status: 'error',
      message: 'Failed to validate API key',
      details: error
    };
  }

  // Test 3: Test geocoding (address to coordinates)
  try {
    const testAddress = '1600 Amphitheatre Parkway, Mountain View, CA';
    const geocodeResult = await hereMapsService.geocodeAddress(testAddress);
    
    if (geocodeResult && geocodeResult.position) {
      results.geocodingTest = {
        status: 'success',
        message: 'Geocoding API is working',
        details: {
          testAddress,
          result: geocodeResult
        }
      };
    } else {
      results.geocodingTest = {
        status: 'error',
        message: 'Geocoding returned no results'
      };
    }
  } catch (error: any) {
    results.geocodingTest = {
      status: 'error',
      message: `Geocoding failed: ${error.message}`,
      details: error
    };
  }

  // Test 4: Test reverse geocoding (coordinates to address)
  try {
    const testLat = 37.4224764;
    const testLng = -122.0842499;
    const reverseResult = await hereMapsService.reverseGeocode(testLat, testLng);
    
    if (reverseResult && reverseResult.address) {
      results.reverseGeocodingTest = {
        status: 'success',
        message: 'Reverse geocoding API is working',
        details: {
          testCoordinates: { lat: testLat, lng: testLng },
          result: reverseResult
        }
      };
    } else {
      results.reverseGeocodingTest = {
        status: 'error',
        message: 'Reverse geocoding returned no results'
      };
    }
  } catch (error: any) {
    results.reverseGeocodingTest = {
      status: 'error',
      message: `Reverse geocoding failed: ${error.message}`,
      details: error
    };
  }

  // Test 5: Test routing
  try {
    const routeResult = await hereMapsService.calculateRoute(
      37.4224764, -122.0842499, // Google HQ
      37.7749295, -122.4194155  // San Francisco
    );
    
    if (routeResult && routeResult.routes && routeResult.routes.length > 0) {
      results.routingTest = {
        status: 'success',
        message: 'Routing API is working',
        details: {
          routesFound: routeResult.routes.length,
          firstRoute: routeResult.routes[0]
        }
      };
    } else {
      results.routingTest = {
        status: 'error',
        message: 'Routing returned no routes'
      };
    }
  } catch (error: any) {
    results.routingTest = {
      status: 'error',
      message: `Routing failed: ${error.message}`,
      details: error
    };
  }

  // Determine overall status
  const allTests = [
    results.apiKeyConfigured,
    results.apiKeyValid,
    results.geocodingTest,
    results.reverseGeocodingTest,
    results.routingTest
  ];

  const successCount = allTests.filter(t => t.status === 'success').length;
  const errorCount = allTests.filter(t => t.status === 'error').length;

  if (errorCount === 0) {
    results.overallStatus = 'working';
  } else if (successCount > 0) {
    results.overallStatus = 'partial';
  } else {
    results.overallStatus = 'failed';
  }

  return results;
}

// Log diagnostics to console
export async function logHereDiagnostics() {
  console.log('🔍 Running HERE Maps Diagnostics...');
  
  try {
    const diagnostics = await runHereDiagnostics();
    
    console.group('HERE Maps Diagnostic Results');
    
    Object.entries(diagnostics).forEach(([key, value]) => {
      if (key === 'overallStatus') {
        console.log(`\n📊 Overall Status: ${value}`);
        return;
      }
      
      const result = value as DiagnosticResult;
      const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      
      console.group(`${icon} ${key}`);
      console.log(`Status: ${result.status}`);
      console.log(`Message: ${result.message}`);
      if (result.details) {
        console.log('Details:', result.details);
      }
      console.groupEnd();
    });
    
    console.groupEnd();
    
    return diagnostics;
  } catch (error) {
    console.error('Failed to run diagnostics:', error);
    throw error;
  }
} 