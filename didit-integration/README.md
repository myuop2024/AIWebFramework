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

4. Edit the `.env` file and add your Didit.me credentials

## Configuration

### Didit.me Credentials

You need to register your application with Didit.me to get the required OAuth2 credentials:

1. Create a developer account at Didit.me
2. Register a new OAuth2 application
3. Set the redirect URI to `http://localhost:3000/verification-callback` (or your custom URL)
4. Copy the Client ID and Client Secret to your `.env` file

### Admin Access

Default admin credentials:
- Username: `admin`
- Password: `admin123`

**Important:** Change these credentials in production!

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

- Client secrets are encrypted at rest
- CSRF protection with state parameters
- Session management with secure cookies
- Input validation
- Sensitive data sanitization

## License

MIT
