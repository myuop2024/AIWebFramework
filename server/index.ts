import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, checkDbConnection } from "./db";
import { IdCardService } from "./services/id-card-service";
import { storage } from "./storage";
import path from "path";
import logger, { critical } from "./utils/logger";
import { attachUser } from "./middleware/auth";
import {
  finalErrorHandler,
  requestLogger as mainRequestLogger,
  // asyncHandler is available if needed by routes directly, but error handling is central
} from "./middleware/error-handler";
import { ErrorLogger } from "./services/error-logger";
import { Server } from "http";
import passport from "passport";
import fs from 'fs';
// Security middleware imports
import { 
  securityHeaders, 
  corsConfig, 
  generalRateLimit, 
  authRateLimit, 
  apiRateLimit,
  securityLogger,
  sessionSecurity
} from "./middleware/security";
import { WAFEngine } from "./middleware/waf";

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
      logger.info('Creating default ID card template...');
      await idCardService.createDefaultTemplate();
      logger.info('Default ID card template created successfully');
    } else {
      logger.info(`Found ${templates.length} existing ID card templates`);
    }
  } catch (error) {
    logger.error('Error initializing default data:', error);
  }
}

const app = express();

// Trust proxy for proper IP handling in cloud environments
app.set('trust proxy', true);

// Initialize WAF (Web Application Firewall)
const wafEngine = new WAFEngine({
  enableRateLimit: process.env.NODE_ENV === 'production',
  enableSQLInjectionProtection: true,
  enableXSSProtection: true,
  enableCSRFProtection: true,
  enableIPWhitelist: false,
  enableGeoblocking: false,
  allowedCountries: ['US', 'CA', 'GB', 'JM'],
  blockedIPs: [],
  allowedIPs: [],
  maxRequestsPerWindow: 100,
  windowMs: 15 * 60 * 1000,
});

// Security middleware - apply early
app.use(wafEngine.securityHeaders());
app.use(corsConfig);
app.use(securityLogger);

// WAF protection
app.use(wafEngine.middleware());

// Rate limiting - disabled in development to avoid proxy conflicts
if (process.env.NODE_ENV === 'production') {
  app.use(wafEngine.rateLimitMiddleware());
  app.use('/api/auth', authRateLimit);
  app.use('/api', apiRateLimit);
  app.use(generalRateLimit);
}

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

// Apply main request logger from error-handler.ts
app.use(mainRequestLogger);

// Add session debug middleware
app.use((req, res, next) => {
  // Log session data on each request
  if (req.session) {
    logger.debug('Session state', { 
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated?.() || false,
      path: req.path 
    });
  }
  next();
});

// Consolidated request logging middleware
app.use((req, res, next) => {
  // Skip non-API requests for performance
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;

    // Only log if duration is significant or status indicates error
    if (duration > 100 || res.statusCode >= 400) {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userId: req.session?.userId || 'unauthenticated'
      });
    }
  });
  next();
});

// Global error handlers for all uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', async (error: Error, origin: string) => {
  critical(`UNCAUGHT EXCEPTION --- Origin: ${origin}`, error);

  try {
    await ErrorLogger.logError({
      message: `Uncaught Exception: ${error.message}`,
      error: error,
      source: origin || 'uncaughtException',
      level: 'error',
    });
    logger.info('Uncaught exception successfully logged to database.');
  } catch (dbLogError) {
    logger.error('CRITICAL: Failed to log uncaught exception to database.', dbLogError instanceof Error ? dbLogError : new Error(String(dbLogError)));
  } finally {
    logger.info('Shutting down due to uncaught exception...');
    process.exit(1);
  }
});

process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const errorObject = reason instanceof Error ? reason : new Error(errorMessage);

  logger.error(`UNHANDLED PROMISE REJECTION --- Reason: ${errorMessage}`, errorObject);

  try {
    await ErrorLogger.logError({
      message: `Unhandled Promise Rejection: ${errorMessage}`,
      error: errorObject,
      source: 'unhandledRejection',
      level: 'critical', // Or 'error' as per original snippet, critical if exiting
      // context: { promiseDetails: util.inspect(promise) } // Example, be careful with promise object size
    });
    logger.info('Unhandled rejection successfully logged to database.');
  } catch (dbLogError) {
    logger.error('CRITICAL: Failed to log unhandled rejection to database.', dbLogError instanceof Error ? dbLogError : new Error(String(dbLogError)));
  } finally {
    logger.info('Shutting down due to unhandled promise rejection...');
    process.exit(1);
  }
});

const PAGE_LOG_PATH = path.join(process.cwd(), 'logs', 'page-logs.json');

// Batch page logs to reduce file I/O
let logBuffer: any[] = [];
let lastFlush = Date.now();
const FLUSH_INTERVAL = 30000; // 30 seconds
const BUFFER_SIZE = 50;

function savePageLog(entry: any) {
  logBuffer.push(entry);

  // Flush if buffer is full or enough time has passed
  if (logBuffer.length >= BUFFER_SIZE || Date.now() - lastFlush > FLUSH_INTERVAL) {
    flushLogs();
  }
}

function flushLogs() {
  if (logBuffer.length === 0) return;

  try {
    let logs: any[] = [];
    if (fs.existsSync(PAGE_LOG_PATH)) {
      logs = JSON.parse(fs.readFileSync(PAGE_LOG_PATH, 'utf-8'));
    }

    logs.push(...logBuffer);
    logBuffer = [];
    lastFlush = Date.now();

    // Prune logs older than 1 day
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    logs = logs.filter(l => new Date(l.timestamp).getTime() > oneDayAgo);

    fs.mkdirSync(path.dirname(PAGE_LOG_PATH), { recursive: true });
    fs.writeFileSync(PAGE_LOG_PATH, JSON.stringify(logs, null, 2));
  } catch (error) {
    logger.error('Error flushing logs:', error);
  }
}

// Flush logs periodically
setInterval(flushLogs, FLUSH_INTERVAL);

app.post('/api/log', (req, res) => {
  const entry = {
    ...req.body,
    userId: req.session?.userId || req.user?.id || 'unauthenticated',
    timestamp: req.body.timestamp || new Date().toISOString(),
  };
  savePageLog(entry);
  res.status(204).end();
});

app.get('/api/logs', (req, res) => {
  // Only allow admin users
  if (!req.session?.userId && !req.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  // Optionally, check user role here if you want stricter security
  let logs: any[] = [];
  try {
    if (fs.existsSync(PAGE_LOG_PATH)) {
      logs = JSON.parse(fs.readFileSync(PAGE_LOG_PATH, 'utf-8'));
    }
  } catch {}
  // Sort by timestamp descending
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(logs);
});

(async () => {
  let dbConnected = false;
  let server: Server;

  try {
    // Check database connection
    dbConnected = await checkDbConnection();
    logger.info('Database connection successful');

    // Initialize default data
    await initializeDefaultData();
  } catch (error) {
    logger.error('Database initialization error:', error);
    logger.info('Continuing with server startup despite database issues...');
  }

  try {
    // Set up traditional authentication with session management
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const PgStore = connectPg(session);
    const sessionStore = new PgStore({
      pool: pool,
      createTableIfMissing: true,
      tableName: 'session' // Using the existing session table in the database
    });

    app.use(session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production-' + Math.random().toString(36),
      resave: false,
      saveUninitialized: false,
      name: 'sessionId', // Change default session name
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: sessionTtl,
        sameSite: 'strict' // CSRF protection
      }
    }));

    // Session security middleware
    app.use(sessionSecurity);

    // Setup passport for authentication
    app.use(passport.initialize());
    app.use(passport.session());

    // Clear request cache between requests
    app.use((req, res, next) => {
      // Clear the request cache to prevent memory leaks and ensure fresh lookups
      if (storage.clearRequestCache) {
        storage.clearRequestCache();
      }
      next();
    });

    app.use(attachUser);

    // Serialize/deserialize user for session management
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: any, done) => {
      try {
        // Convert id to number if it's a string
        const userId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (isNaN(userId)) {
          // If we can't get a valid number, report the error
          logger.error(`Invalid user ID during deserialize: ${id} (type: ${typeof id})`);
          return done(new Error('Invalid user ID'), null);
        }

        const user = await storage.getUser(userId);
        if (!user) {
          logger.warn(`User not found during deserialize: ${userId}`);
          return done(null, null);
        }

        // Removed excessive logging for normal passport deserialization
        done(null, user);
      } catch (err) {
        logger.error(`Error during user deserialization: ${err instanceof Error ? err.message : String(err)}`);
        done(err, null);
      }
    });

    logger.info('Traditional authentication system configured successfully');

    // Add health check endpoint
    app.get('/api/health', async (req, res) => {
      const dbStatus = await checkDbConnection().catch(() => false);
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbStatus ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        auth: 'traditional'
      });
    });

    // Setup uploads directory and log
    // Modified to serve from 'public/uploads' to align with communication file uploads
    const publicUploadsDir = path.join(process.cwd(), 'public/uploads');
    app.use('/uploads', express.static(publicUploadsDir));
    logger.info(`Serving static files from /uploads mapped to ${publicUploadsDir}`);

    // Setup routes
    server = await registerRoutes(app); // This initializes communicationService

    // Connect WAF engine to management routes
    const { setWAFEngine } = await import('./routes/waf-routes');
    setWAFEngine(wafEngine);
    logger.info('WAF engine connected to management routes');

    // --- WebSocket Upgrade Handling with Session Authentication ---
    // Retrieve the session middleware. It's configured above with app.use(session(...))
    // For clarity and direct use, we define it here again with the same config.
    // NOTE: Ensure this configuration is identical to the one used by app.use(session(...))
    const sessionMiddleware = session({
      store: new (connectPg(session))({ // Re-create store for this usage if not easily accessible
        pool: pool,
        createTableIfMissing: true,
        tableName: 'session'
      }),
      secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production-' + Math.random().toString(36),
      resave: false,
      saveUninitialized: false,
      name: 'sessionId',
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // Must match main session config
        sameSite: 'strict'
      }
    });

    const communicationServiceInstance = app.locals.communicationService; // Assuming it's stored in app.locals by registerRoutes

    if (communicationServiceInstance) {
      server.on('upgrade', (request, socket, head) => {
        // Only handle upgrades to the specific WebSocket path
        if (request.url === '/api/ws') {
          logger.debug(`[WS Upgrade] Attempting upgrade for path: ${request.url}`);
          sessionMiddleware(request as any, {} as any, () => { // Apply session middleware
            const reqWithSession = request as any; // Cast to access session property
            if (!reqWithSession.session || !reqWithSession.session.passport || !reqWithSession.session.passport.user) {
              logger.warn('[WS Upgrade] Unauthorized: No session or user found. Destroying socket.');
              socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
              socket.destroy();
              return;
            }

            const userId = reqWithSession.session.passport.user;
            logger.debug(`[WS Upgrade] Authorized for userId: ${userId}. Proceeding with WSS handleUpgrade.`);

            communicationServiceInstance.getWss().handleUpgrade(request, socket, head, (ws: any) => {
              ws.authenticatedUserId = userId; // Attach authenticated user ID
              communicationServiceInstance.getWss().emit('connection', ws, request);
            });
          });
        } else {
          // For other paths, you might want to destroy the socket or let other handlers (if any) take over
          logger.debug(`[WS Upgrade] Path ${request.url} not handled by this upgrade handler. Destroying socket.`);
          socket.destroy();
        }
      });
      logger.info('WebSocket upgrade handler configured with session authentication for /api/ws');
    } else {
      logger.error('CommunicationService instance not found. WebSocket upgrade handling will not work.');
    }

    // --- Error Handling Pipeline (MUST be registered after all routes) ---

    // 1. Log errors to database
    // This middleware should call next(err) to pass the error to the next handler.
    app.use(ErrorLogger.createErrorMiddleware());

    // 2. Log to console/file and send response to client (final step)
    app.use(finalErrorHandler);

    // Setup Vite for development or static files for production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server with port fallback mechanism
    // Use port 5000 as recommended for Replit web applications
    const startPort = parseInt(process.env.PORT || "5000");
    const maxPortAttempts = 15;
    let port = startPort;
    let serverStarted = false;

    // Try multiple ports in sequence
    for (let attempt = 0; attempt < maxPortAttempts && !serverStarted; attempt++) {
      const portToTry = startPort + attempt;
      try {
        await new Promise<void>((resolve, reject) => {
          // Set up error and listening event handlers
          const errorHandler = (err: any) => {
            server.removeListener('listening', listeningHandler);
            if (err.code === 'EADDRINUSE') {
              logger.info(`Port ${portToTry} is in use, trying next port...`);
              resolve(); // Continue to next port
            } else {
              reject(err); // Propagate other errors
            }
          };

          const listeningHandler = () => {
            server.removeListener('error', errorHandler);
            port = portToTry;
            serverStarted = true;
            resolve();
          };

          server.once('error', errorHandler);
          server.once('listening', listeningHandler);

          // Try binding to the port
          server.listen({
            port: portToTry,
            host: "0.0.0.0",
          });
        });

        if (serverStarted) break;
      } catch (err) {
        logger.error(`Error starting server on port ${portToTry}:`, err);
      }
    }

    if (serverStarted) {
      logger.info(`Server is running on port ${port}`);
    } else {
      logger.error(`Failed to start server after ${maxPortAttempts} attempts. Please restart the application.`);
      process.exit(1); // Exit with error code
    }
  } catch (error) {
    logger.error('Fatal server error:', error);
    process.exit(1);
  }
})();

// This middleware is now handled by the consolidated request logging above