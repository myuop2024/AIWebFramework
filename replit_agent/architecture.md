# Architecture Overview

## 1. Overview

The CAFFE Observer Platform is a full-stack web application designed for election monitoring. It allows election observers to register, undergo training, receive assignments to polling stations, submit reports, and communicate with administrators. The system provides comprehensive election observation functionality with real-time communication and reporting capabilities.

The application follows a client-server architecture with:
- A TypeScript/React frontend (Single-Page Application)
- A Node.js/Express backend
- PostgreSQL database (via Neon's serverless offering)
- WebSocket support for real-time communication

## 2. System Architecture

### Frontend Architecture

The frontend is built as a Single-Page Application (SPA) using React and follows modern patterns:

- **Routing**: Uses the `wouter` library for client-side routing
- **State Management**: Uses React Query for server state and local React state for UI state
- **Styling**: Uses Tailwind CSS with shadcn/ui component library
- **TypeScript**: Strong typing throughout the application
- **API Communication**: Custom fetch wrapper with React Query for data fetching and caching

### Backend Architecture

The backend is a Node.js/Express application written in TypeScript:

- **API Layer**: RESTful API endpoints for client interaction
- **Authentication**: Session-based authentication with PostgreSQL session store
- **Database Access**: Uses Drizzle ORM for database operations
- **WebSockets**: Implements a WebSocket server for real-time communication
- **File Storage**: Handles document uploads and storage

### Database Architecture

The application uses PostgreSQL with Drizzle ORM:

- **ORM**: Drizzle ORM for type-safe database access
- **Connection**: Neon serverless PostgreSQL for cloud-based database
- **Schema**: Structured to handle users, polling stations, assignments, reports, etc.
- **Session Storage**: Uses the database to store user sessions

## 3. Key Components

### Frontend Components

1. **Authentication Module**
   - Login, registration, and password reset
   - Session management

2. **Observer Dashboard**
   - Overview of assignments, reports, notifications
   - Quick access to key functions

3. **Reporting System**
   - Form-based submission of election observations
   - Support for attachments and location data

4. **Assignment Management**
   - View and manage polling station assignments
   - Check-in/check-out functionality

5. **Training Module**
   - Observer training materials and tests
   - Verification of training completion

6. **Communication System**
   - Real-time chat functionality
   - Notifications and alerts

7. **Profile Management**
   - User profile and document management
   - Verification status

### Backend Components

1. **Authentication Service**
   - User registration, login, and session management
   - Role-based access control

2. **Data Access Layer**
   - Database operations through Drizzle ORM
   - Connection pooling and error handling

3. **API Endpoints**
   - RESTful endpoints for client operations
   - Input validation and error handling

4. **WebSocket Server**
   - Real-time messaging
   - Status updates and notifications

5. **File Handling**
   - Document upload and storage
   - Possible OCR processing for uploaded documents

6. **Admin Operations**
   - User verification and management
   - System statistics and monitoring

### Database Schema

The database schema includes these key tables:

1. **Users** - Observer information and authentication
2. **User Profiles** - Extended user information for KYC
3. **Documents** - User verification documents
4. **Polling Stations** - Election locations
5. **Assignments** - Observer assignments to polling stations
6. **Reports** - Election observations from observers
7. **Events** - Training or other observer events
8. **Messages** - Communication between users

## 4. Data Flow

### Authentication Flow

1. User registers or logs in via the client
2. Server validates credentials and creates a session
3. Session ID is stored in a cookie
4. Subsequent requests include the session cookie for authentication

### Reporting Flow

1. Observer selects "New Report" in the client
2. Client loads form template data
3. Observer fills out report with observations
4. Report is submitted to the server
5. Server validates and stores the report
6. Notifications may be triggered for critical reports

### Assignment Flow

1. Admin creates assignments for observers
2. Observers receive notifications of new assignments
3. Observers check in when arriving at polling stations
4. Observers submit reports during their assignment
5. Observers check out when leaving polling stations

### Communication Flow

1. Users connect to WebSocket server on login
2. Server maintains a list of connected clients
3. Messages are sent to specific users or broadcast as needed
4. Real-time notifications are delivered through WebSockets

## 5. External Dependencies

### Frontend Dependencies

- **React** - UI library
- **React Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - UI component library based on Radix UI
- **wouter** - Client-side routing
- **Lucide React** - Icon library

### Backend Dependencies

- **Express** - Web server framework
- **Drizzle ORM** - Database ORM
- **Neon serverless** - PostgreSQL client
- **express-session** - Session management
- **ws** - WebSocket implementation
- **zod** - Schema validation
- **multer** - File upload handling

### Third-Party Services

- **Neon Database** - Serverless PostgreSQL
- **Possible OCR services** - For document verification

## 6. Deployment Strategy

The application is designed to be deployed on modern cloud platforms:

### Development Environment

- Uses Vite for frontend development with HMR
- Configured for Replit development environment
- Uses TypeScript with ESM modules

### Production Build

- Frontend: Vite builds static assets
- Backend: esbuild bundles the server code
- Combined into a single deployable package

### Deployment Targets

- Configured for Replit deployment
- Environment variables for database connections
- Autoscaling deployment configuration

### Database Management

- Migrations handled through Drizzle Kit
- Connection pooling for efficient database access
- Environment-based configuration

## 7. Security Considerations

- Session-based authentication with secure cookies
- Role-based access control for administrative functions
- Input validation with Zod schema validation
- PostgreSQL for reliable data storage
- Document verification workflow for observer onboarding

## 8. Future Extensibility

The architecture is designed to be extensible:

- Component-based UI for easy feature additions
- API-based backend allowing for future mobile clients
- Schema design supporting additional election-related data
- WebSocket infrastructure for real-time features