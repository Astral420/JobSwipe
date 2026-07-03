# How Horizon & Reverb Work in Your Docker Setup

## The Magic: One Image, Three Modes

Your `Dockerfile` creates a single image that can run in three different modes. Think of it like a Swiss Army knife - same tool, different functions.

### The Secret Sauce: `/start.sh`

The entrypoint script checks environment variables to decide what to run:

```bash
#!/bin/sh

# Mode 1: Reverb WebSocket Server
if [ "$RUN_REVERB" = "true" ]; then
    exec php artisan reverb:start
fi

# Mode 2: Horizon Queue Worker
if [ "$RUN_HORIZON" = "true" ]; then
    exec php artisan horizon
fi

# Mode 3: Web Server (default)
exec supervisord  # Runs nginx + PHP-FPM
```

## Why This Approach?

### Traditional Approach (Multiple Dockerfiles)
```
❌ backend/Dockerfile       → gm1026/jobapp-backend:latest
❌ horizon/Dockerfile       → gm1026/jobapp-horizon:latest
❌ reverb/Dockerfile        → gm1026/jobapp-reverb:latest
```

Problems:
- 3 separate builds
- 3 separate pushes
- Code can get out of sync
- More maintenance

### Your Approach (Single Dockerfile)
```
✅ Dockerfile → gm1026/jobapp-backend:latest
   ├─ Used by: backend service
   ├─ Used by: horizon service (RUN_HORIZON=true)
   └─ Used by: reverb service (RUN_REVERB=true)
```

Benefits:
- Single build process
- Always in sync
- Faster deployments
- Less storage

## How It Works in docker-compose.prod.yml

```yaml
services:
  # Service 1: Web Server
  backend:
    image: gm1026/jobapp-backend:latest
    ports: ["8080:8080"]
    # No special env var → runs nginx + PHP-FPM

  # Service 2: Queue Worker
  horizon:
    image: gm1026/jobapp-backend:latest  # Same image!
    environment:
      RUN_HORIZON: "true"  # This triggers Horizon mode
    # No exposed ports needed

  # Service 3: WebSocket Server
  reverb:
    image: gm1026/jobapp-backend:latest  # Same image!
    ports: ["8090:8090"]
    environment:
      RUN_REVERB: "true"  # This triggers Reverb mode
```

## What Each Service Does

### Backend Container (Port 8080)
**Purpose**: Handle HTTP API requests

**What runs inside**:
- nginx (web server)
- PHP-FPM (PHP processor)
- Your Laravel application

**Handles**:
- `/api/v1/auth/login`
- `/api/v1/jobs`
- `/api/v1/swipes`
- All REST API endpoints

**Logs**:
```bash
docker logs jobapp_backend
```

### Horizon Container (No exposed port)
**Purpose**: Process background jobs from Redis queue

**What runs inside**:
- `php artisan horizon` (queue worker supervisor)

**Handles**:
- Sending emails (SendWelcomeEmail, MatchNotificationMail)
- Processing swipes (ResetDailySwipesJob)
- Expiring subscriptions (ExpireApplicantSubscriptionsJob)
- Any job dispatched with `dispatch()` or `Job::dispatch()`

**Logs**:
```bash
docker logs jobapp_horizon
```

**Why separate container?**
- Can restart without affecting API
- Can scale independently (run multiple Horizon workers)
- Isolated resource limits

### Reverb Container (Port 8090)
**Purpose**: Handle WebSocket connections for real-time features

**What runs inside**:
- `php artisan reverb:start` (WebSocket server)

**Handles**:
- Real-time chat messages
- Live notifications
- Typing indicators
- Match updates
- Any event broadcast with `broadcast()`

**Logs**:
```bash
docker logs jobapp_reverb
```

**Why separate container?**
- WebSocket connections are long-lived (different from HTTP)
- Can scale independently
- Isolated from API request/response cycle

## The Flow: How They Work Together

### Example 1: User Swipes Right on a Job

```
1. Mobile App → POST /api/v1/swipes
                    ↓
2. Backend Container (jobapp_backend)
   - Receives request
   - SwipeController → SwipeService
   - Saves swipe to database
   - Checks for match
   - If match: dispatch(SendMatchNotification::class)
   - Returns response
                    ↓
3. Redis Queue
   - Job stored: SendMatchNotification
                    ↓
4. Horizon Container (jobapp_horizon)
   - Picks up job from Redis
   - Executes SendMatchNotification
   - Sends email via SMTP
   - Broadcasts MatchCreated event
                    ↓
5. Reverb Container (jobapp_reverb)
   - Receives broadcast event
   - Pushes to connected WebSocket clients
                    ↓
6. Mobile App
   - Receives real-time notification
   - Shows "It's a match!" popup
```

### Example 2: Real-time Chat Message

```
1. Mobile App → POST /api/v1/matches/{id}/messages
                    ↓
2. Backend Container
   - Saves message to database
   - Broadcasts MessageSent event
   - Returns response
                    ↓
3. Reverb Container
   - Receives broadcast
   - Pushes to recipient's WebSocket connection
                    ↓
4. Recipient's Mobile App
   - Receives message instantly
   - Updates chat UI
```

## Nginx's Role

Nginx on EC2 acts as a reverse proxy and routes traffic:

```
Internet → Nginx (EC2) → Docker Containers

api.yourdomain.com:443
    ↓
Nginx (:80)
    ↓
Backend Container (:8080)

ws.yourdomain.com:443
    ↓
Nginx (:80) [WebSocket upgrade]
    ↓
Reverb Container (:8090)

yourdomain.com:443
    ↓
Nginx (:80)
    ↓
Frontend Container (:3000)
```

### Why Nginx?

1. **SSL Termination**: Handles HTTPS, containers use HTTP
2. **WebSocket Upgrade**: Converts HTTP to WebSocket protocol
3. **Load Balancing**: Can distribute to multiple containers
4. **Static Files**: Can serve static assets directly
5. **Security**: Hides internal ports, adds security headers

## Common Questions

### Q: Why not use Laravel's built-in queue worker?

**A**: Horizon is Laravel's queue worker, but with superpowers:
- Beautiful dashboard at `/horizon`
- Auto-scaling workers based on load
- Failed job management
- Metrics and monitoring
- Better than `php artisan queue:work`

### Q: Why not use Pusher or Ably instead of Reverb?

**A**: Reverb is Laravel's official WebSocket server (released 2024):
- Free (no per-message costs)
- Self-hosted (full control)
- Integrated with Laravel Broadcasting
- Simpler than setting up Socket.io or Soketi

### Q: Can I run Horizon and Reverb in the same container?

**A**: Technically yes (using supervisord), but not recommended:
- Harder to scale independently
- Harder to debug issues
- Restart one = restart both
- Resource limits affect both

### Q: How does Horizon start "instantly" after Docker build?

**A**: It doesn't build anything - it just runs:
1. Docker image is pre-built with all code
2. Container starts
3. `/start.sh` checks `RUN_HORIZON=true`
4. Executes `php artisan horizon`
5. Horizon connects to Redis and starts processing

No compilation, no build step - just execution.

### Q: What if Horizon crashes?

**A**: Docker's `restart: unless-stopped` policy:
- Container exits
- Docker automatically restarts it
- Horizon starts again
- Continues processing jobs

### Q: How do I scale Horizon?

**A**: Run multiple Horizon containers:

```yaml
horizon_1:
  image: gm1026/jobapp-backend:latest
  environment:
    RUN_HORIZON: "true"

horizon_2:
  image: gm1026/jobapp-backend:latest
  environment:
    RUN_HORIZON: "true"

horizon_3:
  image: gm1026/jobapp-backend:latest
  environment:
    RUN_HORIZON: "true"
```

All will pull from the same Redis queue.

### Q: How do I scale Reverb?

**A**: More complex - requires Redis pub/sub or sticky sessions:
- Single Reverb instance: Simple, works for most apps
- Multiple Reverb instances: Need load balancer with sticky sessions
- Horizontal scaling: Use Redis adapter for pub/sub

For most apps, one Reverb instance handles thousands of connections.

## Monitoring

### Check if services are running
```bash
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE                          STATUS    PORTS
abc123         gm1026/jobapp-backend:latest   Up        0.0.0.0:8080->8080/tcp   (backend)
def456         gm1026/jobapp-backend:latest   Up                                 (horizon)
ghi789         gm1026/jobapp-backend:latest   Up        0.0.0.0:8090->8090/tcp   (reverb)
```

### Check Horizon dashboard
```
https://api.yourdomain.com/horizon
```

### Check Reverb connections
```bash
docker logs jobapp_reverb | grep "Client connected"
```

### Test WebSocket from browser console
```javascript
const ws = new WebSocket('wss://ws.yourdomain.com');
ws.onopen = () => console.log('✅ Connected to Reverb');
ws.onerror = (e) => console.error('❌ Connection failed', e);
ws.onmessage = (msg) => console.log('📨 Message:', msg.data);
```

## Summary

Your setup is elegant and efficient:
- **One Docker image** serves three purposes
- **Environment variables** control the mode
- **Separate containers** allow independent scaling and restarts
- **Nginx** routes traffic to the right container
- **Redis** connects everything (cache, queues, pub/sub)

This is a production-ready architecture used by many Laravel applications.
