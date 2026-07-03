# Admin Subdomain Setup Guide

This guide explains how to deploy the admin panel on a separate subdomain (`admin.jobswipe.site`) while keeping the main app on the root domain (`jobswipe.site`).

## Architecture Overview

```
jobswipe.site
├── Main Next.js app (user-facing)
├── Landing page, login, dashboard
└── Port: 3000

admin.jobswipe.site
├── Same Next.js codebase
├── Admin-only routes
└── Port: 3001

api.jobswipe.site (optional)
├── Laravel backend API
└── Port: 8000
```

## Benefits of This Approach

- ✅ Single codebase - easier maintenance
- ✅ Shared components and utilities
- ✅ Separate deployments for security
- ✅ Different access controls per subdomain
- ✅ Independent scaling

---

## Step 1: Create Admin-Specific Next.js Config

Create a separate config file for the admin build:

```bash
cd JobSwipe/frontend/web
```

Create `next.config.admin.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  // Environment variables for admin
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.jobswipe.site/api',
    NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
    NEXT_PUBLIC_APP_TYPE: 'admin', // Identify this as admin build
  },

  // Redirect root to admin dashboard
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/users',
        permanent: false,
      },
      // Redirect non-admin routes to main site
      {
        source: '/login',
        destination: 'https://jobswipe.site/login',
        permanent: false,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.jobswipe.site',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jobswipe.site',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  turbopack: {},
};

module.exports = nextConfig;
```

Update main `next.config.js` to redirect admin routes:

```javascript
// Add to existing next.config.js
async redirects() {
  return [
    {
      source: '/dashboard/users/:path*',
      destination: 'https://admin.jobswipe.site/dashboard/users/:path*',
      permanent: true,
    },
    {
      source: '/dashboard/trust/:path*',
      destination: 'https://admin.jobswipe.site/dashboard/trust/:path*',
      permanent: true,
    },
    // Add other admin-only routes
  ];
},
```

---

## Step 2: Create Middleware for Admin Protection

Create or update `JobSwipe/frontend/web/src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isAdminSubdomain = hostname.startsWith('admin.');
  
  // Get auth info from cookies
  const authToken = request.cookies.get('auth_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  
  // Admin subdomain protection
  if (isAdminSubdomain) {
    // Check if user is authenticated
    if (!authToken) {
      return NextResponse.redirect(new URL('https://jobswipe.site/login', request.url));
    }
    
    // Check if user has admin role
    if (userRole !== 'super_admin' && userRole !== 'moderator') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    // Allow access to admin routes
    return NextResponse.next();
  }
  
  // Main site - block admin routes
  const path = request.nextUrl.pathname;
  const adminPaths = ['/dashboard/users', '/dashboard/trust', '/dashboard/reviews'];
  
  if (adminPaths.some(adminPath => path.startsWith(adminPath))) {
    return NextResponse.redirect(new URL('https://admin.jobswipe.site' + path, request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## Step 3: Create Deployment Scripts

Create `JobSwipe/frontend/web/scripts/deploy-admin.sh`:

```bash
#!/bin/bash

echo "🚀 Building Admin Panel..."

# Set environment
export NODE_ENV=production
export NEXT_PUBLIC_APP_TYPE=admin

# Build using admin config
npm run build -- --config next.config.admin.js

echo "✅ Admin build complete!"
```

Create `JobSwipe/frontend/web/scripts/deploy-main.sh`:

```bash
#!/bin/bash

echo "🚀 Building Main App..."

# Set environment
export NODE_ENV=production
export NEXT_PUBLIC_APP_TYPE=main

# Build using main config
npm run build

echo "✅ Main app build complete!"
```

Make scripts executable:

```bash
chmod +x scripts/deploy-admin.sh
chmod +x scripts/deploy-main.sh
```

---

## Step 4: Configure PM2 for Process Management

Create `JobSwipe/frontend/web/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'jobswipe-main',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/JobSwipe/frontend/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_APP_TYPE: 'main',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'jobswipe-admin',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/JobSwipe/frontend/web',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_PUBLIC_APP_TYPE: 'admin',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
```

---

## Step 5: Configure Nginx Reverse Proxy

Create or update `/etc/nginx/sites-available/jobswipe`:

```nginx
# Main app - jobswipe.site
server {
    listen 80;
    listen [::]:80;
    server_name jobswipe.site www.jobswipe.site;
    
    # Redirect to HTTPS (Cloudflare handles SSL)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Admin subdomain - admin.jobswipe.site
server {
    listen 80;
    listen [::]:80;
    server_name admin.jobswipe.site;
    
    # Additional security for admin
    location / {
        # Rate limiting (optional)
        limit_req zone=admin_limit burst=10 nodelay;
        
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# API subdomain - api.jobswipe.site (optional)
server {
    listen 80;
    listen [::]:80;
    server_name api.jobswipe.site;
    
    root /var/www/JobSwipe/backend/public;
    index index.php;
    
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
    
    location ~ /\.(?!well-known).* {
        deny all;
    }
}

# Rate limiting zone for admin (add to http block in nginx.conf)
# limit_req_zone $binary_remote_addr zone=admin_limit:10m rate=10r/s;
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/jobswipe /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Configure Cloudflare DNS

Add these DNS records in your Cloudflare dashboard:

| Type | Name  | Content        | Proxy Status | TTL  |
|------|-------|----------------|--------------|------|
| A    | @     | YOUR_EC2_IP    | Proxied      | Auto |
| A    | www   | YOUR_EC2_IP    | Proxied      | Auto |
| A    | admin | YOUR_EC2_IP    | Proxied      | Auto |
| A    | api   | YOUR_EC2_IP    | Proxied      | Auto |

**Cloudflare Settings:**

1. **SSL/TLS**: Set to "Full" or "Full (strict)"
2. **Always Use HTTPS**: Enable
3. **Automatic HTTPS Rewrites**: Enable
4. **Minimum TLS Version**: 1.2
5. **Firewall Rules** (optional): Add rule to restrict admin subdomain by IP

---

## Step 7: Deploy to EC2

SSH into your EC2 instance:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### Initial Setup

```bash
# Navigate to project
cd /var/www/JobSwipe/frontend/web

# Install dependencies
npm install

# Install PM2 globally if not installed
sudo npm install -g pm2

# Build both apps
npm run build                          # Main app
npm run build -- --config next.config.admin.js  # Admin app
```

### Start Applications

```bash
# Using PM2 ecosystem file
pm2 start ecosystem.config.js

# Or start individually
pm2 start npm --name "jobswipe-main" -- start -- -p 3000
pm2 start npm --name "jobswipe-admin" -- start -- -p 3001

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs jobswipe-main
pm2 logs jobswipe-admin

# Monitor
pm2 monit
```

---

## Step 8: Environment Variables

Create `.env.production` for main app:

```bash
NEXT_PUBLIC_API_URL=https://api.jobswipe.site/api
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_APP_TYPE=main
NODE_ENV=production
PORT=3000
```

Create `.env.admin` for admin app:

```bash
NEXT_PUBLIC_API_URL=https://api.jobswipe.site/api
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_APP_TYPE=admin
NODE_ENV=production
PORT=3001
```

---

## Step 9: Testing

### Local Testing

```bash
# Terminal 1 - Main app
PORT=3000 npm run dev

# Terminal 2 - Admin app (with admin config)
PORT=3001 npm run dev -- --config next.config.admin.js
```

Test URLs:
- Main: http://localhost:3000
- Admin: http://localhost:3001

### Production Testing

After deployment, test:

1. **Main site**: https://jobswipe.site
2. **Admin panel**: https://admin.jobswipe.site
3. **API**: https://api.jobswipe.site/api/v1/health

### Security Testing

```bash
# Test admin access without auth
curl -I https://admin.jobswipe.site/dashboard/users

# Should redirect to login or return 403

# Test with valid admin token
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     https://admin.jobswipe.site/dashboard/users
```

---

## Step 10: Continuous Deployment

Create `JobSwipe/.github/workflows/deploy-subdomains.yml`:

```yaml
name: Deploy Main & Admin

on:
  push:
    branches: [main]
    paths:
      - 'frontend/web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/JobSwipe
            git pull origin main
            
            cd frontend/web
            npm install
            
            # Build main app
            npm run build
            
            # Build admin app
            npm run build -- --config next.config.admin.js
            
            # Restart PM2 apps
            pm2 restart jobswipe-main
            pm2 restart jobswipe-admin
```

---

## Maintenance Commands

### Update Deployment

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Pull latest code
cd /var/www/JobSwipe
git pull origin main

# Rebuild and restart
cd frontend/web
npm install
npm run build
npm run build -- --config next.config.admin.js

pm2 restart jobswipe-main
pm2 restart jobswipe-admin
```

### Monitor Logs

```bash
# Real-time logs
pm2 logs

# Specific app logs
pm2 logs jobswipe-main --lines 100
pm2 logs jobswipe-admin --lines 100

# Error logs only
pm2 logs --err
```

### Restart Services

```bash
# Restart specific app
pm2 restart jobswipe-main
pm2 restart jobswipe-admin

# Restart all
pm2 restart all

# Reload (zero-downtime)
pm2 reload jobswipe-main
```

---

## Troubleshooting

### Issue: Admin subdomain not accessible

**Check:**
1. DNS propagation: `dig admin.jobswipe.site`
2. Nginx config: `sudo nginx -t`
3. PM2 status: `pm2 status`
4. Port availability: `sudo netstat -tlnp | grep 3001`

### Issue: 502 Bad Gateway

**Solution:**
```bash
# Check if Next.js is running
pm2 status

# Restart the app
pm2 restart jobswipe-admin

# Check logs
pm2 logs jobswipe-admin --err
```

### Issue: Middleware not working

**Check:**
1. Middleware file location: `src/middleware.ts`
2. Cookie names match your auth implementation
3. Hostname detection: `console.log(request.headers.get('host'))`

### Issue: Build fails

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

## Security Checklist

- [ ] Admin routes protected by middleware
- [ ] Role-based access control implemented
- [ ] HTTPS enforced via Cloudflare
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled for admin subdomain
- [ ] Firewall rules configured (optional)
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting set up

---

## Next Steps

1. Set up monitoring (e.g., PM2 Plus, Datadog)
2. Configure automated backups
3. Set up error tracking (e.g., Sentry)
4. Implement log aggregation
5. Add health check endpoints
6. Configure auto-scaling (if needed)

---

## Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Cloudflare DNS](https://developers.cloudflare.com/dns/)
