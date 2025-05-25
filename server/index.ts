import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, checkDbConnection } from "./db";
import { IdCardService } from "./services/id-card-service";
import { storage } from "./storage";
import path from "path";
import { requestLogger, errorMonitor } from "./middleware/error-monitoring";
import logger from "./utils/logger";
import { attachUser } from "./middleware/auth";
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

const app = express();

// Security middleware - apply early
app.use(securityHeaders);
app.use(corsConfig);
app.use(securityLogger);

// Rate limiting
app.use('/api/auth', authRateLimit);
app.use('/api', apiRateLimit);
app.use(generalRateLimit);

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

// Apply error monitoring middleware
app.use(requestLogger);

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

// --- Enhanced request logging middleware ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.session?.userId || 'unauthenticated',
      userAgent: req.headers['user-agent']
    });
  });
  next();
});

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

// Global error handlers for all uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  logger.critical('Uncaught Exception', err);
  process.exit(1); // Optional: restart process
});

process.on('unhandledRejection', (reason: any) => {
  logger.critical('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)));
});

const PAGE_LOG_PATH = path.join(process.cwd(), 'logs', 'page-logs.json');

function savePageLog(entry: any) {
  let logs: any[] = [];
  try {
    if (fs.existsSync(PAGE_LOG_PATH)) {
      logs = JSON.parse(fs.readFileSync(PAGE_LOG_PATH, 'utf-8'));
    }
  } catch {}
  logs.push(entry);
  // Prune logs older than 1 day
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  logs = logs.filter(l => new Date(l.timestamp).getTime() > oneDayAgo);
  fs.mkdirSync(path.dirname(PAGE_LOG_PATH), { recursive: true });
  fs.writeFileSync(PAGE_LOG_PATH, JSON.stringify(logs, null, 2));
}

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
    console.log('Database connection successful');
    
    // Initialize default data
    await initializeDefaultData();
  } catch (error) {
    console.error('Database initialization error:', error);
    console.log('Continuing with server startup despite database issues...');
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
        
        logger.debug(`Deserialized user ${userId} successfully`);
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
    const uploadsDir = path.join(process.cwd(), 'uploads');
    app.use('/uploads', express.static(uploadsDir));
    console.log(`Serving static files from: ${uploadsDir}`);
    
    // Setup routes
    server = await registerRoutes(app);

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

    // Setup Vite for development or static files for production
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server with port fallback mechanism
    // Using alternative port since 5000 seems to be in use
    const startPort = parseInt(process.env.PORT || "3100");
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
              console.log(`Port ${portToTry} is in use, trying next port...`);
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
        console.error(`Error starting server on port ${portToTry}:`, err);
      }
    }
    
    if (serverStarted) {
      console.log(`Server is running on port ${port}`);
    } else {
      console.error(`Failed to start server after ${maxPortAttempts} attempts. Please restart the application.`);
      process.exit(1); // Exit with error code
    }
  } catch (error) {
    console.error('Fatal server error:', error);
    process.exit(1);
  }
})();

app.use((req, res, next) => {
  const userId = req.session?.userId || req.user?.id || 'unauthenticated';
  const start = Date.now();
  let errorMsg = null;

  // Capture errors
  res.on('error', (err) => {
    errorMsg = err?.message || String(err);
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const entry: any = {
      type: 'api_call',
      method: req.method,
      path: req.originalUrl,
      userId,
      query: req.query,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || req.headers['referrer'],
      status: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    };
    // Log request body for POST/PUT/PATCH, but exclude password fields
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '[REDACTED]';
      if (safeBody.newPassword) safeBody.newPassword = '[REDACTED]';
      if (safeBody.currentPassword) safeBody.currentPassword = '[REDACTED]';
      entry.body = safeBody;
    }
    if (errorMsg) entry.error = errorMsg;
    savePageLog(entry);
    console.log(`[API CALL] ${req.method} ${req.originalUrl} - User: ${userId} - Status: ${res.statusCode} - ${duration}ms`);
  });
  next();
});
