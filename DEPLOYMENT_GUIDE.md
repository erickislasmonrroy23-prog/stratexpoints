# StratexPoints - Complete Deployment Guide

## Current Status ✅

- **Frontend**: ✅ Deployed to Vercel
  - URL: https://stratexpoints-mh4br34ei-erickislasmonrroy23-progs-projects.vercel.app
  - Status: Live and running

- **Backend API**: ⏳ Not yet deployed (This is what's missing!)
  - FASE 7: Secrets Management & Key Rotation API
  - Status: Ready for deployment, needs backend service

## What's Missing

The frontend is deployed but cannot communicate with the backend API because the Express.js server (FASE 7 with schedule management, rotation policies, and notifications) is not yet deployed to production.

## Complete Deployment Steps

### Part 1: Frontend Deployment (Already Done ✅)

The React frontend is already deployed to Vercel with:
- Vite build optimization
- PWA support
- CORS properly configured

### Part 2: Backend Deployment (To Do)

The backend Express API server needs to be deployed. Follow the instructions below based on your preferred hosting service.

## Option A: Deploy Backend to Railway (Recommended) ⭐

Railway is perfect for this because it:
- Supports persistent Node.js services (required for the background scheduler)
- Easy git-based deployment
- Includes PostgreSQL database support
- Free tier available

### Steps:

1. **Sign up at Railway.app**
   ```
   https://railway.app
   ```

2. **Create a new project**
   - Click "New Project" → "Deploy from GitHub"
   - Select your stratexpoints repository
   - Configure to deploy from `/backend` directory

3. **Set Environment Variables** in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3001
   
   # Database (PostgreSQL)
   DB_HOST=your-postgres-host
   DB_PORT=5432
   DB_NAME=stratexpoints
   DB_USER=postgres
   DB_PASSWORD=your-secure-password
   
   # JWT
   JWT_SECRET=your-very-secure-jwt-secret-key-32-chars-min
   JWT_EXPIRY=24h
   JWT_REFRESH_EXPIRY=7d
   
   # Encryption (generate a secure 256-bit hex key)
   ENCRYPTION_MASTER_KEY=your-256-bit-hex-key-64-chars
   
   # Frontend URL
   FRONTEND_URL=https://stratexpoints-mh4br34ei-erickislasmonrroy23-progs-projects.vercel.app
   CORS_ORIGINS=stratexpoints-mh4br34ei-erickislasmonrroy23-progs-projects.vercel.app
   
   # Logging
   LOG_LEVEL=info
   
   # Optional
   SENTRY_DSN=your-sentry-dsn-if-using
   ```

4. **Deploy**
   - Railway automatically deploys when you push to main
   - The Dockerfile in `/backend` will be used for build
   - Service will be available at: `your-railway-app-url.railway.app`

5. **Run Database Migrations**
   - Connect to Railway PostgreSQL
   - Or use Railway's deployment hooks to auto-run migrations

### Option B: Deploy Backend to Render

1. **Sign up at render.com**
   ```
   https://render.com
   ```

2. **Create new Web Service**
   - Connect GitHub repository
   - Select the root directory
   - Choose "Docker" as runtime
   - Set the Dockerfile path to `backend/Dockerfile`

3. **Set Environment Variables**
   - Same variables as Railway (see above)

4. **Deploy**
   - Render will build and deploy automatically

### Option C: Deploy Backend to Heroku

Note: Heroku free tier is no longer available, but credits are available.

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create stratexpoints-backend`
4. Add PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
5. Set environment variables: `heroku config:set KEY=VALUE`
6. Deploy: `git push heroku main` (or configure for automatic deployment from GitHub)

## Part 3: Update Frontend API Configuration

After deploying the backend, update the frontend to point to the backend API:

1. **In Vercel Environment Variables**, add:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```

2. **Or in the frontend code**, update any hardcoded API endpoints to use the production backend URL

## Database Setup

### PostgreSQL Database Required

For production, you'll need a PostgreSQL database. Options:

- **Railway**: Includes PostgreSQL in the same environment
- **AWS RDS**: AWS's managed PostgreSQL
- **Supabase**: PostgreSQL + extras
- **DigitalOcean Managed Databases**: Simple PostgreSQL hosting
- **Neon**: Serverless Postgres (good for Vercel)

### Initialize Database

1. Run migrations on production database:
   ```bash
   DB_HOST=prod-host DB_NAME=stratexpoints npm run migrate
   ```

Or configure in Railway/Render to run migrations during deployment.

## Environment Variables Checklist

Create a `.env.production` file with all required variables:

```bash
# Required Variables Checklist
✓ NODE_ENV=production
✓ PORT=3001
✓ DB_HOST=<database-host>
✓ DB_PORT=5432
✓ DB_NAME=<database-name>
✓ DB_USER=<database-user>
✓ DB_PASSWORD=<secure-password>
✓ JWT_SECRET=<secure-32-char-key>
✓ JWT_EXPIRY=24h
✓ JWT_REFRESH_EXPIRY=7d
✓ ENCRYPTION_MASTER_KEY=<256-bit-hex-64-chars>
✓ FRONTEND_URL=<vercel-frontend-url>
✓ CORS_ORIGINS=<frontend-domain>
✓ LOG_LEVEL=info
```

## Testing Production Deployment

After deploying the backend:

1. **Test Health Check**
   ```bash
   curl https://your-backend-url/health
   ```

2. **Test API Endpoint**
   ```bash
   curl -X GET https://your-backend-url/api/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. **Test Schedule Endpoint**
   ```bash
   curl -X GET https://your-backend-url/api/keys/test-secret/schedules \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

4. **In Browser**: Test that frontend can connect to backend
   - Open DevTools → Network tab
   - Try creating a secret or schedule
   - Verify API calls succeed

## Complete API Endpoints Available

Once deployed, these endpoints will be available:

### Secrets Management (FASE 6)
- `POST /api/secrets` - Create secret
- `GET /api/secrets` - List secrets
- `GET /api/secrets/:id` - Get secret
- `GET /api/secrets/:id/value` - Get secret value
- `PUT /api/secrets/:id` - Update secret
- `DELETE /api/secrets/:id` - Delete secret
- `GET /api/secrets/:id/audit` - Audit trail

### Key Rotation Management (FASE 7)
- `GET /api/keys/:secretId/policy` - Get rotation policy
- `POST /api/keys/:secretId/policy` - Create/update policy
- `GET /api/keys/:secretId/preview` - Preview next rotation
- `POST /api/keys/:secretId/rotate` - Rotate key manually
- `GET /api/keys/:secretId/history` - View rotation history

### Schedule Management (FASE 7)
- `POST /api/keys/:secretId/schedule` - Schedule rotation
- `GET /api/keys/:secretId/schedules` - List schedules
- `GET /api/keys/:secretId/schedule/:scheduleId` - Get schedule
- `PUT /api/keys/:secretId/schedule/:scheduleId` - Update schedule
- `DELETE /api/keys/:secretId/schedule/:scheduleId` - Cancel schedule

### Notification Management (FASE 7)
- `GET /api/notifications` - List notifications
- `GET /api/notifications/:id` - Get notification
- `PATCH /api/notifications/:id` - Mark as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/actions/mark-all-read` - Mark all read

## Final Checklist

- [ ] Frontend deployed to Vercel ✅
- [ ] Backend service created (Railway/Render/Heroku)
- [ ] Environment variables set on backend service
- [ ] PostgreSQL database created and accessible
- [ ] Database migrations run
- [ ] Health check endpoint responds
- [ ] CORS configured correctly
- [ ] JWT_SECRET is a strong, unique value
- [ ] ENCRYPTION_MASTER_KEY is secure and stored
- [ ] Frontend updated with production backend URL
- [ ] API endpoints tested and working
- [ ] Notifications working in background
- [ ] Scheduler running and executing rotations

## Next Steps

1. **Choose a hosting service** (Railway recommended)
2. **Deploy the backend** following the steps above
3. **Configure environment variables**
4. **Test all API endpoints**
5. **Celebrate! Your full-stack app is live! 🎉**

## Support & Documentation

- Backend API Docs: See `/backend/API_*.md` files
- Test Suite: `/backend/test-*.js` files with curl examples
- Deployment Issues: Check service logs (Railway/Render dashboard)
- Database Issues: Verify DB credentials in environment variables

---

**Current Deployment Status:**
- ✅ Frontend: Live on Vercel
- ⏳ Backend: Ready to deploy
- ⏳ Database: Configure when deploying backend

**Time to Full Production**: ~15 minutes with Railway
