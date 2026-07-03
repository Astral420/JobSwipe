# EC2 Horizon + Reverb Setup Guide

This guide explains how Horizon and Reverb work in your Docker setup and how to configure nginx on EC2.

## How It Works

### Docker Architecture

Your setup uses a **single Docker image** (`gm1026/jobapp-backend:latest`) that runs in three different modes:

1. **Backend (Web Server)**: Runs nginx + PHP-FPM
2. **Horizon (Queue Worker)**: Runs `php artisan horizon`
3. **Reverb (WebSocket Server)**: Runs `php artisan reverb:start`

The mode is controlled by environment variables:
- `RUN_HORIZON=true` → Starts Horizon
- `RUN_REVERB=true` → Starts Reverb
- Neither set → Starts web server

### Why This Approach?

- **Single build**: One Docker image for all services
- **Independent scaling**: Each service runs in its own container
- **Independent restarts**: Restart Horizon without affecting the API
- **Shared codebase**: All services use the same Laravel code

## Setup Instructions

### 1. Update Your Docker Image

First, rebuild and push your Docker image with Reverb support:

```bash
# From JobSwipe/ directory
docker build -t gm1026/jobapp-backend:latest -f Dockerfile .
docker push gm1026/jobapp-backend:latest
```

### 2. Update Environment Variables

Add these to your `.env.production` file on EC2:

```bash
# Reverb Configuration
REVERB_APP_ID=your-app-id
REVERB_APP_KEY=your-app-key
REVERB_APP_SECRET=your-app-secret
REVERB_HOST=0.0.0.0
REVERB_PORT=8090
REVERB_SERVER_HOST=ws.yourdomain.com
REVERB_SERVER_PORT=443
REVERB_SCHEME=https

# Broadcasting
BROADCAST_DRIVER=reverb
```

Generate Reverb credentials:
```bash
# Run this locally or on EC2
php artisan reverb:install
# Copy the generated APP_ID, APP_KEY, APP_SECRET to your .env
```

### 3. Configure Nginx on EC2

Upload the nginx config:
```bash
# From your local machine
scp deploy/nginx/jobapp-ec2.conf ubuntu@your-ec2-ip:~/jobapp/nginx/
```

On EC2, install the config:
```bash
# Copy to sites-available
sudo cp ~/jobapp/nginx/jobapp-ec2.conf /etc/nginx/sites-available/jobapp

# Remove default site if it exists
sudo rm -f /etc/nginx/sites-enabled/default

# Enable your site
sudo ln -s /etc/nginx/sites-available/jobapp /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 4. Update DNS Records

Add these DNS A records pointing to your EC2 IP:
- `yourdomain.com` → EC2 IP
- `www.yourdomain.com` → EC2 IP
- `api.yourdomain.com` → EC2 IP
- `ws.yourdomain.com` → EC2 IP (for WebSocket)

### 5. Deploy Updated Docker Compose

Upload the new docker-compose file:
```bash
scp deploy/docker-compose.prod.yml ubuntu@your-ec2-ip:~/jobapp/
```

On EC2, restart services:
```bash
cd ~/jobapp

# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Stop and remove old containers
docker-compose -f docker-compose.prod.yml down

# Start all services (including new Reverb container)
docker-compose -f docker-compose.prod.yml up -d

# Check all containers are running
docker-compose -f docker-compose.prod.yml ps
```

You should see:
- `jobapp_backend` (port 8080)
- `jobapp_horizon` (no exposed port)
- `jobapp_reverb` (port 8090)
- `jobapp_frontend` (port 3000)
- `jobapp_postgres`
- `jobapp_mongodb`
- `jobapp_redis`

### 6. Setup SSL with Certbot

```bash
# Install certbot if not already installed
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificates for all domains
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com -d ws.yourdomain.com
```

Certbot will automatically update your nginx config to use HTTPS.

### 7. Verify Everything Works

```bash
# Check backend API
curl http://localhost:8080/api/health
curl https://api.yourdomain.com/api/health

# Check Horizon is running
docker logs jobapp_horizon --tail 50

# Check Reverb is running
docker logs jobapp_reverb --tail 50

# Test WebSocket connection (from browser console)
# const ws = new WebSocket('wss://ws.yourdomain.com');
# ws.onopen = () => console.log('Connected!');
```

## Monitoring & Logs

### View Logs
```bash
# Backend API logs
docker logs jobapp_backend -f

# Horizon worker logs
docker logs jobapp_horizon -f

# Reverb WebSocket logs
docker logs jobapp_reverb -f

# All services
docker-compose -f docker-compose.prod.yml logs -f
```

### Restart Individual Services
```bash
# Restart Horizon (if queue jobs are stuck)
docker-compose -f docker-compose.prod.yml restart horizon

# Restart Reverb (if WebSocket connections fail)
docker-compose -f docker-compose.prod.yml restart reverb

# Restart backend API
docker-compose -f docker-compose.prod.yml restart backend
```

### Check Service Health
```bash
# Check which containers are running
docker ps

# Check container resource usage
docker stats

# Check Redis connection (Horizon & Reverb need this)
docker exec jobapp_redis redis-cli -a $REDIS_PASSWORD ping
```

## Troubleshooting

### Horizon Not Processing Jobs

```bash
# Check Horizon logs
docker logs jobapp_horizon --tail 100

# Verify Redis connection
docker exec jobapp_horizon php artisan tinker
# >>> Redis::connection()->ping();

# Restart Horizon
docker-compose -f docker-compose.prod.yml restart horizon
```

### Reverb WebSocket Connection Failed

```bash
# Check Reverb logs
docker logs jobapp_reverb --tail 100

# Verify port is exposed
docker ps | grep reverb

# Test local connection
curl http://localhost:8090

# Check nginx WebSocket config
sudo nginx -t
sudo tail -f /var/log/nginx/ws.error.log
```

### SSL Certificate Issues

```bash
# Renew certificates manually
sudo certbot renew

# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates
```

## Environment Variables Reference

### Backend Container
- Standard Laravel env vars
- No special flags needed

### Horizon Container
- `RUN_HORIZON=true` (required)
- `QUEUE_CONNECTION=redis` (required)
- All other Laravel env vars (DB, Redis, Mail, etc.)

### Reverb Container
- `RUN_REVERB=true` (required)
- `REVERB_HOST=0.0.0.0` (bind to all interfaces)
- `REVERB_PORT=8090` (internal port)
- `REVERB_SERVER_HOST=ws.yourdomain.com` (public WebSocket URL)
- `REVERB_SERVER_PORT=443` (public port, 443 for HTTPS)
- `REVERB_SCHEME=https` (use wss:// protocol)
- `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` (auth credentials)

## Quick Commands Cheat Sheet

```bash
# Deploy updates
cd ~/jobapp
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart everything
docker-compose -f docker-compose.prod.yml restart

# Stop everything
docker-compose -f docker-compose.prod.yml down

# Clean up old images
docker image prune -a

# Check disk space
df -h
docker system df
```

## Architecture Diagram

```
Internet
    │
    ├─── yourdomain.com:443 ──────> nginx ──> localhost:3000 (Frontend)
    │
    ├─── api.yourdomain.com:443 ──> nginx ──> localhost:8080 (Backend API)
    │
    └─── ws.yourdomain.com:443 ───> nginx ──> localhost:8090 (Reverb WebSocket)
                                      │
                                      └─ WebSocket upgrade headers
                                         Connection: upgrade
                                         Upgrade: websocket

Docker Containers:
├── jobapp_backend (port 8080)    - Laravel API + nginx + PHP-FPM
├── jobapp_horizon (no port)      - Queue worker (same image, RUN_HORIZON=true)
├── jobapp_reverb (port 8090)     - WebSocket server (same image, RUN_REVERB=true)
├── jobapp_frontend (port 3000)   - Next.js web app
├── jobapp_postgres (port 5432)   - PostgreSQL database
├── jobapp_mongodb (port 27017)   - MongoDB database
└── jobapp_redis (port 6379)      - Redis (cache + queues + pub/sub)
```

## Next Steps

1. Test WebSocket connections from your frontend
2. Dispatch a test job and verify Horizon processes it
3. Setup monitoring (optional: Laravel Telescope, Horizon dashboard)
4. Configure automated backups
5. Setup log rotation for nginx logs
