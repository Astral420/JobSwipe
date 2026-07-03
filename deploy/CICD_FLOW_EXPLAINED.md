# CI/CD Flow Explained

Your GitHub Actions setup provides a complete automated deployment pipeline from code push to production. Here's how it all works together.

## Overview

```
Developer Push → CI Pipeline → CD Pipeline → EC2 Production
     (PR)          (Tests)      (Deploy)      (Live App)
```

## The Complete Flow

### 1. Developer Workflow

```
Developer:
├─ Creates feature branch
├─ Makes code changes
├─ Opens Pull Request to main
│  └─ 🚀 CI Pipeline TRIGGERS
├─ CI passes ✅
├─ Code review & approval
└─ Merges to main
   └─ 🚀 CD Pipeline TRIGGERS
```

## CI Pipeline (Pull Requests)

**Trigger**: When you open a PR to `main` branch

**Purpose**: Ensure code quality before merging

### Phase 1: Lint & Validate (📋)
```
✓ Detect which parts changed (backend/frontend)
✓ Check for merge conflicts
✓ Validate Dockerfile exists
✓ Run Laravel Pint (PHP code style)
✓ Run ESLint (JavaScript/TypeScript)
```

**Time**: ~2-3 minutes

### Phase 2: Unit Tests (🧪) [Currently Skipped]
```
⏭️ Individual component testing
⏭️ Fast, isolated tests
⏭️ No external dependencies
```

**Status**: Temporarily disabled (needs fixing)

### Phase 3: Integration Tests (🔗)
```
✓ Spin up test databases (PostgreSQL, MongoDB, Redis)
✓ Run migrations and seeders
✓ Test component interactions
✓ Test API endpoints
✓ Test database operations
```

**Time**: ~5-7 minutes

### Phase 4: E2E Tests (🎭) [Currently Skipped]
```
⏭️ Full user workflow testing
⏭️ Browser automation with Playwright
⏭️ Test complete user journeys
```

**Status**: Temporarily disabled (needs fixing)

### Phase 5: Docker Build & Test (🐳)
```
✓ Build Docker image from Dockerfile
✓ Test image can start successfully
✓ Test health endpoint responds
✓ Cache layers for faster builds
```

**Time**: ~3-5 minutes (with cache)

### Phase 6: Security Scan (🔒)
```
✓ Generate SBOM (Software Bill of Materials)
✓ Scan for vulnerabilities with Trivy
✓ Upload results to GitHub Security
✓ Check for known CVEs
```

**Time**: ~2-3 minutes

### Phase 7: CI Summary (📊)
```
✓ Generate summary report
✓ Show pass/fail status for each phase
✓ Block merge if any phase fails
```

**Total CI Time**: ~12-18 minutes

**Result**: 
- ✅ Pass → PR can be merged
- ❌ Fail → Fix issues before merging

## CD Pipeline (Main Branch)

**Trigger**: When code is pushed/merged to `main` branch

**Purpose**: Deploy to production automatically

### Phase 1: Build & Push to Docker Hub (🏗️)

```
1. Checkout code from main branch
2. Set up Docker Buildx (multi-platform builds)
3. Login to Docker Hub
4. Build backend image:
   ├─ Context: . (root directory)
   ├─ Dockerfile: ./Dockerfile
   ├─ Tags: latest, production, <commit-sha>
   └─ Push to: gm1026/jobapp-backend:latest
5. Build frontend image:
   ├─ Context: ./frontend/web
   ├─ Dockerfile: ./frontend/web/Dockerfile
   ├─ Tags: latest, production, <commit-sha>
   └─ Push to: gm1026/jobapp-web:latest
6. Use GitHub Actions cache for faster builds
```

**Time**: ~5-8 minutes (with cache)

**Output**: 
- `gm1026/jobapp-backend:latest` on Docker Hub
- `gm1026/jobapp-web:latest` on Docker Hub

### Phase 2: Deploy to AWS EC2 (🚀)

```
1. Setup SSH connection to EC2
   ├─ Use AWS_EC2_SSH_KEY secret
   ├─ Connect to AWS_EC2_HOST
   └─ Login as AWS_EC2_USER (ubuntu)

2. Copy docker-compose.prod.yml to EC2
   └─ SCP to ~/jobapp/docker-compose.prod.yml

3. SSH into EC2 and execute deployment:
   
   a. Pre-deployment checks:
      ├─ Verify .env file exists
      ├─ Check disk space
      └─ Clean up if disk > 70% full
   
   b. Create backup:
      └─ Save current container state
   
   c. Ensure databases are running:
      ├─ Start postgres (if not running)
      ├─ Start mongodb (if not running)
      ├─ Start redis (if not running)
      └─ Wait for health checks
   
   d. Rolling update - Backend (ZERO DOWNTIME):
      ├─ Pull new image: gm1026/jobapp-backend:latest
      ├─ Recreate backend container
      ├─ Wait for health check (30 attempts)
      └─ Old container removed only after new one is healthy
   
   e. Rolling update - Horizon:
      ├─ Pull new image (same as backend)
      ├─ Recreate horizon container
      └─ Jobs continue processing
   
   f. Rolling update - Reverb (NEW):
      ├─ Pull new image (same as backend)
      ├─ Recreate reverb container
      └─ WebSocket connections reconnect
   
   g. Rolling update - Frontend:
      ├─ Pull new image: gm1026/jobapp-web:latest
      ├─ Recreate frontend container
      └─ Wait for health check
   
   h. Post-deployment:
      ├─ Verify all containers running
      ├─ Show container status
      ├─ Show recent logs
      └─ Clean up old images (keep last 72h)

4. Smoke tests:
   ├─ Test https://api.jobswipe.site/api/health
   └─ Test https://jobswipe.site
```

**Time**: ~3-5 minutes

**Zero Downtime Strategy**:
- Databases never stop (persistent data)
- Backend: New container starts → Health check passes → Old container stops
- Frontend: New container starts → Old container stops
- Users experience no interruption

### Phase 3: Verify Deployment (✅)

```
1. SSH into EC2
2. Check all containers are running:
   ├─ Expected: 7 containers
   │  ├─ jobapp_postgres
   │  ├─ jobapp_mongodb
   │  ├─ jobapp_redis
   │  ├─ jobapp_backend
   │  ├─ jobapp_horizon
   │  ├─ jobapp_reverb (NEW)
   │  └─ jobapp_frontend
   └─ Verify status: All "Up"
3. Check data persistence:
   └─ Verify Docker volumes exist
4. Check resource usage:
   ├─ Disk usage
   ├─ CPU usage
   └─ Memory usage
```

**Time**: ~1-2 minutes

### Phase 4: Deployment Summary (📊)

```
Generate GitHub Actions summary:
├─ Show status of each phase
├─ Show Docker image digests
├─ Show infrastructure details
├─ Show deployment URLs
└─ Show commit SHA deployed
```

**Total CD Time**: ~9-15 minutes

## What Happens on EC2

### Container Architecture

```
EC2 Instance
├─ Nginx (Host)
│  ├─ Port 80/443 → Routes traffic
│  ├─ api.jobswipe.site → localhost:8080
│  ├─ ws.jobswipe.site → localhost:8090 (WebSocket)
│  └─ jobswipe.site → localhost:3000
│
├─ Docker Network: jobapp_network
│  │
│  ├─ jobapp_postgres (Port 5432)
│  │  └─ Volume: postgres_data (PERSISTENT)
│  │
│  ├─ jobapp_mongodb (Port 27017)
│  │  └─ Volume: mongodb_data (PERSISTENT)
│  │
│  ├─ jobapp_redis (Port 6379)
│  │  └─ Volume: redis_data (PERSISTENT)
│  │
│  ├─ jobapp_backend (Port 8080)
│  │  ├─ Image: gm1026/jobapp-backend:latest
│  │  ├─ Runs: nginx + PHP-FPM
│  │  └─ Restart: unless-stopped
│  │
│  ├─ jobapp_horizon (No exposed port)
│  │  ├─ Image: gm1026/jobapp-backend:latest
│  │  ├─ Env: RUN_HORIZON=true
│  │  ├─ Runs: php artisan horizon
│  │  └─ Restart: unless-stopped
│  │
│  ├─ jobapp_reverb (Port 8090) ← NEW
│  │  ├─ Image: gm1026/jobapp-backend:latest
│  │  ├─ Env: RUN_REVERB=true
│  │  ├─ Runs: php artisan reverb:start
│  │  └─ Restart: unless-stopped
│  │
│  └─ jobapp_frontend (Port 3000)
│     ├─ Image: gm1026/jobapp-web:latest
│     ├─ Runs: Next.js production server
│     └─ Restart: unless-stopped
```

### Data Persistence

**What survives container restarts/updates:**
- ✅ PostgreSQL data (users, jobs, applications)
- ✅ MongoDB data (profiles, swipe history)
- ✅ Redis data (cache, queues) - AOF persistence
- ✅ Uploaded files (if using volumes)

**What doesn't survive:**
- ❌ Container logs (use external logging)
- ❌ Temporary files in containers
- ❌ In-memory cache (Redis rebuilds)

## Deployment Scenarios

### Scenario 1: Normal Code Update

```
1. Developer merges PR to main
2. CI already passed (from PR)
3. CD Pipeline starts:
   ├─ Build new images (~5 min)
   ├─ Push to Docker Hub (~1 min)
   ├─ Deploy to EC2 (~4 min)
   └─ Verify (~1 min)
4. Total: ~11 minutes
5. Zero downtime ✅
```

### Scenario 2: Database Migration

```
1. Migration files in backend/database/migrations/
2. Merge to main
3. CD Pipeline:
   ├─ Build new image with migrations
   ├─ Deploy to EC2
   └─ Backend container starts:
      ├─ Runs: php artisan migrate --force
      ├─ Applies new migrations
      └─ Starts serving traffic
4. Migrations run automatically ✅
5. Data persists in volumes ✅
```

### Scenario 3: Horizon Job Update

```
1. Update job class in backend/app/Jobs/
2. Merge to main
3. CD Pipeline:
   ├─ Build new image
   ├─ Deploy to EC2
   └─ Horizon container:
      ├─ Pulls new image
      ├─ Restarts with new code
      ├─ Continues processing queue
      └─ New jobs use new code
4. Queue processing continues ✅
```

### Scenario 4: Frontend Update

```
1. Update Next.js components
2. Merge to main
3. CD Pipeline:
   ├─ Build new frontend image
   ├─ Deploy to EC2
   └─ Frontend container:
      ├─ Pulls new image
      ├─ Starts new container
      ├─ Old container stops
      └─ Users see new UI
4. Zero downtime ✅
```

### Scenario 5: Emergency Rollback

```
Option A: Revert commit and push
├─ Git revert <commit>
├─ Push to main
└─ CD Pipeline deploys previous version

Option B: Manual rollback on EC2
├─ SSH into EC2
├─ docker pull gm1026/jobapp-backend:<previous-sha>
├─ docker tag <previous-sha> latest
└─ docker-compose up -d --force-recreate
```

## GitHub Secrets Required

### For CI Pipeline
```
CI_POSTGRES_PASSWORD  - Test database password
CI_MONGO_PASSWORD     - Test MongoDB password
CI_JWT_SECRET         - Test JWT secret
CI_APP_KEY            - Test Laravel app key
```

### For CD Pipeline
```
DOCKER_HUB_USERNAME   - Your Docker Hub username (gm1026)
DOCKER_HUB_TOKEN      - Docker Hub access token
AWS_EC2_HOST          - EC2 public IP or domain
AWS_EC2_USER          - SSH user (ubuntu)
AWS_EC2_SSH_KEY       - Private SSH key for EC2
```

### On EC2 Instance
```
~/jobapp/.env         - Production environment variables
                        (DB passwords, API keys, etc.)
```

## Monitoring Your Deployment

### During Deployment

Watch GitHub Actions:
```
https://github.com/your-repo/actions
```

### After Deployment

Check EC2 logs:
```bash
ssh ubuntu@your-ec2-ip
cd ~/jobapp
docker-compose -f docker-compose.prod.yml logs -f
```

Check specific service:
```bash
docker logs jobapp_backend -f
docker logs jobapp_horizon -f
docker logs jobapp_reverb -f
```

Check container status:
```bash
docker-compose -f docker-compose.prod.yml ps
```

## Benefits of This Setup

### 1. Automated Quality Gates
- ✅ Code must pass linting before merge
- ✅ Tests must pass before merge
- ✅ Security scan runs automatically
- ✅ Docker build must succeed

### 2. Zero Downtime Deployments
- ✅ Rolling updates for all services
- ✅ Health checks before switching
- ✅ Databases never stop
- ✅ Users experience no interruption

### 3. Fast Feedback Loop
- ✅ CI results in ~15 minutes
- ✅ CD completes in ~11 minutes
- ✅ Total: Code to production in ~26 minutes

### 4. Rollback Safety
- ✅ Every deployment tagged with commit SHA
- ✅ Can rollback to any previous version
- ✅ Data persists across rollbacks

### 5. Infrastructure as Code
- ✅ docker-compose.prod.yml defines infrastructure
- ✅ Dockerfile defines application
- ✅ GitHub Actions defines pipeline
- ✅ Everything version controlled

## Common Issues & Solutions

### Issue: Disk Space Full on EC2

**Solution**: CD pipeline automatically cleans up when disk > 70%

```bash
# Manual cleanup if needed
docker system prune -a
docker volume prune
```

### Issue: Container Won't Start

**Check logs**:
```bash
docker logs jobapp_backend --tail 100
```

**Common causes**:
- Missing environment variable in .env
- Database connection failed
- Port already in use

### Issue: Deployment Stuck

**Check GitHub Actions**:
- Look for failed step
- Check SSH connection
- Verify EC2 is accessible

**Manual intervention**:
```bash
ssh ubuntu@your-ec2-ip
cd ~/jobapp
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

### Issue: Old Images Taking Space

**Automatic**: CD pipeline cleans images older than 72h

**Manual**:
```bash
docker image prune -af --filter "until=72h"
```

## Next Steps to Add Reverb

1. **Update docker-compose.prod.yml** ✅ (Already done)
   - Added reverb service

2. **Update Dockerfile** ✅ (Already done)
   - Added RUN_REVERB mode

3. **Update .env on EC2**
   ```bash
   ssh ubuntu@your-ec2-ip
   nano ~/jobapp/.env
   # Add Reverb variables
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Add Reverb WebSocket support"
   git push origin main
   # CD pipeline will deploy automatically
   ```

5. **Verify**
   ```bash
   # Check reverb container
   docker logs jobapp_reverb -f
   
   # Test WebSocket
   # From browser console:
   # const ws = new WebSocket('wss://ws.jobswipe.site');
   ```

## Summary

Your CI/CD pipeline is production-ready and handles:
- ✅ Automated testing on every PR
- ✅ Automated deployment on every merge
- ✅ Zero downtime updates
- ✅ Data persistence
- ✅ Security scanning
- ✅ Rollback capability
- ✅ Multi-service orchestration (Backend, Horizon, Reverb, Frontend)

The addition of Reverb fits perfectly into this flow - it's just another container using the same image with a different environment variable.
