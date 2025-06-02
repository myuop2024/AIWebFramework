import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import logger from '../utils/logger';

// WAF Configuration
export interface WAFConfig {
  enableRateLimit: boolean;
  enableSQLInjectionProtection: boolean;
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
  enableIPWhitelist: boolean;
  enableGeoblocking: boolean;
  allowedCountries: string[];
  blockedIPs: string[];
  allowedIPs: string[];
  maxRequestsPerWindow: number;
  windowMs: number;
}

const defaultWAFConfig: WAFConfig = {
  enableRateLimit: true,
  enableSQLInjectionProtection: true,
  enableXSSProtection: true,
  enableCSRFProtection: true,
  enableIPWhitelist: false,
  enableGeoblocking: false,
  allowedCountries: ['US', 'CA', 'GB', 'JM'], // Jamaica and common countries
  blockedIPs: [],
  allowedIPs: [],
  maxRequestsPerWindow: 100,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// SQL Injection patterns
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*\b(FROM|INTO|SET|WHERE|TABLE)\b)/i,
  /(\'.*\bOR\b.*\'|\".*\bOR\b.*\")/i,
  /(\bUNION\b.*\bSELECT\b|\bDROP\b.*\bTABLE\b)/i,
  /(--.*\w|\/\*.*\*\/.*\w)/i
];

// XSS patterns
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
];

// Path traversal patterns
const pathTraversalPatterns = [
  /\.\.\//g,
  /\.\.\\+/g,
  /%2e%2e%2f/gi,
  /%252e%252e%252f/gi,
  /\.\.\\/g,
];

// Check for command injection patterns (excluding development patterns)
const commandInjectionPatterns = [
  /[;&|`$(){}[\]]/,  // Command separators and substitution
  /\b(exec|eval|system|shell_exec|passthru|wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/i,
];

// Whitelist for legitimate paths that might trigger false positives
const WHITELIST_PATTERNS = [
  /^\/api\/health$/,
  /^\/api\/status$/,
  /^\/favicon\.ico$/,
  /^\/static\//,
  /^\/assets\//,
  /^\/uploads\//,
  /^\/public\//,
  /^\/src\/components\//,
  /^\/src\/.*\.tsx?$/,
  /^\/src\/.*\.jsx?$/,
  /^\/node_modules\//,
  /\.map$/
];

class WAFEngine {
  private config: WAFConfig;
  private rateLimiter: any;
  private suspiciousActivity: Map<string, { count: number; lastSeen: number }>;
  private blockedIPs: Set<string>;

  constructor(config: Partial<WAFConfig> = {}) {
    this.config = { ...defaultWAFConfig, ...config };
    this.suspiciousActivity = new Map();
    this.blockedIPs = new Set(this.config.blockedIPs);

    // Initialize rate limiter
    if (this.config.enableRateLimit) {
      this.rateLimiter = rateLimit({
        windowMs: this.config.windowMs,
        max: this.config.maxRequestsPerWindow,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          this.logSecurityEvent('RATE_LIMIT_EXCEEDED', req, 'Rate limit exceeded');
          res.status(429).json({
            error: 'Too many requests',
            message: 'Rate limit exceeded, please try again later.',
            retryAfter: Math.ceil(this.config.windowMs / 1000)
          });
        }
      });
    }

    // Clean up suspicious activity map every hour
    setInterval(() => {
      const now = Date.now();
      for (const [ip, activity] of this.suspiciousActivity.entries()) {
        if (now - activity.lastSeen > 3600000) { // 1 hour
          this.suspiciousActivity.delete(ip);
        }
      }
    }, 3600000);
  }

  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    const remoteAddr = req.connection?.remoteAddress;

    return forwarded?.split(',')[0]?.trim() || 
           realIP || 
           remoteAddr || 
           req.ip || 
           'unknown';
  }

  private logSecurityEvent(
    eventType: string, 
    req: Request, 
    details: string, 
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ) {
    const clientIP = this.getClientIP(req);
    const logData = {
      eventType,
      severity,
      clientIP,
      userAgent: req.headers['user-agent'],
      url: req.originalUrl,
      method: req.method,
      details,
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.id || 'anonymous'
    };

    logger.warn(`WAF Security Event [${severity}]: ${eventType}`, logData);

    // Track suspicious activity
    if (clientIP !== 'unknown') {
      const activity = this.suspiciousActivity.get(clientIP) || { count: 0, lastSeen: 0 };
      activity.count++;
      activity.lastSeen = Date.now();
      this.suspiciousActivity.set(clientIP, activity);

      // Auto-block IP after multiple violations
      if (activity.count >= 10 && severity === 'HIGH') {
        this.blockedIPs.add(clientIP);
        logger.error(`WAF: Auto-blocked IP ${clientIP} due to repeated violations`, logData);
      }
    }
  }

  private checkIPWhitelist(req: Request): boolean {
    if (!this.config.enableIPWhitelist || this.config.allowedIPs.length === 0) {
      return true;
    }

    const clientIP = this.getClientIP(req);
    return this.config.allowedIPs.includes(clientIP);
  }

  private checkIPBlacklist(req: Request): boolean {
    const clientIP = this.getClientIP(req);
    return this.blockedIPs.has(clientIP) || this.config.blockedIPs.includes(clientIP);
  }

  private checkSQLInjection(input: string): boolean {
    return sqlInjectionPatterns.some(pattern => pattern.test(input));
  }

  private checkXSS(input: string): boolean {
    return xssPatterns.some(pattern => pattern.test(input));
  }

  private checkPathTraversal(input: string): boolean {
    return pathTraversalPatterns.some(pattern => pattern.test(input));
  }

  private checkCommandInjection(input: string): boolean {
    // Skip command injection checks for development-related URLs
    const devPatterns = [
      /@vite\/client/,
      /\.tsx?$/,
      /\.jsx?$/,
      /src\/pages/,
      /node_modules/,
      /__vite/
    ];

    // If this looks like a development file, skip command injection check
    if (devPatterns.some(pattern => pattern.test(input))) {
      return false;
    }

    return commandInjectionPatterns.some(pattern => pattern.test(input));
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  private inspectRequest(req: Request): { threat: boolean; type: string; details: string } {
      if (WHITELIST_PATTERNS.some(pattern => pattern.test(req.originalUrl))) {
          return { threat: false, type: '', details: 'Whitelisted URL' };
      }

    const allInputs = [
      ...Object.values(req.query || {}),
      ...Object.values(req.body || {}),
      ...Object.values(req.params || {}),
      req.originalUrl
    ].filter(value => typeof value === 'string');

    for (const input of allInputs) {
      if (this.config.enableSQLInjectionProtection && this.checkSQLInjection(input)) {
        return { threat: true, type: 'SQL_INJECTION', details: `Detected SQL injection pattern in: ${input.substring(0, 100)}` };
      }

      if (this.config.enableXSSProtection && this.checkXSS(input)) {
        return { threat: true, type: 'XSS_ATTACK', details: `Detected XSS pattern in: ${input.substring(0, 100)}` };
      }

      if (this.checkPathTraversal(input)) {
        return { threat: true, type: 'PATH_TRAVERSAL', details: `Detected path traversal pattern in: ${input.substring(0, 100)}` };
      }

      if (this.checkCommandInjection(input)) {
        return { threat: true, type: 'COMMAND_INJECTION', details: `Detected command injection pattern in: ${input.substring(0, 100)}` };
      }
    }

    return { threat: false, type: '', details: '' };
  }

  // Main WAF middleware
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check IP blacklist
        if (this.checkIPBlacklist(req)) {
          this.logSecurityEvent('BLOCKED_IP', req, 'Request from blocked IP address', 'HIGH');
          return res.status(403).json({ error: 'Access denied' });
        }

        // Check IP whitelist
        if (!this.checkIPWhitelist(req)) {
          this.logSecurityEvent('IP_NOT_WHITELISTED', req, 'Request from non-whitelisted IP', 'MEDIUM');
          return res.status(403).json({ error: 'Access denied' });
        }

        // Inspect request for threats
        const inspection = this.inspectRequest(req);
        if (inspection.threat) {
          this.logSecurityEvent(inspection.type, req, inspection.details, 'HIGH');
          return res.status(400).json({
            error: 'Malicious request detected',
            message: 'Your request contains potentially harmful content.'
          });
        }

        // Sanitize inputs (optional - can be disabled for strict validation)
        if (req.body) {
          req.body = this.sanitizeInput(req.body);
        }
        if (req.query) {
          req.query = this.sanitizeInput(req.query);
        }

        next();
      } catch (error) {
        logger.error('WAF middleware error:', error);
        next(); // Continue processing on WAF error
      }
    };
  }

  // Rate limiting middleware
  rateLimitMiddleware() {
    return this.rateLimiter || ((req: Request, res: Response, next: NextFunction) => next());
  }

  // Security headers middleware
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Note: unsafe-eval needed for Vite
          connectSrc: ["'self'", "wss:", "ws:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  // Get WAF statistics
  getStats() {
    return {
      blockedIPs: Array.from(this.blockedIPs),
      suspiciousActivity: Object.fromEntries(this.suspiciousActivity),
      config: this.config
    };
  }

  // Admin methods to manage WAF
  blockIP(ip: string) {
    this.blockedIPs.add(ip);
    logger.info(`WAF: Manually blocked IP ${ip}`);
  }

  unblockIP(ip: string) {
    this.blockedIPs.delete(ip);
    logger.info(`WAF: Unblocked IP ${ip}`);
  }

  updateConfig(newConfig: Partial<WAFConfig>) {
    this.config = { ...this.config, ...newConfig };
    logger.info('WAF: Configuration updated', newConfig);
  }
}

export { WAFEngine, WAFConfig };