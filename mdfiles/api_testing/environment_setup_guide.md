# JobSwipe Backend — Environment Setup Guide

> This guide covers standing up the full backend stack for both **local development** and **production on AWS EC2** with a custom domain.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [Production Setup (AWS EC2)](#4-production-setup-aws-ec2)
5. [Laravel Reverb (WebSocket Server)](#5-laravel-reverb-websocket-server)
6. [Verifying the Environment](#6-verifying-the-environment)
7. [Testing Tool Configurations](#7-testing-tool-configurations)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Tech Stack                          │
├──────────────┬──────────────────────────────────────────┤
│ Runtime      │ PHP 8.2 + Laravel 11                    │
│ Primary DB   │ PostgreSQL 15 (users, jobs, matches)    │
│ Document DB  │ MongoDB 7 (profiles, swipe history)     │
│ Cache/Queue  │ Redis 7 (caching, sessions, Horizon)    │
│ Search       │ Meilisearch (job deck)                  │
│ Auth         │ Laravel Sanctum (token-based)            │
│ Queue Worker │ Laravel Horizon                          │
│ WebSocket    │ Laravel Reverb                           │
│ File Storage │ Cloudflare R2 / AWS S3                   │
│ Payments     │ Stripe (company), Apple/Google IAP       │
│ Email        │ Resend (dev), SMTP/SendGrid (prod)       │
│ Web Server   │ Nginx (prod) / artisan serve (dev)       │
└──────────────┴──────────────────────────────────────────┘
```

| | Local Dev | Production (EC2) |
|---|-----------|------------------|
| **Base URL** | `http://localhost:8000/api/v1` | `https://api.jobswipe.site/api/v1` |
| **Frontend** | `http://localhost:3000` | `https://jobswipe.site` |
| **Services** | Docker Compose | Docker Compose + Nginx + SSL |
| **Queue** | `sync` (inline) | `redis` (Horizon worker) |
| **WebSocket** | `reverb` on `:8001` (manual) | `reverb` on `:6001` (supervisord) |
| **Mail** | `log` (storage/logs) | SMTP / SendGrid |
| **Debug** | `APP_DEBUG=true` | `APP_DEBUG=false` |

---

## 2. Prerequisites

### Local Development

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | latest | [docker.com](https://docker.com) |
| Docker Compose | v2+ | Bundled with Docker Desktop |
| Git | latest | `brew install git` |
| PHP (optional) | 8.2+ | `brew install php` — only needed for `artisan` outside Docker |
| Composer (optional) | 2.x | `brew install composer` |
| Stripe CLI | latest | `brew install stripe/stripe-cli/stripe` — for webhook testing |

### Production (EC2)

| Tool | Install on EC2 |
|------|----------------|
| Docker Engine | `sudo yum install docker` (Amazon Linux 2) or `sudo apt install docker.io` (Ubuntu) |
| Docker Compose v2 | `sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose`|
| Nginx | `sudo yum install nginx` / `sudo apt install nginx` |
| Certbot | `sudo yum install certbot python3-certbot-nginx` / `sudo apt install certbot python3-certbot-nginx` |
| Git | `sudo yum install git` / `sudo apt install git` |

---

## 3. Local Development Setup

### 3.1 Clone & Configure

```bash
# Clone the repo
git clone git@github.com:your-org/JobSwipe.git
cd JobSwipe
```

### 3.2 Create the `.env` File

Create a `.env` file in the **project root** (next to `docker-compose.yml`):

```bash
cp backend/.env.example .env
```

Then fill it with these values:

```env
# =============================================
# LOCAL DEVELOPMENT .env
# Place in project root (next to docker-compose.yml)
# =============================================

# ── Application ──────────────────────────────
APP_NAME=JobSwipe
APP_ENV=local
APP_KEY=                          # Generated in step 3.4
APP_DEBUG=true
APP_URL=http://localhost:8000

# ── PostgreSQL ───────────────────────────────
DB_CONNECTION=pgsql
DB_HOST=postgres                  # Docker service name
DB_PORT=5432
DB_DATABASE=jobapp
DB_USERNAME=postgres
DB_PASSWORD=secret_pg_pass_123    # Pick any password

# ── MongoDB ──────────────────────────────────
MONGO_HOST=mongodb                # Docker service name
MONGO_PORT=27017
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=secret_mongo_pass_123
MONGO_DATABASE=jobapp

# ── Redis ────────────────────────────────────
REDIS_HOST=redis                  # Docker service name
REDIS_PORT=6379
REDIS_PASSWORD=secret_redis_pass_123

# ── Auth ─────────────────────────────────────
JWT_SECRET=local-dev-jwt-secret-change-me-in-prod
BCRYPT_ROUNDS=4                   # Fast hashing for dev

# ── Queue ────────────────────────────────────
QUEUE_CONNECTION=sync             # Inline execution — no Horizon needed

# ── Mail ─────────────────────────────────────
MAIL_MAILER=log                   # Emails written to storage/logs/laravel.log
MAIL_FROM_ADDRESS=dev@jobswipe.local
MAIL_FROM_NAME="${APP_NAME}"

# ── Resend (optional for dev) ────────────────
RESEND_KEY=

# ── File Storage ─────────────────────────────
FILESYSTEM_DISK=local             # Local disk — no S3/R2 needed

# ── Cloudflare R2 (leave empty for dev) ──────
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
R2_PUBLIC_URL=
R2_ACCOUNT_ID=

# ── Stripe (test keys) ──────────────────────
STRIPE_KEY=pk_test_xxxxxxxx
STRIPE_SECRET=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_BASIC_PRICE_ID=price_xxxxxxxx
CASHIER_CURRENCY=php
CASHIER_CURRENCY_LOCALE=en_PH

# ── Apple IAP (leave empty for dev) ──────────
APPLE_IAP_SHARED_SECRET=
APPLE_IAP_BUNDLE_ID=com.jobswipe.app
APPLE_IAP_WEBHOOK_ENV=SANDBOX
APPLE_IAP_WEBHOOK_STRICT_CERT_VALIDATION=false

# ── Google Play IAP (leave empty for dev) ────
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=
GOOGLE_PLAY_PACKAGE_NAME=

# ── Google OAuth ─────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# ── Frontend URLs ────────────────────────────
FRONTEND_WEB_URL=http://localhost:3000
FRONTEND_MOBILE_URL=http://localhost:8080

# ── Laravel Reverb (WebSocket) ───────────────
# Set BROADCAST_CONNECTION=reverb to enable WebSocket broadcasting
# Default is 'null' (disabled). Change when you need real-time messaging.
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=jobswipe-local
REVERB_APP_KEY=local-reverb-key
REVERB_APP_SECRET=local-reverb-secret
REVERB_HOST=localhost
REVERB_PORT=8001
REVERB_SCHEME=http

# Reverb server bind settings (inside the container)
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=8001

# ── Logging ──────────────────────────────────
LOG_CHANNEL=stderr
LOG_LEVEL=debug
```

### 3.3 Start All Services

```bash
# From project root (where docker-compose.yml lives)
docker compose up -d
```

This starts:

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| PostgreSQL 15 | `jobapp_postgres` | `5433:5432` | Primary database |
| MongoDB 7 | `jobapp_mongodb` | `27017:27017` | Document store |
| Redis 7 | `jobapp_redis` | `6379:6379` | Cache + sessions |
| Laravel | `jobapp_laravel` | `8000:8000` | Backend API |
| Reverb | *(manual, see §3.9)* | `8001:8001` | WebSocket server |
| Redis Commander | `jobapp_redis_commander` | `8081:8081` | Redis GUI |
| Mongo Express | `jobapp_mongo_express` | `8082:8081` | MongoDB GUI |

### 3.4 Generate App Key & Run Migrations

```bash
# Generate APP_KEY
docker exec jobapp_laravel php artisan key:generate

# Run PostgreSQL migrations
docker exec jobapp_laravel php artisan migrate

# Setup MongoDB collections & indexes
docker exec jobapp_laravel php artisan mongo:setup
```

### 3.5 Verify Health

```bash
curl http://localhost:8000/api/health
# Expected: {"status":"ok","timestamp":"...","app":"JobSwipe","env":"local"}
```

### 3.6 Stripe Webhook Forwarding (for testing payments)

```bash
# In a separate terminal
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe

# This outputs a webhook signing secret like whsec_xxxxx
# Update STRIPE_WEBHOOK_SECRET in your .env with this value
```

### 3.7 Useful Dev Commands

```bash
# Tail Laravel logs
docker exec jobapp_laravel tail -f storage/logs/laravel.log

# Run artisan commands
docker exec jobapp_laravel php artisan tinker
docker exec jobapp_laravel php artisan route:list

# Restart Laravel only (after .env changes)
docker compose restart laravel

# Full rebuild
docker compose down && docker compose up -d --build

# Clear all caches
docker exec jobapp_laravel php artisan optimize:clear
```

### 3.8 Management UIs

| UI | URL | Purpose |
|----|-----|---------|
| Redis Commander | [http://localhost:8081](http://localhost:8081) | Browse Redis keys, swipe caches, sessions |
| Mongo Express | [http://localhost:8082](http://localhost:8082) | Browse MongoDB collections, swipe history, profiles |

### 3.9 Starting Laravel Reverb (WebSocket) — Dev

> [!NOTE]
> Reverb is **not started automatically** by the dev Docker Compose. It must be run as a separate process. `BROADCAST_CONNECTION` defaults to `null` — you must change it to `reverb` in `.env` first, then restart the Laravel container before starting Reverb.

```bash
# Step 1: Ensure BROADCAST_CONNECTION=reverb is set in your .env, then:
docker compose restart laravel

# Step 2: Start the Reverb WebSocket server inside the container
docker exec jobapp_laravel php artisan reverb:start \
  --host=0.0.0.0 \
  --port=8001 \
  --debug

# The server listens on ws://localhost:8001
# Clients connect using REVERB_APP_KEY, REVERB_HOST=localhost, REVERB_PORT=8001
```

**To keep Reverb running in the background during dev**, open a dedicated terminal tab for it. It will stream connection logs there.

**Quick test** — once running, send a test message and watch it broadcast:
```bash
# In a second terminal, trigger a broadcast via tinker
docker exec -it jobapp_laravel php artisan tinker
# >>> broadcast(new \App\Events\MatchMessageSent(...));
```

---

## 4. Production Setup (AWS EC2)

### 4.1 EC2 Instance Setup

**Recommended specs**: `t3.medium` (2 vCPU, 4 GB RAM) minimum.

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Docker
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Install Nginx
sudo yum install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Install Certbot for SSL
sudo yum install -y certbot python3-certbot-nginx

# Logout and re-login for docker group to take effect
exit
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 4.2 DNS Configuration

Point your domain registrar's DNS records to the EC2 Elastic IP:

| Type | Name | Value |
|------|------|-------|
| A | `jobswipe.site` | `<EC2-Elastic-IP>` |
| A | `www.jobswipe.site` | `<EC2-Elastic-IP>` |
| A | `api.jobswipe.site` | `<EC2-Elastic-IP>` |

> [!IMPORTANT]
> Wait for DNS propagation (5–30 min) before proceeding with SSL setup. Verify with `dig api.jobswipe.site`.

### 4.3 Clone & Configure for Production

```bash
# Clone the repo
cd /home/ec2-user
git clone git@github.com:your-org/JobSwipe.git
cd JobSwipe
```

### 4.4 Generate Secrets

```bash
# Generate APP_KEY
php -r "echo 'base64:' . base64_encode(random_bytes(32)) . PHP_EOL;"

# Generate JWT_SECRET
openssl rand -base64 32

# Generate database passwords
openssl rand -base64 24   # For PostgreSQL
openssl rand -base64 24   # For MongoDB
openssl rand -base64 24   # For Redis
```

### 4.5 Create Production `.env`

Create `.env` in the project root:

```env
# =============================================
# PRODUCTION .env — AWS EC2
# Place in project root (next to docker-compose.prod.yml)
# =============================================

# ── Application ──────────────────────────────
APP_NAME=JobSwipe
APP_ENV=production
APP_KEY=base64:GENERATED_KEY_HERE
APP_DEBUG=false
APP_URL=https://api.jobswipe.site

# ── Docker Images ────────────────────────────
BACKEND_IMAGE=gm1026/jobapp-backend
BACKEND_TAG=latest
FRONTEND_IMAGE=gm1026/jobapp-web
FRONTEND_TAG=latest

# ── PostgreSQL ───────────────────────────────
DB_CONNECTION=pgsql
DB_DATABASE=jobapp
DB_USERNAME=jobapp_user
DB_PASSWORD=GENERATED_PG_PASSWORD_HERE

# ── MongoDB ──────────────────────────────────
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=GENERATED_MONGO_PASSWORD_HERE
MONGO_DATABASE=jobapp

# ── Redis ────────────────────────────────────
REDIS_PASSWORD=GENERATED_REDIS_PASSWORD_HERE

# ── Auth ─────────────────────────────────────
JWT_SECRET=GENERATED_JWT_SECRET_HERE
BCRYPT_ROUNDS=12                 # Strong hashing for production

# ── Mail (SendGrid example) ─────────────────
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.your-sendgrid-api-key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@jobswipe.site
MAIL_FROM_NAME=JobSwipe

# ── Cloudflare R2 / AWS S3 ──────────────────
AWS_ACCESS_KEY_ID=your-r2-or-s3-access-key
AWS_SECRET_ACCESS_KEY=your-r2-or-s3-secret-key
AWS_DEFAULT_REGION=ap-southeast-1
AWS_BUCKET=jobswipe-uploads

# ── Stripe (LIVE keys) ──────────────────────
STRIPE_KEY=pk_live_xxxxxxxx
STRIPE_SECRET=sk_live_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxxxxxxx
STRIPE_BASIC_PRICE_ID=price_xxxxxxxx

# ── Apple IAP ────────────────────────────────
APPLE_IAP_SHARED_SECRET=your-apple-shared-secret
APPLE_IAP_BUNDLE_ID=com.jobswipe.app
APPLE_IAP_WEBHOOK_ENV=PROD
APPLE_IAP_WEBHOOK_STRICT_CERT_VALIDATION=true
APPLE_IAP_WEBHOOK_ROOT_CERT_PATHS=/var/www/html/storage/certs/apple_root_ca_g3.pem

# ── Google Play IAP ─────────────────────────
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=/var/www/html/storage/certs/google-service-account.json
GOOGLE_PLAY_PACKAGE_NAME=com.jobswipe.app
GOOGLE_PUBSUB_WEBHOOK_AUDIENCE=https://api.jobswipe.site
GOOGLE_PUBSUB_WEBHOOK_SERVICE_ACCOUNT=your-pubsub-sa@project.iam.gserviceaccount.com

# ── Google OAuth ─────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://api.jobswipe.site/api/v1/auth/google/callback

# ── Frontend URLs ────────────────────────────
FRONTEND_URL=https://jobswipe.site
NEXT_PUBLIC_API_URL=https://api.jobswipe.site
NEXT_PUBLIC_APP_URL=https://jobswipe.site
SANCTUM_STATEFUL_DOMAINS=jobswipe.site
SESSION_DOMAIN=.jobswipe.site

# ── Horizon ──────────────────────────────────
HORIZON_PREFIX=horizon:

# ── Laravel Reverb (WebSocket) ───────────────
BROADCAST_CONNECTION=reverb

REVERB_APP_ID=jobswipe-prod
REVERB_APP_KEY=GENERATE_RANDOM_32_CHAR_STRING
REVERB_APP_SECRET=GENERATE_RANDOM_32_CHAR_STRING
REVERB_HOST=api.jobswipe.site
REVERB_PORT=443
REVERB_SCHEME=https

# Reverb server binds internally on 6001; Nginx proxies 443 → 6001
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=6001

# ── Logging ──────────────────────────────────
LOG_CHANNEL=stderr
LOG_LEVEL=info
```

> [!CAUTION]
> **Never commit this file to git.** Add `.env` to `.gitignore`. Back it up in a secure password manager.

### 4.6 Setup Nginx Reverse Proxy

```bash
# Copy the nginx config
sudo cp deploy/nginx/jobapp.conf /etc/nginx/sites-available/jobapp

# Enable it
sudo ln -sf /etc/nginx/sites-available/jobapp /etc/nginx/sites-enabled/jobapp

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test & reload
sudo nginx -t
sudo systemctl reload nginx
```

The nginx config routes:
- `api.jobswipe.site` → `localhost:8080` (backend container)
- `jobswipe.site` / `www.jobswipe.site` → `localhost:3000` (frontend container)

### 4.7 Setup SSL with Let's Encrypt

```bash
# Obtain SSL certificates (Nginx must be running, DNS must point to EC2)
sudo certbot --nginx -d api.jobswipe.site
sudo certbot --nginx -d jobswipe.site -d www.jobswipe.site

# Certbot auto-updates the nginx config to include SSL directives
# Verify auto-renewal
sudo certbot renew --dry-run
```

### 4.8 Create Docker Network & Start Services

```bash
# Create the shared network
docker network create jobapp_network

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

This starts:

| Service | Container | Internal Port | Purpose |
|---------|-----------|---------------|---------|
| PostgreSQL 15 | `jobapp_postgres` | `5432` | Primary database |
| MongoDB 7 | `jobapp_mongodb` | `27017` | Document store |
| Redis 7 | `jobapp_redis` | `6379` | Cache + queue |
| Backend (PHP-FPM + Nginx) | `jobapp_backend` | `8080` | API server |
| Horizon Worker | `jobapp_horizon` | — | Async queue processing |
| **Reverb Worker** | `jobapp_reverb` | `6001` | WebSocket server |
| Frontend (Next.js) | `jobapp_frontend` | `3000` | Web app |

### 4.9 Run Migrations (First Deploy Only)

```bash
# Migrations run automatically via start.sh, but to run manually:
docker exec jobapp_backend php artisan migrate --force
docker exec jobapp_backend php artisan mongo:setup
```

---

## 5. Laravel Reverb (WebSocket Server)

### 5.1 Current State

> [!WARNING]
> Reverb is **installed but not running** anywhere in the current setup. `BROADCAST_CONNECTION` defaults to `null`, which means all WebSocket events (`MatchMessageSent`, `MatchTypingIndicator`, `MatchReadReceipt`) are silently dropped. You must explicitly enable and start it.

### 5.2 Enabling Reverb

Set the following in your `.env` (both dev and prod):

```env
BROADCAST_CONNECTION=reverb   # Was 'null' — this is the critical switch
```

Then generate credentials:

```bash
# Generate REVERB_APP_KEY and REVERB_APP_SECRET (32-char random strings)
openssl rand -hex 16   # Use output for REVERB_APP_KEY
openssl rand -hex 16   # Use output for REVERB_APP_SECRET
# REVERB_APP_ID can be any string, e.g. "jobswipe-prod"
```

### 5.3 Starting Reverb — Local Dev

```bash
# Inside the running container
docker exec jobapp_laravel php artisan reverb:start \
  --host=0.0.0.0 \
  --port=8001 \
  --debug

# WebSocket clients connect to: ws://localhost:8001/app/{REVERB_APP_KEY}
```

### 5.4 Adding Reverb to Production Docker Compose

Add this service to `docker-compose.prod.yml`:

```yaml
  reverb:
    image: ${BACKEND_IMAGE:-gm1026/jobapp-backend}:${BACKEND_TAG:-latest}
    container_name: jobapp_reverb
    restart: unless-stopped
    command: php artisan reverb:start --host=0.0.0.0 --port=6001
    environment:
      APP_NAME: ${APP_NAME:-JobSwipe}
      APP_ENV: production
      APP_KEY: ${APP_KEY}
      APP_DEBUG: false
      DB_CONNECTION: pgsql
      DB_HOST: postgres
      DB_PORT: 5432
      DB_DATABASE: ${DB_DATABASE:-jobapp}
      DB_USERNAME: ${DB_USERNAME:-jobapp}
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      REDIS_PORT: 6379
      BROADCAST_CONNECTION: reverb
      REVERB_APP_ID: ${REVERB_APP_ID}
      REVERB_APP_KEY: ${REVERB_APP_KEY}
      REVERB_APP_SECRET: ${REVERB_APP_SECRET}
      REVERB_SERVER_HOST: 0.0.0.0
      REVERB_SERVER_PORT: 6001
    ports:
      - "6001:6001"
    networks:
      - jobapp_network
    depends_on:
      redis:
        condition: service_healthy
      backend:
        condition: service_healthy
```

Then start it:

```bash
docker compose -f docker-compose.prod.yml up -d reverb
docker logs jobapp_reverb --tail=20  # Verify it started
```

### 5.5 Nginx WebSocket Proxy (Production)

Add a WebSocket location block to `/etc/nginx/sites-available/jobapp` inside the `api.jobswipe.site` server block:

```nginx
# Inside the api.jobswipe.site server block
# WebSocket endpoint for Reverb
location /app {
    proxy_pass http://localhost:6001;  # Reverb container port
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;  # Keep WS connections alive
    proxy_send_timeout 3600s;
}
```

After editing, reload nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Clients then connect to: `wss://api.jobswipe.site/app/{REVERB_APP_KEY}`

### 5.6 Verify Reverb is Working

```bash
# Dev — check the Reverb process output for connection logs
# You should see: "Server running on 0.0.0.0:8001"

# Prod — check logs
docker logs jobapp_reverb --tail=50 -f

# Quick WS connectivity test (install wscat: npm i -g wscat)
wscat -c "ws://localhost:8001/app/local-reverb-key?protocol=7&client=js&version=8.0.0&flash=false"
# Prod:
wscat -c "wss://api.jobswipe.site/app/YOUR_REVERB_APP_KEY?protocol=7&client=js&version=8.0.0&flash=false"

# Trigger a real broadcast via tinker
docker exec -it jobapp_laravel php artisan tinker
# >>> \Illuminate\Support\Facades\Broadcast::channel('test', fn() => true);
```

---

## 6. Verifying the Environment

### Local

```bash
# Health check
curl http://localhost:8000/api/health

# Test register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"role":"applicant","email":"test@example.com","password":"Str0ng!Pass#2026"}'

# Check OTP in logs (MAIL_MAILER=log)
docker exec jobapp_laravel cat storage/logs/laravel.log | grep -A5 "verification"
```

### Production

```bash
# Health check (should be HTTPS via Nginx)
curl https://api.jobswipe.site/api/health

# Test register
curl -X POST https://api.jobswipe.site/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"role":"applicant","email":"test@example.com","password":"Str0ng!Pass#2026"}'

# Check container logs
docker logs jobapp_backend --tail=50
docker logs jobapp_horizon --tail=50
```

---

## 7. Testing Tool Configurations

### Postman / Insomnia Setup

| Variable | Dev Value | Prod Value |
|----------|-----------|------------|
| `base_url` | `http://localhost:8000/api/v1` | `https://api.jobswipe.site/api/v1` |
| `token` | *(from login/register response)* | *(from login/register response)* |

**Global Headers** (set on the collection):
```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {{token}}
```

### cURL Template

```bash
# Set your environment
export BASE_URL="http://localhost:8000/api/v1"   # Dev
# export BASE_URL="https://api.jobswipe.site/api/v1"  # Prod

export TOKEN="your-bearer-token-here"

# Example: Get current user
curl -s "${BASE_URL}/auth/me" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ${TOKEN}" | jq .
```

---

## 8. Troubleshooting

### Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on `:8000` | Laravel container not running | `docker compose up -d laravel` |
| `SQLSTATE connection refused` | PostgreSQL not ready / wrong host | Ensure `DB_HOST=postgres` (Docker) or `127.0.0.1` (local PHP) |
| `MongoConnectionException` | MongoDB not ready / bad auth | Check `MONGO_ROOT_USERNAME`/`PASSWORD`, wait for healthcheck |
| `REDIS_PASSWORD` error on startup | Missing password env var | Ensure `.env` has `REDIS_PASSWORD` set |
| `419 CSRF token mismatch` | Sending form request without JSON | Add `Accept: application/json` header |
| `401 Unauthenticated` | Expired/invalid token | Re-login to get a new token |
| `403 EMAIL_NOT_VERIFIED` | Token is valid but email not verified | Call `verify-email` or `resend-verification` |
| `500` on webhook | Missing `STRIPE_WEBHOOK_SECRET` | Set it from `stripe listen` output (dev) or Stripe Dashboard (prod) |
| Horizon not processing jobs | `QUEUE_CONNECTION=sync` | Set to `redis` in prod; dev uses `sync` intentionally |
| SSL cert errors | DNS not propagated | Wait for DNS, verify with `dig api.jobswipe.site` |
| WebSocket events not received | `BROADCAST_CONNECTION=null` | Set to `reverb` in `.env` and start the Reverb process |
| Reverb `401 Forbidden` on WS connect | Wrong `REVERB_APP_KEY` | Ensure client key matches `REVERB_APP_KEY` in `.env` |
| WS connection drops immediately | `proxy_read_timeout` too short in nginx | Set `proxy_read_timeout 3600s` in the `/app` location block |

### Useful Debug Commands

```bash
# ── Container Status ─────────────────────────
docker compose ps                    # Dev
docker compose -f docker-compose.prod.yml ps  # Prod

# ── Logs ─────────────────────────────────────
docker logs jobapp_backend --tail=100 -f
docker logs jobapp_horizon --tail=100 -f
docker logs jobapp_postgres --tail=50

# ── Database Access ──────────────────────────
# PostgreSQL
docker exec -it jobapp_postgres psql -U postgres -d jobapp

# MongoDB
docker exec -it jobapp_mongodb mongosh -u root -p secret_mongo_pass_123

# Redis
docker exec -it jobapp_redis redis-cli -a secret_redis_pass_123

# ── Laravel Artisan ──────────────────────────
docker exec jobapp_laravel php artisan route:list --compact
docker exec jobapp_laravel php artisan queue:failed
docker exec jobapp_laravel php artisan horizon:status
docker exec jobapp_laravel php artisan tinker

# ── Restart Services ─────────────────────────
docker compose restart               # Dev: restart all
docker compose -f docker-compose.prod.yml restart backend  # Prod: restart backend only

# ── Nuclear Option (full rebuild) ────────────
docker compose down -v && docker compose up -d --build
```

### EC2 Security Group Rules

Ensure your EC2 security group allows:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | `0.0.0.0/0` | HTTP (Nginx → redirect to HTTPS) |
| 443 | TCP | `0.0.0.0/0` | HTTPS (Nginx → backend/frontend) |

> [!WARNING]
> **Never** expose ports `5432` (PostgreSQL), `27017` (MongoDB), `6379` (Redis), or `8080` (backend direct) to the public internet. Only Nginx (80/443) should be publicly accessible. The Docker containers communicate via the internal `jobapp_network` bridge.
