# FASE 7: Notification Management API Documentation

## Overview

The Notification Management API provides endpoints to retrieve, manage, and monitor rotation notifications. Notifications are automatically created by the background scheduler when rotation events occur (scheduled, completed, failed).

## Authentication

All notification endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Base URL

```
/api/notifications
```

## Endpoints

### 1. List Notifications

**GET** `/api/notifications`

Retrieve all rotation notifications for the organization with optional filtering and pagination.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | null | Filter by notification type: `rotation_scheduled`, `rotation_completed`, `rotation_failed` |
| `unread` | boolean | false | Filter to show only unread notifications |
| `limit` | number | 50 | Maximum number of results per page |
| `offset` | number | 0 | Pagination offset |

**Roles Required:** admin, editor, viewer

**Example Request:**

```bash
curl -X GET "http://localhost:3001/api/notifications?type=rotation_completed&unread=true&limit=20" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "user_id": "string",
      "secret_id": "uuid",
      "secret_name": "api-key-prod",
      "notification_type": "rotation_completed",
      "message": "Scheduled rotation completed for api-key-prod",
      "read_at": "2026-05-06T08:00:00Z",
      "created_at": "2026-05-06T07:52:25Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 45,
    "hasMore": true
  }
}
```

### 2. Get Notification Statistics

**GET** `/api/notifications/stats`

Retrieve summary statistics about notifications in the organization.

**Roles Required:** admin, editor, viewer

**Example Request:**

```bash
curl -X GET "http://localhost:3001/api/notifications/stats" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 45,
    "unread": 12,
    "scheduledCount": 20,
    "completedCount": 15,
    "failedCount": 10
  }
}
```

### 3. Get Single Notification

**GET** `/api/notifications/:id`

Retrieve a specific notification by ID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Notification ID |

**Roles Required:** admin, editor, viewer

**Example Request:**

```bash
curl -X GET "http://localhost:3001/api/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organization_id": "uuid",
    "user_id": "string",
    "secret_id": "uuid",
    "secret_name": "database-password",
    "notification_type": "rotation_failed",
    "message": "Scheduled rotation FAILED for database-password after 3 attempts: Connection timeout",
    "read_at": null,
    "created_at": "2026-05-06T07:00:00Z"
  }
}
```

### 4. Mark Notification as Read

**PATCH** `/api/notifications/:id`

Mark a specific notification as read.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Notification ID |

**Request Body:**

```json
{
  "action": "mark-read"
}
```

**Roles Required:** admin, editor, viewer

**Example Request:**

```bash
curl -X PATCH "http://localhost:3001/api/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action": "mark-read"}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organization_id": "uuid",
    "user_id": "string",
    "secret_id": "uuid",
    "secret_name": "database-password",
    "notification_type": "rotation_failed",
    "message": "Scheduled rotation FAILED for database-password after 3 attempts: Connection timeout",
    "read_at": "2026-05-06T08:15:00Z",
    "created_at": "2026-05-06T07:00:00Z"
  },
  "message": "Notification marked as read"
}
```

### 5. Mark All Notifications as Read

**POST** `/api/notifications/actions/mark-all-read`

Mark all unread notifications as read for the organization.

**Roles Required:** admin, editor

**Example Request:**

```bash
curl -X POST "http://localhost:3001/api/notifications/actions/mark-all-read" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "updatedCount": 12,
    "message": "12 notification(s) marked as read"
  }
}
```

### 6. Delete Notification

**DELETE** `/api/notifications/:id`

Delete a specific notification.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Notification ID |

**Roles Required:** admin, editor

**Example Request:**

```bash
curl -X DELETE "http://localhost:3001/api/notifications/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deletedId": "550e8400-e29b-41d4-a716-446655440000",
    "notificationType": "rotation_failed",
    "message": "Notification deleted successfully"
  }
}
```

### 7. Delete All Notifications

**DELETE** `/api/notifications`

Delete all notifications for the organization. ⚠️ **Warning: This action cannot be undone.**

**Roles Required:** admin (only)

**Example Request:**

```bash
curl -X DELETE "http://localhost:3001/api/notifications" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "deletedCount": 45,
    "message": "45 notification(s) deleted"
  }
}
```

## Notification Types

| Type | Description |
|------|-------------|
| `rotation_scheduled` | A rotation has been scheduled |
| `rotation_completed` | A rotation has completed successfully |
| `rotation_failed` | A rotation has failed after max retry attempts |

## RBAC (Role-Based Access Control)

| Endpoint | Admin | Editor | Viewer |
|----------|-------|--------|--------|
| GET /api/notifications | ✓ | ✓ | ✓ |
| GET /api/notifications/stats | ✓ | ✓ | ✓ |
| GET /api/notifications/:id | ✓ | ✓ | ✓ |
| PATCH /api/notifications/:id | ✓ | ✓ | ✓ |
| POST /actions/mark-all-read | ✓ | ✓ | ✗ |
| DELETE /api/notifications/:id | ✓ | ✓ | ✗ |
| DELETE /api/notifications | ✓ | ✗ | ✗ |

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "Notification ID is required",
  "status": 400
}
```

### 403 Forbidden

```json
{
  "success": false,
  "error": "Insufficient permissions for this action",
  "status": 403
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": "Notification not found",
  "status": 404
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to retrieve notifications: Database connection error",
  "status": 500
}
```

## Integration with Scheduler

Notifications are automatically created by the background rotation scheduler:

- **rotation_scheduled**: Created when a rotation is scheduled
- **rotation_completed**: Created when a scheduled rotation completes successfully
- **rotation_failed**: Created when a scheduled rotation fails after max retry attempts

The scheduler runs every 60 seconds and processes up to 10 pending rotations per cycle.

## Usage Examples

### Get all unread rotation failure notifications

```bash
curl -X GET "http://localhost:3001/api/notifications?type=rotation_failed&unread=true" \
  -H "Authorization: Bearer $TOKEN"
```

### Mark a specific notification as read and check updated stats

```bash
# Mark as read
curl -X PATCH "http://localhost:3001/api/notifications/$NOTIFICATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "mark-read"}'

# Check stats
curl -X GET "http://localhost:3001/api/notifications/stats" \
  -H "Authorization: Bearer $TOKEN"
```

### List completed rotations with pagination

```bash
curl -X GET "http://localhost:3001/api/notifications?type=rotation_completed&limit=25&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

## Database Tables

The notification system uses the following tables:

- **rotation_notifications**: Stores all rotation notifications with type, status, and timestamps
- **rotation_schedules**: Manages scheduled rotations (created by admin, executed by scheduler)
- **key_rotation_history**: Tracks all rotation executions with status and details

## Monitoring and Alerting

Monitor notification trends to ensure rotation system health:

1. **High failure count**: Investigate failed rotations for systemic issues
2. **Stale notifications**: Regular cleanup of old notifications
3. **Performance**: Monitor notification retrieval times for large organizations

