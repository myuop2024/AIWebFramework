/**
 * HERE Maps Configuration
 * Centralized configuration for HERE Maps API key handling
 */

// Function to get HERE API key from environment variables or Replit secrets
export function getHereApiKey(): string {
  // Try multiple sources for the API key
  const apiKey = 
    import.meta.env.VITE_HERE_API_KEY ||
    process.env.VITE_HERE_API_KEY ||
    (typeof window !== 'undefined' && (window as any).REPL_SECRETS?.VITE_HERE_API_KEY);

  // Check if API key exists and is not a placeholder
  if (!apiKey || apiKey === 'your_here_maps_api_key' || apiKey === '' || apiKey.trim() === '') {
    const errorMessage = 'HERE Maps API key is missing. Please set VITE_HERE_API_KEY in your environment variables.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate API key format (basic validation)
  if (apiKey.length < 20) {
    const errorMessage = 'HERE Maps API key appears to be invalid (too short).';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return apiKey.trim();
}

// Check if HERE Maps is properly configured
export function isHereMapsConfigured(): boolean {
  try {
    const apiKey = getHereApiKey();
    return !!apiKey && apiKey !== 'your_here_maps_api_key';
  } catch {
    return false;
  }
}

// Get HERE Maps platform instance
export function getHerePlatform(H: any): any {
  const apiKey = getHereApiKey();
  return new H.service.Platform({ apikey: apiKey });
}

// Type definition for window with Replit secrets
declare global {
  interface Window {
    REPL_SECRETS?: {
      VITE_HERE_API_KEY?: string;
    };
  }
}