# Didit.me Identity Verification Integration

A Node.js integration for the Didit.me Identity Verification service, demonstrating how to implement a secure verification flow.

## Features

- OAuth2-based identity verification
- Secure session management
- Admin panel for configuration settings
- User verification status tracking
- Persistent configuration and user data storage

## Prerequisites

- Node.js 14+
- A Didit.me developer account and credentials

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd didit-integration
npm install
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Edit the `.env` file and add your Didit.me credentials and **critically, a strong `DIDIT_CONFIG_ENCRYPTION_KEY`**.

## Configuration

### Didit.me Credentials

You need to register your application with Didit.me to get the required OAuth2 credentials:

1. Create a developer account at Didit.me
2. Register a new OAuth2 application
3. Set the redirect URI to `http://localhost:3001/verification-callback` (or your custom URL)
4. Copy the Client ID and Client Secret to your `.env` file (or configure them via the admin UI).

### **CRITICAL SECURITY NOTE: Encryption Key**

The `didit-integration` module encrypts sensitive configuration (like the Didit.me Client Secret) at rest in the `data/config.json` file. To do this, it requires a strong encryption key.

**You MUST set the `DIDIT_CONFIG_ENCRYPTION_KEY` environment variable in your production environment.**

- This key should be a unique, randomly generated string, ideally 32 bytes (256 bits) long. You can generate one using a command like `openssl rand -hex 32`.
- **DO NOT use the default development fallback key in production.** The application will warn or fail to start if this key is not set in production.
- This key must be kept secret and managed securely. Loss of this key will mean inability to decrypt existing stored secrets.

### Admin Access

Default admin credentials:
- Username: `admin`
- Password: `admin123`

**Important:** Change these credentials immediately after first setup, especially in production! You can do this by manually editing the `data/admin.json` file (password should be a bcrypt hash) or by implementing an admin password change feature.

## Usage

### Starting the Application

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Verification Flow

1. User logs in or registers
2. User clicks "Get Verified" button
3. User is redirected to Didit.me's verification service
4. User completes verification steps on Didit.me
5. User is redirected back to the application
6. Verification status is stored and displayed

### Admin Panel

Access the admin panel at `/admin/settings` to:
- Configure Didit.me OAuth2 credentials
- View and manage users
- Test the verification flow configuration

## Project Structure

- `/models` - Data models and storage
- `/routes` - Express routes
- `/services` - Business logic
- `/utils` - Utility functions
- `/views` - EJS templates
- `/public` - Static assets
- `/data` - Data storage (JSON files)

## Security Considerations

- Client secrets are encrypted at rest (requires secure `DIDIT_CONFIG_ENCRYPTION_KEY`).
- CSRF protection with state parameters.
- Session management with secure cookies (requires secure `SESSION_SECRET`).
- Input validation.
- Sensitive data sanitization.

## License

MIT
