/**
 * Main application file for the Didit.me integration
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs-extra');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');

// Import routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const verificationRoutes = require('./routes/verification');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
fs.ensureDirSync(path.join(__dirname, 'data'));

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || 'your-session-secret-change-me-in-production';
const defaultSessionSecret = 'your-session-secret-change-me-in-production';

if (sessionSecret === defaultSessionSecret && process.env.NODE_ENV === 'production') {
  const errorMessage = 'CRITICAL: Default SESSION_SECRET is being used in a production environment for Didit.me integration. This is insecure. Please set a strong, unique SESSION_SECRET environment variable.';
  console.error(errorMessage); // Use console.error as logger might not be set up yet or is basic
  throw new Error(errorMessage); // Halt startup
} else if (sessionSecret === defaultSessionSecret) {
  console.warn('WARNING: Using default SESSION_SECRET for Didit.me integration. This is insecure and should ONLY be used for development/testing. Set a proper SESSION_SECRET environment variable for production.');
}

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up view engine for simple pages
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/', verificationRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Didit.me Integration',
    isAuthenticated: !!req.session.userId,
    isAdmin: !!req.session.isAdmin
  });
});

// Admin panel
app.get('/admin/settings', (req, res) => {
  res.render('admin-settings', { 
    title: 'Admin Settings',
    isAuthenticated: !!req.session.userId,
    isAdmin: !!req.session.isAdmin
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Page Not Found',
    error: 'Page not found',
    details: 'The requested page does not exist'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).render('error', { 
    title: 'Server Error',
    error: 'Server error',
    details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`- Admin panel: http://localhost:${PORT}/admin/settings`);
    console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;