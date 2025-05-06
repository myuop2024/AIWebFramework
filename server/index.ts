import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { pool, checkDbConnection } from "./db";
import MemoryStore from "memorystore";
import { IdCardService } from "./services/id-card-service";
import { storage } from "./storage";
import path from "path";

/**
 * Initialize default data in the database
 * This ensures we have essential data like ID card templates
 */
async function initializeDefaultData() {
  try {
    // Initialize default ID card template
    const idCardService = new IdCardService();
    const templates = await storage.getAllIdCardTemplates();
    
    if (templates.length === 0) {
      console.log('Creating default ID card template...');
      await idCardService.createDefaultTemplate();
      console.log('Default ID card template created successfully');
    } else {
      console.log(`Found ${templates.length} existing ID card templates`);
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

// Create session store
const createSessionStore = () => {
  try {
    // Try to use PostgreSQL session store
    const PostgreSQLStore = pgSession(session);
    return new PostgreSQLStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
  } catch (error) {
    // Fallback to memory store if PostgreSQL fails
    console.error('Failed to create PostgreSQL session store, falling back to memory store:', error);
    const MemorySessionStore = MemoryStore(session);
    return new MemorySessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// Make storage available to all routes via app.locals
app.locals.storage = storage;

// Set up session middleware
app.use(session({
  store: createSessionStore(),
  secret: process.env.SESSION_SECRET || 'observer-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Check database connection
    await checkDbConnection();
    console.log('Database connection successful');
    
    // Initialize default data
    await initializeDefaultData();
    
    // Add health check endpoint
    app.get('/api/health', async (req, res) => {
      const dbConnected = await checkDbConnection();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development'
      });
    });
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error('Error caught by error handler:', err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Server initialization error:', error);
    
    // Still start the server even if DB connection fails 
    // This ensures the UI can still load, even if backend APIs might fail
    const server = await registerRoutes(app);
    
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
    
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port} (limited functionality mode - database connection failed)`);
    });
  }
})();
