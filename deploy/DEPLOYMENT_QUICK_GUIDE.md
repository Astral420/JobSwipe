# Deployment Quick Guide

## TL;DR - How to Deploy

```bash
# 1. Make your changes
git checkout -b feature/my-feature
# ... make changes ...

# 2. Push and create PR
git push origin feature/my-feature
# Open PR on GitHub → CI runs automatically

# 3. After CI passes and PR approved, merge to main
# CD runs automatically and deploys to production

# 4. Check deployment
# Visit: https://jobswipe.site
```

That's it! GitHub Actions handles everything else.

## What Happens Automatically

### On Pull Request
```
Your PR → GitHub Actions CI
├─ Lints your code
├─ Runs tests
├─ Builds Docker image
├─ Scans for security issues
└─ Reports results on PR

✅ Pass → Can merge
❌ Fail → Fix and push again
```

### On Merge to Main
```
Merge → GitHub Actions CD
├─ Builds Docker images
├─ Pushes to Docker Hub
├─ SSHs into EC2
├─ Pulls new images
├─ Updates containers (zero downtime)
├─ Runs health checks
└─ Verifies deployment

✅ Success → Live in ~11 minutes
❌ Fail → Rollback automatically
```

## Your Current Setup

### Services Running on EC2

| Service | Port | Purpose | Image |
|---------|------|---------|-------|
| Backend API | 8080 | REST API | gm1026/jobapp-backend:latest |
| Horizon | - | Queue worker | gm1026/jobapp-backend:latest |
| Reverb | 8090 | WebSocket | gm1026/jobapp-backend:latest |
| Frontend | 3000 | Next.js web | gm1026/jobapp-web:latest |
| PostgreSQL | 5432 | Database | postgres:15-alpine |
| MongoDB | 27017 | Database | mongo:7 |
| Redis | 6379 | Cache/Queue | redis:7-alpine |

### Public URLs

- **Web App**: https://jobswipe.site
- **API**: https://api.jobswipe.site
- **WebSocket**: wss://ws.jobswipe.site (after Reverb setup)

## Adding Reverb to Production

Since your CD pipeline is already set up, adding Reverb is simple:

### Step 1: Update .env on EC2

```bash
ssh ubuntu@your-ec2-ip
nano ~/jobapp/.env
```

Add these lines:
```bash
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=0.0.0.0
REVERB_PORT=8090
REVERB_SERVER_HOST=ws.jobswipe.site
REVERB_SERVER_PORT=443
REVERB_SCHEME=https
BROADCAST_DRIVER=reverb
```

Generate credentials locally:
```bash
cd backend
php artisan reverb:install
# Copy the generated values to EC2 .env
```

### Step 2: Setup Nginx for WebSocket

```bash
# Upload nginx config
scp deploy/nginx/jobapp-ec2.conf ubuntu@your-ec2-ip:~/jobapp/nginx/

# On EC2
ssh ubuntu@your-ec2-ip
sudo cp ~/jobapp/nginx/jobapp-ec2.conf /etc/nginx/sites-available/jobapp
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Setup SSL for WebSocket Domain

```bash
# On EC2
sudo certbot --nginx -d ws.jobswipe.site
```

### Step 4: Deploy

```bash
# From your local machine
git add .
git commit -m "Add Reverb WebSocket support"
git push origin main

# GitHub Actions will:
# 1. Build new image with Reverb support
# 2. Push to Docker Hub
# 3. Deploy to EC2
# 4. Start reverb container automatically
```

### Step 5: Verify

```bash
# Check reverb is running
ssh ubuntu@your-ec2-ip
cd ~/jobapp
docker-compose -f docker-compose.prod.yml ps

# Should see:
# jobapp_reverb   Up   0.0.0.0:8090->8090/tcp

# Check logs
docker logs jobapp_reverb -f

# Test WebSocket (from browser console)
const ws = new WebSocket('wss://ws.jobswipe.site');
ws.onopen = () => console.log('✅ Connected!');
```

## Common Commands

### Check Deployment Status

```bash
# On GitHub
https://github.com/your-repo/actions

# On EC2
ssh ubuntu@your-ec2-ip
cd ~/jobapp
docker-compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs jobapp_backend -f
docker logs jobapp_horizon -f
docker logs jobapp_reverb -f
```

### Manual Deployment

```bash
# If you need to deploy manually
ssh ubuntu@your-ec2-ip
cd ~/jobapp
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Rollback

```bash
# Option 1: Revert commit and push
git revert <commit-sha>
git push origin main
# CD pipeline deploys previous version

# Option 2: Manual rollback
ssh ubuntu@your-ec2-ip
cd ~/jobapp
docker pull gm1026/jobapp-backend:<previous-sha>
docker tag gm1026/jobapp-backend:<previous-sha> gm1026/jobapp-backend:latest
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Look for red ❌ in the workflow
3. Click on failed step to see error
4. Fix issue and push again

### Container Not Starting

```bash
# Check logs
docker logs jobapp_backend --tail 100

# Common issues:
# - Missing env var in .env
# - Database connection failed
# - Port conflict
```

### Out of Disk Space

```bash
# CD pipeline auto-cleans when disk > 70%
# Manual cleanup:
docker system prune -a
docker volume prune
```

## GitHub Secrets You Need

Already configured (don't change unless needed):

- `DOCKER_HUB_USERNAME` - gm1026
- `DOCKER_HUB_TOKEN` - Your Docker Hub token
- `AWS_EC2_HOST` - Your EC2 IP
- `AWS_EC2_USER` - ubuntu
- `AWS_EC2_SSH_KEY` - Your SSH private key

## Deployment Timeline

```
Code Push → CI (15 min) → Merge → CD (11 min) → Live
                                                   ↓
                                    https://jobswipe.site
```

Total: ~26 minutes from code to production

## Zero Downtime Guarantee

Your setup ensures:
- ✅ New container starts before old one stops
- ✅ Health checks verify new container works
- ✅ Databases never stop (persistent volumes)
- ✅ Users experience no interruption
- ✅ Failed deployments rollback automatically

## Data Safety

Your data is safe because:
- ✅ PostgreSQL data in Docker volume `postgres_data`
- ✅ MongoDB data in Docker volume `mongodb_data`
- ✅ Redis data in Docker volume `redis_data`
- ✅ Volumes persist across container updates
- ✅ Volumes survive container restarts

## What Gets Updated

When you deploy:
- ✅ Application code (Backend, Frontend)
- ✅ Dependencies (composer, npm packages)
- ✅ Configuration (if changed)
- ✅ Database schema (migrations run automatically)
- ❌ Database data (persists)
- ❌ Environment variables (manual update needed)

## Best Practices

1. **Always test locally first**
   ```bash
   make docker-up
   make test
   ```

2. **Use feature branches**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Wait for CI before merging**
   - Don't merge if CI is red ❌

4. **Monitor deployments**
   - Watch GitHub Actions
   - Check logs after deployment

5. **Keep .env updated**
   - Update EC2 .env when adding new variables
   - Don't commit .env to git

## Summary

Your deployment is:
- ✅ Fully automated
- ✅ Zero downtime
- ✅ Data persistent
- ✅ Rollback capable
- ✅ Security scanned
- ✅ Production ready

Just push to main and GitHub Actions handles the rest!
