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
import { requestLogger, errorMonitor } from "./middleware/error-monitoring";
import logger from "./utils/logger";
import { attachUser } from "./middleware/auth";

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
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use(express.urlencoded({ extended: false }));

// Set up EJS view engine
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

// Make storage available to all routes via app.locals
app.locals.storage = storage;

// Set up session middleware with enhanced debugging
const sessionStore = createSessionStore();

// Log session store type
logger.info('Using session store type: ' + (sessionStore.constructor ? sessionStore.constructor.name : 'Unknown'));

app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'observer-session-secret',
  resave: true, // Changed to true to ensure session is saved on each request
  saveUninitialized: false,
  name: 'observer.sid', // Custom name to avoid conflicts
  cookie: { 
    secure: false, // Set to false to ensure cookies work in development environment
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  }
}));

// Add session debug middleware
app.use((req, res, next) => {
  // Log session data on each request
  logger.debug('Session state', { 
    sessionId: req.sessionID,
    hasUserId: !!req.session.userId,
    path: req.path 
  });
  
  next();
});

// Apply error monitoring middleware
app.use(requestLogger);

// Attach user information to request when available
app.use(attachUser);

// Original request logging middleware - will keep for now for backward compatibility
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

    // Register error monitoring middleware
    app.use(errorMonitor);
    
    // Fallback error handler (should be last)
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error with our enhanced logger
      logger.error('Uncaught error', err, { 
        path: req.path, 
        method: req.method, 
        userId: req.session?.userId 
      });

      // Send response if headers not sent already
      if (!res.headersSent) {
        res.status(status).json({ 
          message, 
          status,
          timestamp: new Date().toISOString(),
          path: req.path
        });
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use the port from environment variable or fallback to 3001
    // This serves both the API and the client
    const port = process.env.PORT || 3001;
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
    
    const port = process.env.PORT || 3001;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port} (limited functionality mode - database connection failed)`);
    });
  }
})();
