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

// Make diagnostics available in browser console
if (typeof window !== 'undefined') {
  (window as any).testHereMaps = logHereDiagnostics;
  console.log('💡 HERE Maps diagnostics available: Run window.testHereMaps() in console to test');
}

// Use the optimized and configured query client from lib/queryClient.ts
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <App />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
