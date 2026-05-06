# FASE 7: Key Rotation Management Interface

**Status:** ✅ COMPLETE  
**Last Updated:** 2026-05-05  
**Component Path:** `/src/components/KeyRotation/KeyRotationDashboard.jsx`

---

## Overview

Key Rotation is a critical security practice that limits the exposure of encryption keys over time. This component provides a comprehensive UI for managing rotation policies, scheduling, history, and compliance tracking.

---

## Features

### 1. **Rotation Policy Management**
- **Create Policies:** Define rotation frequency (daily, weekly, monthly, quarterly, custom)
- **Policy Editor:** Update rotation schedules with cron expressions
- **Enable/Disable:** Quick toggle for active rotation policies
- **Preview:** See upcoming rotation dates at a glance

### 2. **Rotation History & Timeline**
- **Chronological View:** All past rotations displayed with timestamps
- **Status Tracking:** Success/Failed indicators for each rotation event
- **User Context:** Show who triggered manual rotations
- **Audit Trail:** Link to compliance audit events

### 3. **Scheduled Rotations**
- **Cron-Based Scheduling:** Support for advanced scheduling patterns
- **Timezone Support:** Respect user's local timezone for schedules
- **Conflict Detection:** Prevent overlapping rotations on same key
- **Upcoming List:** View pending rotations with countdown timers

### 4. **Manual Rotation Triggers**
- **Immediate Rotation:** Trigger rotations on-demand
- **Batch Operations:** Rotate multiple keys at once
- **Pre-Flight Checks:** Verify dependencies before rotation
- **Confirmation Dialogs:** Prevent accidental rotations

### 5. **Monitoring & Analytics**
- **Success Rate Metrics:** Rotation success/failure statistics
- **Average Duration:** Time taken for each rotation
- **Key Coverage:** Which keys are under rotation policies
- **Compliance Status:** Track rotation compliance for audit

---

## Component Structure

```
KeyRotationDashboard
├── Header (Title + Stats)
├── TabBar (4 tabs)
│   ├── Policies
│   ├── Schedule
│   ├── History
│   └── Analytics
│
├── Policies Tab
│   ├── PolicyList (editable items)
│   ├── PolicyForm (create/edit modal)
│   └── QuickActions (enable/disable/delete)
│
├── Schedule Tab
│   ├── ScheduleViewer (calendar view)
│   ├── UpcomingRotations (countdown list)
│   └── ScheduleEditor (cron builder)
│
├── History Tab
│   ├── RotationTimeline (chronological)
│   ├── RotationDetails (expand/collapse)
│   └── FilterControls (by date/status/key)
│
└── Analytics Tab
    ├── SuccessRateChart (percentage)
    ├── DurationMetrics (average/min/max)
    ├── KeyCoverageCard (rotation coverage %)
    └── ComplianceStatus (on-track indicator)
```

---

## API Integration

### Required Backend Endpoints

#### **GET /api/v1/keys/rotation/policies**
Fetch all rotation policies for organization
```javascript
Response: {
  policies: [
    {
      id: "pol_abc123",
      key_id: "key_xyz789",
      frequency: "monthly",
      cron_expression: "0 0 1 * *",
      enabled: true,
      next_rotation: "2026-06-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### **POST /api/v1/keys/rotation/policies**
Create new rotation policy
```javascript
Request: {
  key_id: "key_xyz789",
  frequency: "monthly",
  cron_expression: "0 0 1 * *",
  timezone: "America/New_York"
}
```

#### **PUT /api/v1/keys/rotation/policies/:policyId**
Update rotation policy
```javascript
Request: {
  frequency: "weekly",
  cron_expression: "0 0 * * 1",
  enabled: true
}
```

#### **DELETE /api/v1/keys/rotation/policies/:policyId**
Delete rotation policy (soft delete)

#### **GET /api/v1/keys/rotation/history**
Fetch rotation history with pagination
```javascript
Response: {
  rotations: [
    {
      id: "rot_abc123",
      key_id: "key_xyz789",
      triggered_by: "user_123 or 'scheduled'",
      status: "success|failed",
      started_at: "2026-04-01T00:00:00Z",
      completed_at: "2026-04-01T00:05:23Z",
      duration_ms: 323000,
      error_message: null
    }
  ],
  total: 45,
  page: 1,
  page_size: 10
}
```

#### **POST /api/v1/keys/:keyId/rotate**
Trigger immediate rotation
```javascript
Request: {
  trigger_reason: "manual|emergency|scheduled"
}
Response: {
  rotation_id: "rot_abc123",
  status: "in_progress",
  estimated_completion: "2026-05-05T10:30:00Z"
}
```

#### **POST /api/v1/keys/rotate/batch**
Rotate multiple keys simultaneously
```javascript
Request: {
  key_ids: ["key_1", "key_2", "key_3"],
  trigger_reason: "manual|emergency"
}
```

#### **GET /api/v1/keys/rotation/analytics**
Fetch rotation metrics and analytics
```javascript
Response: {
  success_rate: 98.5,
  total_rotations: 45,
  successful: 44,
  failed: 1,
  average_duration_ms: 315000,
  min_duration_ms: 150000,
  max_duration_ms: 680000,
  keys_under_rotation: 12,
  total_keys: 15,
  rotation_coverage: 80
}
```

---

## React Hooks

### `useApiKeyRotation()`

```javascript
import { useApiKeyRotation } from './hooks/useApiKeyRotation';

const {
  // Policies
  policies,
  loading: policiesLoading,
  createPolicy,
  updatePolicy,
  deletePolicy,
  
  // History
  history,
  historyLoading,
  totalRotations,
  fetchHistory,
  
  // Manual Rotation
  triggerRotation,
  triggerBatchRotation,
  
  // Scheduled Rotations
  upcomingRotations,
  
  // Analytics
  analytics,
  analyticsLoading,
  
  // Error Management
  error,
  clearError
} = useApiKeyRotation();
```

**Example Usage:**
```javascript
// Create a rotation policy
await createPolicy({
  key_id: 'key_123',
  frequency: 'monthly',
  cron_expression: '0 0 1 * *'
});

// Trigger immediate rotation
const result = await triggerRotation('key_123', 'manual');

// Get rotation history
await fetchHistory({ page: 1, status: 'success' });
```

---

## State Management (Zustand Store)

The component integrates with Zustand store for cross-component state:

```javascript
useStore.use.activeModule()  // Returns 'rotation'
useStore.use.setActiveModule('rotation')
useStore.use.notification()  // Access notification system
useStore.use.addNotification(obj)  // Add toast notification
```

---

## Styling & Theme

All styling uses CSS variables for consistency:

```css
--primary: #2196F3;
--success: #4CAF50;
--warning: #FF9800;
--error: #F44336;

--bg1: #FFFFFF;          /* Primary background */
--bg2: #F5F5F5;          /* Secondary background */
--bg3: #E0E0E0;          /* Tertiary background */

--text-primary: #212121;  /* Primary text */
--text-secondary: #666;   /* Secondary text */

--border: #CCCCCC;        /* Border color */
--shadow: rgba(0,0,0,0.1);/* Drop shadow */
```

Dark mode automatically adapts via `@media (prefers-color-scheme: dark)`.

---

## Form Components

### Rotation Policy Form

**Fields:**
- **Key Selection** (required) - Dropdown of all managed keys
- **Frequency** (required) - Select: Daily/Weekly/Monthly/Quarterly/Custom
- **Schedule** (conditional) - Text input for cron expression when "Custom" selected
- **Timezone** (optional) - Dropdown of timezone options
- **Enabled** (default: true) - Toggle switch
- **Description** (optional) - Text area for notes

**Validation Rules:**
- Key must be unique per policy (no duplicate key with multiple policies)
- Cron expression must be valid
- Cannot create policy for deprecated keys
- At least 1 day between rotations

---

## Error Handling

The component handles these error scenarios gracefully:

| Error | Handling |
|-------|----------|
| Network timeout | Retry button + fallback to cached data |
| Policy conflict | Show conflicting policy details |
| Cron validation fail | Highlight invalid syntax with suggestion |
| Key deprecated | Warn user and prevent selection |
| Rotation in progress | Show progress indicator with ETA |
| Access denied | Show permission guard message |

---

## Performance Optimization

1. **Lazy Loading:** History loaded on-demand with pagination
2. **Memoization:** useCallback for all event handlers
3. **Debouncing:** Schedule preview updates debounced 500ms
4. **Caching:** Recently accessed policies cached for 5 minutes
5. **Code Splitting:** Analytics chart loaded via lazy import

---

## Mobile Responsiveness

- **Mobile (< 768px):** Single-column layout, collapsible policy cards
- **Tablet (768px - 1024px):** Two-column grid for policies
- **Desktop (> 1024px):** Three-column grid, side-by-side panels

---

## Accessibility Features

- ✅ Semantic HTML (nav, section, article, button)
- ✅ ARIA labels for form inputs
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Focus indicators visible on all interactive elements
- ✅ Color contrast ratios meet WCAG AA standards
- ✅ Screen reader tested with NVDA/VoiceOver

---

## Security Considerations

1. **Backend-Driven Rotation:** Keys never exposed to frontend
2. **Audit Logging:** All rotation events logged with user context
3. **Rate Limiting:** Max 1 rotation per key per hour (unless emergency)
4. **Backup Before Rotation:** System creates backup before rotating
5. **Rollback Capability:** Can revert to previous key version if rotation fails
6. **Encryption:** Key material never transmitted to frontend

---

## Integration Checklist

- ✅ Component created and styled
- ✅ API endpoints defined
- ✅ React hooks implemented
- ✅ Zustand store integration
- ✅ Error handling complete
- ✅ Accessibility tested
- ✅ Mobile responsive
- ✅ Documentation complete
- 📋 Backend endpoints implementation (FASE 7 Backend)
- 📋 Database migrations (FASE 7 Backend)
- 📋 End-to-end testing

---

## Deployment Notes

- Requires Express backend with key rotation endpoints
- Requires PostgreSQL table: `key_rotation_policies`, `rotation_history`
- Requires JWT authentication tokens
- Requires organization context (multi-tenant isolation)

---

## Support & Troubleshooting

**Issue:** Policy list not loading
- Check network tab for API errors
- Verify authentication token is valid
- Check organization ID in store

**Issue:** Cron syntax rejected
- Use cron validator tool (crontab.guru)
- Format: `minute hour day month weekday`
- Example: `0 0 1 * *` = first of month at midnight

**Issue:** Manual rotation fails
- Check key is not deprecated
- Verify no rotation currently in progress
- Check backend logs for error details

---

**Status: 🟢 COMPLETE - Ready for Integration Testing**

Next: FASE 8 Compliance & Audit Trail
