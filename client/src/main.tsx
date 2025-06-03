// Import Node.js polyfills first to enable Node.js libraries in browser
import "@/lib/node-polyfills";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "next-themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import React from "react";
import { queryClient } from "@/lib/queryClient";

// Import HERE Maps diagnostics for debugging
import { logHereDiagnostics } from "./lib/here-maps-diagnostics";
import ErrorBoundary from './components/error/error-boundary';

// Suppress specific React warnings in development
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('UNSAFE_componentWillMount')) {
      return; // Suppress this specific warning
    }
    originalError.call(console, ...args);
  };
}

// Make diagnostics available in browser console
if (typeof window !== 'undefined') {
  (window as any).testHereMaps = logHereDiagnostics;
}

// Use the optimized and configured query client from lib/queryClient.ts
createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
);