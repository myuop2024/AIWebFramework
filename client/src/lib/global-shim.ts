// Global object shim for browser environments
// This helps libraries designed for Node.js work in the browser
if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
  (window as any).global = window;
}

export {};