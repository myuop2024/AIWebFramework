import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // TODO: [SECURITY-CRITICAL] Refactor client-side styling to remove 'unsafe-inline' from styleSrc.
      // This is crucial for mitigating XSS risks. Strategies include:
      // 1. Moving all inline styles (style="..." attributes) to external CSS files.
      // 2. For dynamic styles, use JavaScript to set styles directly on element.style properties instead of injecting style tags or attributes.
      // 3. If a component library generates inline styles, investigate its CSP compatibility options or consider alternatives.
      // 4. As a last resort for specific cases, use CSP hashes or nonces for individual inline style blocks if the templating engine supports it.
      // See issue #XYZ (if a tracking system is in use) or link to relevant documentation.
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"], // 'data:' for inline images, 'blob:' for object URLs from client-side processing
      // TODO: [SECURITY-CRITICAL] Refactor client-side scripts to remove 'unsafe-inline' from scriptSrc.
      // This is paramount for preventing XSS. Strategies include:
      // 1. Moving all inline <script> tags and inline event handlers (e.g., onclick="...") to external .js files.
      // 2. Using JavaScript to add event listeners programmatically (element.addEventListener(...)).
      // 3. If using a modern frontend framework, ensure its build process generates CSP-compatible code (often the default).
      // 4. For unavoidable inline scripts, use CSP hashes or nonces if the server-side templating/rendering supports dynamic nonce generation.
      // Note: 'https:' is very broad for scriptSrc. If possible, list specific trusted CDNs or script sources instead.
      // See issue #ABC (if a tracking system is in use) or link to relevant documentation.
      scriptSrc: ["'self'", "'unsafe-inline'", "https:"], // Removed 'unsafe-eval'. Preserved "https:" to allow scripts from any HTTPS source if needed by CDNs etc.
      connectSrc: ["'self'", "https:", "wss:", "ws:"], // Allow connections to self, any HTTPS, and WebSockets
      frameSrc: ["'self'", "https://www.youtube.com"], // Allow embedding YouTube videos
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility with some features
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
export const corsConfig = cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3100'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
});

// Rate limiting configurations
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Too many login attempts from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 500 : 60, // Higher limit for development
  message: {
    error: 'API rate limit exceeded, please slow down.',
    retryAfter: '1 minute'
  }
});

// Input validation middleware
export const validateInput = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Input validation failed', {
        errors: errors.array(),
        path: req.path,
        ip: req.ip
      });
      return res.status(400).json({
        error: 'Invalid input data',
        details: errors.array()
      });
    }
    next();
  };
};

// Common validation rules
export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required')
];

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /data:text\/html/i  // Data URI XSS
  ];

  const userInput = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userInput));

  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      input: userInput
    });
  }

  next();
};

// Session security middleware
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Regenerate session ID on login to prevent session fixation
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Session regeneration failed', err);
        return next(err);
      }
      next();
    });
  } else {
    next();
  }
}; 