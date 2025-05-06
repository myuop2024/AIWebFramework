/**
 * Device fingerprinting utility for security binding
 * 
 * This module provides functions to generate a unique device fingerprint
 * based on various browser and device characteristics.
 */

/**
 * Generate a device fingerprint based on available browser information
 * @returns A unique identifier for the current device
 */
export async function generateDeviceFingerprint(): Promise<string> {
  try {
    // Collect browser and device information
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platformInfo = navigator.platform;
    const userAgent = navigator.userAgent;
    
    // Check for hardware concurrency (CPU cores)
    const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
    
    // Get browser plugins (without revealing sensitive info)
    const pluginsLength = navigator.plugins ? navigator.plugins.length : 0;
    
    // Canvas fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let canvasInfo = 'canvas-unsupported';
    
    if (ctx) {
      // Draw text with specific font and color
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillText('CAFFE Observer Platform', 2, 2);
      
      // Add a colored rectangle
      ctx.fillStyle = '#FFBD00'; // Jamaican gold color
      ctx.fillRect(100, 25, 80, 15);
      
      // Get the canvas data and hash it
      canvasInfo = canvas.toDataURL();
    }
    
    // Collect all fingerprint components
    const components = [
      screenInfo,
      timeZone,
      language,
      platformInfo,
      hardwareConcurrency.toString(),
      pluginsLength.toString(),
      canvasInfo,
      // Use selective parts of user agent to reduce identifying information
      userAgent.substring(0, 100)
    ];
    
    // Combine components and hash them
    const fingerprint = await hashString(components.join('|'));
    
    return fingerprint;
  } catch (error) {
    console.error('Error generating device fingerprint:', error);
    // Fallback to a random identifier if fingerprinting fails
    return `fallback-${Math.random().toString(36).substring(2, 15)}`;
  }
}

/**
 * Create a hash of a string using SHA-256
 */
async function hashString(input: string): Promise<string> {
  // Use Web Crypto API for secure hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert hash buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Compare two device fingerprints with tolerance for minor browser/device updates
 * @param fingerprint1 First fingerprint to compare
 * @param fingerprint2 Second fingerprint to compare
 * @returns Whether the fingerprints match within an acceptable threshold
 */
export function fingerprintsMatch(fingerprint1: string, fingerprint2: string): boolean {
  if (!fingerprint1 || !fingerprint2) return false;
  
  // For exact matching
  if (fingerprint1 === fingerprint2) return true;
  
  // Calculate similarity for partial matching (handle minor browser updates)
  const minLength = Math.min(fingerprint1.length, fingerprint2.length);
  let matchingChars = 0;
  
  for (let i = 0; i < minLength; i++) {
    if (fingerprint1[i] === fingerprint2[i]) {
      matchingChars++;
    }
  }
  
  const similarity = matchingChars / minLength;
  
  // Consider it a match if fingerprints are at least 95% similar
  return similarity >= 0.95;
}