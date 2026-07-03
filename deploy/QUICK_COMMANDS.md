# Quick Commands Reference

## On Your EC2 Instance

### Deploy/Update Application
```bash
cd ~/jobapp
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs jobapp_backend -f
docker logs jobapp_horizon -f
docker logs jobapp_reverb -f
docker logs jobapp_frontend -f
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
docker-compose -f docker-compose.prod.yml restart horizon
docker-compose -f docker-compose.prod.yml restart reverb
```

### Check Status
```bash
# Container status
docker-compose -f docker-compose.prod.yml ps

# Resource usage
docker stats

# Disk usage
docker system df
df -h
```

### Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/api.error.log
sudo tail -f /var/log/nginx/ws.error.log
```

### SSL Certificate Management
```bash
# Renew certificates
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### Database Access
```bash
# PostgreSQL
docker exec -it jobapp_postgres psql -U jobapp_user -d jobapp

# MongoDB
docker exec -it jobapp_mongodb mongosh -u admin -p

# Redis
docker exec -it jobapp_redis redis-cli -a $REDIS_PASSWORD
```

### Cleanup
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (careful!)
docker system prune -a --volumes
```

## From Your Local Machine

### Upload Files to EC2
```bash
# Upload docker-compose
scp deploy/docker-compose.prod.yml ubuntu@your-ec2-ip:~/jobapp/

# Upload nginx config
scp deploy/nginx/jobapp-ec2.conf ubuntu@your-ec2-ip:~/jobapp/nginx/

# Upload .env file
scp deploy/.env.production ubuntu@your-ec2-ip:~/jobapp/
```

### Build and Push Docker Image
```bash
# Backend
cd JobSwipe
docker build -t gm1026/jobapp-backend:latest -f Dockerfile .
docker push gm1026/jobapp-backend:latest

# Frontend (if you have a separate Dockerfile)
cd frontend/web
docker build -t gm1026/jobapp-web:latest .
docker push gm1026/jobapp-web:latest
```

### SSH to EC2
```bash
ssh ubuntu@your-ec2-ip
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs jobapp_backend --tail 100

# Check if port is in use
sudo netstat -tulpn | grep 8080

# Remove and recreate
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Horizon Not Processing Jobs
```bash
# Check Horizon logs
docker logs jobapp_horizon --tail 100

# Restart Horizon
docker-compose -f docker-compose.prod.yml restart horizon

# Check Redis connection
docker exec jobapp_redis redis-cli -a $REDIS_PASSWORD ping
```

### WebSocket Connection Failed
```bash
# Check Reverb logs
docker logs jobapp_reverb --tail 100

# Test local connection
curl http://localhost:8090

# Check nginx WebSocket config
sudo nginx -t
sudo tail -f /var/log/nginx/ws.error.log
```

### Database Connection Issues
```bash
# Check if databases are running
docker ps | grep postgres
docker ps | grep mongodb

# Check database logs
docker logs jobapp_postgres --tail 50
docker logs jobapp_mongodb --tail 50

# Restart databases
docker-compose -f docker-compose.prod.yml restart postgres mongodb
```

### Out of Disk Space
```bash
# Check disk usage
df -h
docker system df

# Clean up
docker system prune -a
docker volume prune

# Remove old logs
sudo journalctl --vacuum-time=7d
```

## Health Checks

```bash
# Backend API
curl http://localhost:8080/api/health
curl https://api.yourdomain.com/api/health

# Frontend
curl http://localhost:3000
curl https://yourdomain.com

# Reverb WebSocket (from browser console)
# const ws = new WebSocket('wss://ws.yourdomain.com');
# ws.onopen = () => console.log('Connected!');

# Check all containers
docker-compose -f docker-compose.prod.yml ps
```

## Emergency Procedures

### Complete Restart
```bash
cd ~/jobapp
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Rollback to Previous Image
```bash
# Pull specific version
docker pull gm1026/jobapp-backend:v1.2.3
docker tag gm1026/jobapp-backend:v1.2.3 gm1026/jobapp-backend:latest

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

### Database Backup
```bash
# PostgreSQL backup
docker exec jobapp_postgres pg_dump -U jobapp_user jobapp > backup_$(date +%Y%m%d).sql

# MongoDB backup
docker exec jobapp_mongodb mongodump --username admin --authenticationDatabase admin --out /tmp/backup
docker cp jobapp_mongodb:/tmp/backup ./mongodb_backup_$(date +%Y%m%d)
```

### Database Restore
```bash
# PostgreSQL restore
cat backup_20260416.sql | docker exec -i jobapp_postgres psql -U jobapp_user -d jobapp

# MongoDB restore
docker cp ./mongodb_backup_20260416 jobapp_mongodb:/tmp/restore
docker exec jobapp_mongodb mongorestore --username admin --authenticationDatabase admin /tmp/restore
```
