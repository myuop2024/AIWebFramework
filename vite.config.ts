// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // Node.js path module for resolving paths
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal"; // Replit specific error overlay

/**
 * Asynchronously loads the cartographer plugin if in a Replit development environment.
 * This plugin is specific to Replit and might not be needed or available elsewhere.
 * @returns {Promise<Array<import('vite').PluginOption>>} A promise that resolves to an array containing the plugin, or an empty array.
 */
async function loadConditionalReplitPlugins() {
  const isReplitDevEnvironment =
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined;

  if (isReplitDevEnvironment) {
    try {
      // Dynamically import the Replit cartographer plugin
      const { cartographer } = await import(
        "@replit/vite-plugin-cartographer"
      );
      console.log("Loaded @replit/vite-plugin-cartographer");
      return [cartographer()]; // Return the plugin instance in an array
    } catch (error) {
      // Log a warning if the optional plugin fails to load
      console.warn(
        "Optional plugin @replit/vite-plugin-cartographer could not be loaded:",
        error.message
      );
      return []; // Return an empty array if loading fails
    }
  }
  return []; // Return an empty array if not in the specific Replit dev environment
}

// Vite configuration
// defineConfig can accept an async function, which is useful for async operations like dynamic imports.
export default defineConfig(async ({ command, mode }) => {
  // command: 'serve' (during development) or 'build' (when building for production)
  // mode: 'development', 'production', or custom modes

  // Load any conditional plugins
  const conditionalPlugins = await loadConditionalReplitPlugins();

  return {
    // List of Vite plugins
    plugins: [
      react(), // Enables React support (Fast Refresh, JSX, etc.)
      runtimeErrorOverlay(), // Replit's runtime error modal
      ...conditionalPlugins, // Spread in any conditionally loaded plugins
    ],

    // Path resolution settings
    resolve: {
      alias: {
        // Define convenient path aliases
        // import.meta.dirname is a Vite-specific (and modern ESM) way to get the current directory
        "@": path.resolve(import.meta.url.replace(/\/[^/]*$/, ""), "client", "src"),
        "@shared": path.resolve(import.meta.url.replace(/\/[^/]*$/, ""), "shared"),
        "@assets": path.resolve(import.meta.url.replace(/\/[^/]*$/, ""), "attached_assets"),
      },
    },

    // Project root directory (where index.html is typically located)
    // This is relative to the vite.config.js file if not an absolute path.
    root: path.resolve(import.meta.url.replace(/\/[^/]*$/, ""), "client"),

    // Build-specific options
    build: {
      // Output directory for the production build
      outDir: path.resolve(import.meta.url.replace(/\/[^/]*$/, ""), "dist/public"),
      // Whether to empty the outDir before building (recommended)
      emptyOutDir: true,
      // Source map generation for easier debugging in production (can be true, 'inline', or 'hidden')
      // Consider enabling for production if you need to debug bundled code.
      // sourcemap: mode === 'production' ? true : 'inline',
      // You can add other build options here, like minify, chunkSizeWarningLimit, etc.
    },

    // Development server options (vite dev)
    server: {
      // port: 3000, // Specify server port
      // open: true, // Automatically open the app in the browser on server start
      // proxy: { // Setup proxy for API requests if your backend is on a different port/domain
      //   '/api': 'http://localhost:8080',
      // },
    },

    // Preview server options (vite preview)
    preview: {
      // port: 4173, // Port for the preview server (after building)
      // open: true,
    },

    // Environment variables handling
    // Vite exposes env variables from .env files and process.env
    // You can define additional variables here:
    // define: {
    //   __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    // },
  };
});