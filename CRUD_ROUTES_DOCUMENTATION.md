# CRUD Routes Documentation

This document describes the comprehensive CRUD (Create, Read, Update, Delete) routes that have been implemented to replace the mock endpoints and provide full data management capabilities.

## Overview

The following route files have been created to handle different data entities:

- `server/routes/news-routes.ts` - News management
- `server/routes/events-routes.ts` - Events and event participation
- `server/routes/reports-routes.ts` - Observer reports
- `server/routes/assignments-routes.ts` - User assignments to polling stations
- `server/routes/users-routes.ts` - User profile management

## News Routes (`/api/news`)

### Endpoints

- `GET /api/news` - Get all news with pagination and filtering
  - Query params: `page`, `limit`, `category`, `search`, `published`
  - Returns: Paginated news list with metadata

- `GET /api/news/latest` - Get latest published news (for dashboard)
  - Query params: `limit` (default: 5)
  - Returns: Array of latest news items

- `GET /api/news/external` - Get external Jamaican political news
  - Query params: `days` (default: 7)
  - Returns: External news from news service

- `GET /api/news/categories` - Get all news categories
  - Returns: Array of category strings

- `GET /api/news/:id` - Get single news item
  - Returns: News item with full details

- `POST /api/news` - Create new news item
  - Body: `{ title, content, category, isPublished }`
  - Returns: Created news item

- `PUT /api/news/:id` - Update news item
  - Body: `{ title?, content?, category?, isPublished? }`
  - Returns: Updated news item

- `DELETE /api/news/:id` - Delete news item
  - Returns: Success message

- `POST /api/news/:id/publish` - Toggle publish status
  - Returns: Updated news item

### Features

- Full text search across title and content
- Category filtering
- Publish/unpublish functionality
- Integration with external news service
- Content integrity with SHA-256 hashing
- Comprehensive logging

## Events Routes (`/api/events`)

### Endpoints

- `GET /api/events` - Get all events with pagination and filtering
  - Query params: `page`, `limit`, `eventType`, `location`, `startDate`, `endDate`, `upcoming`
  - Returns: Paginated events list

- `GET /api/events/upcoming` - Get upcoming events (for dashboard)
  - Query params: `limit` (default: 5)
  - Returns: Array of upcoming events

- `GET /api/events/types` - Get all event types
  - Returns: Array of event type strings

- `GET /api/events/:id` - Get single event with participants
  - Returns: Event details with participant list

- `POST /api/events` - Create new event
  - Body: `{ title, description, eventType, location, startTime, endTime? }`
  - Returns: Created event

- `PUT /api/events/:id` - Update event
  - Body: Event fields to update
  - Returns: Updated event

- `DELETE /api/events/:id` - Delete event (cascades to participants)
  - Returns: Success message

- `POST /api/events/:id/register` - Register user for event
  - Body: `{ userId }`
  - Returns: Registration record

- `PUT /api/events/:id/participants/:userId` - Update participant status
  - Body: `{ status?, completionStatus?, certificateUrl? }`
  - Returns: Updated participation record

- `DELETE /api/events/:id/participants/:userId` - Remove participant
  - Returns: Success message

- `GET /api/events/:id/participants` - Get event participants
  - Returns: Array of participants with user details

### Features

- Event type categorization
- Location-based filtering
- Date range filtering
- Participant management
- Certificate tracking
- Completion status tracking

## Reports Routes (`/api/reports`)

### Endpoints

- `GET /api/reports` - Get all reports with pagination and filtering
  - Query params: `page`, `limit`, `status`, `reportType`, `userId`, `stationId`, `search`
  - Returns: Paginated reports with user and station info

- `GET /api/reports/stats` - Get report statistics
  - Query params: `userId?`
  - Returns: Statistics by status and type

- `GET /api/reports/types` - Get all report types
  - Returns: Array of report type strings

- `GET /api/reports/:id` - Get single report with full details
  - Returns: Report with station, user, and template info

- `POST /api/reports` - Create new report
  - Body: `{ userId, stationId, templateId?, reportType, content, checkinTime?, checkoutTime? }`
  - Returns: Created report

- `PUT /api/reports/:id` - Update report
  - Body: Report fields to update
  - Returns: Updated report

- `POST /api/reports/:id/review` - Review report (admin/supervisor)
  - Body: `{ status, reviewedBy }`
  - Returns: Updated report

- `DELETE /api/reports/:id` - Delete report
  - Returns: Success message

- `GET /api/reports/user/:userId` - Get reports for specific user
  - Query params: `page`, `limit`, `status`
  - Returns: Paginated user reports

### Features

- Multi-field search functionality
- Status-based filtering
- Content integrity with SHA-256 hashing
- Review workflow
- Check-in/check-out time tracking
- Template integration

## Assignments Routes (`/api/assignments`)

### Endpoints

- `GET /api/assignments` - Get all assignments with pagination and filtering
  - Query params: `page`, `limit`, `status`, `userId`, `stationId`, `role`, `startDate`, `endDate`
  - Returns: Paginated assignments with user and station info

- `GET /api/assignments/stats` - Get assignment statistics
  - Query params: `userId?`
  - Returns: Statistics by status and role

- `GET /api/assignments/active` - Get active assignments
  - Query params: `userId?`
  - Returns: Currently active assignments

- `GET /api/assignments/:id` - Get single assignment with full details
  - Returns: Assignment with user and station details

- `POST /api/assignments` - Create new assignment
  - Body: `{ userId, stationId, isPrimary?, startDate, endDate, notes?, checkInRequired?, role?, priority? }`
  - Returns: Created assignment
  - Features: Capacity checking

- `PUT /api/assignments/:id` - Update assignment
  - Body: Assignment fields to update
  - Returns: Updated assignment

- `POST /api/assignments/:id/checkin` - Check in to assignment
  - Returns: Updated assignment with check-in time

- `POST /api/assignments/:id/checkout` - Check out from assignment
  - Returns: Updated assignment with check-out time

- `DELETE /api/assignments/:id` - Delete assignment
  - Returns: Success message

- `GET /api/assignments/user/:userId` - Get assignments for specific user
  - Query params: `page`, `limit`, `status`
  - Returns: Paginated user assignments

- `GET /api/assignments/station/:stationId` - Get assignments for specific station
  - Query params: `status`
  - Returns: Station assignments with user details

### Features

- Station capacity management
- Role-based assignments
- Priority system
- Check-in/check-out tracking
- Date range validation
- Primary/secondary observer designation

## Users Routes (`/api/users`)

### Endpoints

- `GET /api/users/profile` - Get current user profile (for dashboard)
  - Query params: `userId?` (temporary for testing)
  - Returns: User profile with statistics

- `GET /api/users` - Get all users with pagination and filtering
  - Query params: `page`, `limit`, `role`, `verificationStatus`, `trainingStatus`, `search`
  - Returns: Paginated users list

- `GET /api/users/stats` - Get user statistics
  - Returns: Statistics by role, verification, and training status

- `GET /api/users/:id` - Get single user with full profile
  - Returns: User with complete profile information

- `PUT /api/users/:id` - Update user
  - Body: User fields to update
  - Returns: Updated user

- `GET /api/users/:id/assignments` - Get user assignments
  - Query params: `status`, `limit`
  - Returns: User assignments with station info

- `GET /api/users/:id/reports` - Get user reports
  - Query params: `status`, `limit`
  - Returns: User reports with station info

- `POST /api/users/:id/verify` - Verify user (admin)
  - Body: `{ verificationStatus, verifiedBy }`
  - Returns: Updated user

- `GET /api/users/search` - Search users
  - Query params: `q` (search query), `limit`
  - Returns: Matching users

### Features

- Multi-field search
- Role-based filtering
- Verification workflow
- Training status tracking
- Profile statistics
- Related data aggregation

## Database Integration

All routes use Drizzle ORM for database operations with:

- Type-safe queries
- Proper error handling
- Transaction support where needed
- Optimized joins for related data
- Pagination support
- Comprehensive logging

## Security Features

- Input validation using Zod schemas
- SQL injection prevention through parameterized queries
- Content integrity verification
- Comprehensive audit logging
- Error handling without data leakage

## Error Handling

All routes include:

- Proper HTTP status codes
- Descriptive error messages
- Comprehensive logging
- Graceful failure handling
- Input validation

## Usage Examples

### Creating a News Item

```javascript
POST /api/news
{
  "title": "Election Update",
  "content": "Important election information...",
  "category": "election",
  "isPublished": true
}
```

### Getting Upcoming Events

```javascript
GET /api/events/upcoming?limit=5
```

### Creating an Assignment

```javascript
POST /api/assignments
{
  "userId": "user123",
  "stationId": 45,
  "startDate": "2024-07-01T08:00:00Z",
  "endDate": "2024-07-01T18:00:00Z",
  "role": "observer",
  "isPrimary": true
}
```

### Searching Users

```javascript
GET /api/users/search?q=john&limit=10
```

## Migration from Mock Endpoints

The following mock endpoints have been replaced:

- `/api/events/upcoming` → Enhanced with full event management
- `/api/users/profile` → Enhanced with statistics and full profile
- `/api/reports` → Full CRUD operations
- `/api/users/assignments` → Enhanced assignment management
- `/api/news/latest` → Part of comprehensive news management

## Next Steps

1. **Authentication Integration**: Add proper authentication middleware to secure endpoints
2. **Role-Based Access Control**: Implement fine-grained permissions
3. **File Upload Support**: Add file attachment capabilities for reports
4. **Real-time Updates**: Implement WebSocket support for live updates
5. **API Documentation**: Generate OpenAPI/Swagger documentation
6. **Testing**: Add comprehensive unit and integration tests
7. **Caching**: Implement Redis caching for frequently accessed data
8. **Rate Limiting**: Add endpoint-specific rate limiting
9. **Data Validation**: Enhance validation rules based on business requirements
10. **Monitoring**: Add performance monitoring and alerting 