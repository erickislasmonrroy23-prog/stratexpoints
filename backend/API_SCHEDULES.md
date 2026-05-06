# FASE 7: Schedule Management API Documentation

## Overview

The Schedule Management API provides endpoints to create, retrieve, update, and cancel scheduled key rotations. Scheduled rotations are created by users with admin or editor roles and are executed automatically by the background rotation scheduler.

## Authentication

All schedule endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Base URL

```
/api/keys
```

## Endpoints

### 1. Schedule a Key Rotation

**POST** `/api/keys/:secretId/schedule`

Create a scheduled rotation for a secret at a specific future time.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `secretId` | string (UUID) | Secret ID to schedule rotation for |

**Request Body:**

```json
{
  "scheduledFor": "2026-05-10T14:30:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduledFor` | string (ISO 8601) | Yes | Future timestamp when rotation should occur |

**Roles Required:** admin, editor

**Example Request:**

```bash
curl -X POST "http://localhost:3001/api/keys/550e8400-e29b-41d4-a716-446655440000/schedule" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scheduledFor": "2026-05-10T14:30:00Z"}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "secret_id": "550e8400-e29b-41d4-a716-446655440000",
    "secret_name": "database-password",
    "scheduled_for": "2026-05-10T14:30:00Z",
    "status": "pending",
    "rotation_frequency": "30 days",
    "created_by": "user-uuid",
    "created_at": "2026-05-05T10:00:00Z"
  },
  "message": "Key rotation scheduled successfully"
}
```

### 2. Get All Schedules for a Secret

**GET** `/api/keys/:secretId/schedules`

Retrieve all scheduled rotations for a specific secret with pagination.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `secretId` | string (UUID) | Secret ID to get schedules for |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Maximum number of results per page |
| `offset` | number | 0 | Pagination offset |

**Roles Required:** admin, editor, viewer

**Example Request:**

```bash
curl -X GET "http://localhost:3001/api/keys/550e8400-e29b-41d4-a716-446655440000/schedules?limit=20&offset=0" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "schedule-uuid",
      "secret_id": "550e8400-e29b-41d4-a716-446655440000",
      "secret_name": "database-password",
      "scheduled_for": "2026-05-10T14:30:00Z",
      "status": "pending",
      "rotation_frequency": "30 days",
      "created_by": "user-uuid",
      "created_at": "2026-05-05T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 5,
    "hasMore": false
  }
}
```

### 3. Get Specific Schedule Details

**GET** `/api/keys/:secretId/schedule/:scheduleId`

Retrieve details of a specific scheduled rotation.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `secretId` | string (UUID) | Secret ID |
| `scheduleId` | string (UUID) | Schedule ID |

**Roles Required:** admin, editor, viewer

**Example Request:**

```bash
curl -X GET "http://localhost:3001/api/keys/550e8400-e29b-41d4-a716-446655440000/schedule/schedule-uuid" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "secret_id": "550e8400-e29b-41d4-a716-446655440000",
    "secret_name": "database-password",
    "scheduled_for": "2026-05-10T14:30:00Z",
    "status": "pending",
    "rotation_frequency": "30 days",
    "created_by": "user-uuid",
    "created_at": "2026-05-05T10:00:00Z",
    "updated_at": "2026-05-05T10:00:00Z"
  }
}
```

### 4. Update Scheduled Rotation

**PUT** `/api/keys/:secretId/schedule/:scheduleId`

Update a scheduled rotation. Only pending schedules can be updated, and only the `scheduledFor` field can be modified.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `secretId` | string (UUID) | Secret ID |
| `scheduleId` | string (UUID) | Schedule ID |

**Request Body:**

```json
{
  "scheduledFor": "2026-05-12T15:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduledFor` | string (ISO 8601) | Yes | New future timestamp for rotation |

**Roles Required:** admin, editor

**Example Request:**

```bash
curl -X PUT "http://localhost:3001/api/keys/550e8400-e29b-41d4-a716-446655440000/schedule/schedule-uuid" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"scheduledFor": "2026-05-12T15:00:00Z"}'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "secret_id": "550e8400-e29b-41d4-a716-446655440000",
    "secret_name": "database-password",
    "scheduled_for": "2026-05-12T15:00:00Z",
    "status": "pending",
    "rotation_frequency": "30 days",
    "created_by": "user-uuid",
    "created_at": "2026-05-05T10:00:00Z",
    "updated_at": "2026-05-05T10:15:00Z"
  },
  "message": "Scheduled rotation updated successfully"
}
```

### 5. Cancel Scheduled Rotation

**DELETE** `/api/keys/:secretId/schedule/:scheduleId`

Cancel a scheduled rotation. Only pending schedules can be cancelled.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `secretId` | string (UUID) | Secret ID |
| `scheduleId` | string (UUID) | Schedule ID |

**Roles Required:** admin, editor

**Example Request:**

```bash
curl -X DELETE "http://localhost:3001/api/keys/550e8400-e29b-41d4-a716-446655440000/schedule/schedule-uuid" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "schedule-uuid",
    "secret_id": "550e8400-e29b-41d4-a716-446655440000",
    "secret_name": "database-password",
    "scheduled_for": "2026-05-10T14:30:00Z",
    "status": "cancelled",
    "rotation_frequency": "30 days",
    "created_by": "user-uuid",
    "created_at": "2026-05-05T10:00:00Z",
    "cancelled_at": "2026-05-05T10:20:00Z"
  },
  "message": "Rotation schedule cancelled successfully"
}
```

## Schedule Statuses

| Status | Description |
|--------|-------------|
| `pending` | Schedule is waiting to be executed |
| `completed` | Rotation was executed successfully |
| `failed` | Rotation execution failed after max retries |
| `cancelled` | Schedule was manually cancelled by user |

## RBAC (Role-Based Access Control)

| Endpoint | Admin | Editor | Viewer |
|----------|-------|--------|--------|
| POST /api/keys/:secretId/schedule | ✓ | ✓ | ✗ |
| GET /api/keys/:secretId/schedules | ✓ | ✓ | ✓ |
| GET /api/keys/:secretId/schedule/:scheduleId | ✓ | ✓ | ✓ |
| PUT /api/keys/:secretId/schedule/:scheduleId | ✓ | ✓ | ✗ |
| DELETE /api/keys/:secretId/schedule/:scheduleId | ✓ | ✓ | ✗ |

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "scheduledFor is required",
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
  "error": "Schedule not found",
  "status": 404
}
```

### 409 Conflict

```json
{
  "success": false,
  "error": "A pending schedule already exists for this secret",
  "status": 409
}
```

### 422 Unprocessable Entity

```json
{
  "success": false,
  "error": "Schedule date must be in the future",
  "status": 422
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Failed to schedule rotation: Database connection error",
  "status": 500
}
```

## Business Rules

1. **Future Date Required**: `scheduledFor` must be a timestamp in the future
2. **No Duplicate Pending Schedules**: Only one pending schedule per secret is allowed; additional schedules must be created after the previous one completes or is cancelled
3. **Pending Status Only**: Only schedules with `pending` status can be updated or cancelled
4. **Audit Trail**: All schedule operations (create, update, cancel) are logged with user ID and timestamp
5. **Notification Creation**: Notifications are automatically created when schedules are created, completed, or cancelled

## Integration with Scheduler

The background rotation scheduler processes pending schedules every 60 seconds:

1. Finds all pending schedules with `scheduled_for` time <= current time
2. Executes the rotation operation
3. Updates schedule status to `completed` or `failed`
4. Creates corresponding notification

## Usage Examples

### Schedule a rotation for 5 days from now

```bash
FUTURE_DATE=$(date -u -d "+5 days" +"%Y-%m-%dT%H:%M:%SZ")
curl -X POST "http://localhost:3001/api/keys/$SECRET_ID/schedule" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"scheduledFor\": \"$FUTURE_DATE\"}"
```

### Get all scheduled rotations for a secret

```bash
curl -X GET "http://localhost:3001/api/keys/$SECRET_ID/schedules?limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

### Reschedule a rotation to a later time

```bash
NEW_DATE=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%SZ")
curl -X PUT "http://localhost:3001/api/keys/$SECRET_ID/schedule/$SCHEDULE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"scheduledFor\": \"$NEW_DATE\"}"
```

### Cancel an upcoming scheduled rotation

```bash
curl -X DELETE "http://localhost:3001/api/keys/$SECRET_ID/schedule/$SCHEDULE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## Database Tables

The schedule system uses the following tables:

- **rotation_schedules**: Stores scheduled rotation records with status and timestamps
- **rotation_history**: Updated when schedules are executed
- **rotation_notifications**: Notifications created for schedule events
- **audit_logs**: Comprehensive audit trail of all schedule operations
