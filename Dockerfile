# Production Dockerfile for Render deployment
FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
    curl git zip unzip postgresql-dev libpq libzip-dev \
    oniguruma-dev autoconf g++ make nginx supervisor

RUN docker-php-ext-install pdo pdo_pgsql bcmath mbstring zip pcntl

RUN pecl install mongodb && docker-php-ext-enable mongodb

# Install Redis extension for queue support
RUN pecl install redis && docker-php-ext-enable redis

# Configure PHP-FPM to log to stderr/stdout for Render
RUN echo "catch_workers_output = yes" >> /usr/local/etc/php-fpm.d/docker.conf && \
    echo "decorate_workers_output = no" >> /usr/local/etc/php-fpm.d/docker.conf && \
    echo "php_admin_flag[log_errors] = on" >> /usr/local/etc/php-fpm.d/docker.conf && \
    echo "php_admin_value[error_log] = /proc/self/fd/2" >> /usr/local/etc/php-fpm.d/docker.conf

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY backend/ .

# Update composer dependencies to be compatible with PHP 8.2
RUN composer update --no-interaction --prefer-dist --no-scripts --with-all-dependencies || true
RUN composer install --optimize-autoloader --no-interaction --prefer-dist --no-scripts

# CRITICAL FIX: Hide Laravel from Render's auto-detection
# Render detects Laravel from both 'artisan' and 'composer.json' files
# and runs pre-deploy commands (migrate, route:cache) BEFORE our container starts.
# We rename them during build, then restore them in start.sh.
RUN mv artisan artisan.hidden && \
    mv composer.json composer.json.hidden && \
    mv composer.lock composer.lock.hidden

# No longer need the flag file approach since Render won't detect Laravel
RUN mkdir -p storage/logs storage/framework/cache/data \
    storage/framework/sessions storage/framework/views \
    bootstrap/cache resources/views && \
    chmod -R 775 storage bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

COPY <<EOF /etc/nginx/nginx.conf
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    sendfile on; tcp_nopush on; tcp_nodelay on;
    keepalive_timeout 65; types_hash_max_size 2048;
    
    server {
        listen 8080;
        server_name _;
        root /var/www/html/public;
        index index.php;
        
        location / {
            try_files \$uri \$uri/ /index.php?\$query_string;
        }
        
        location ~ \.php$ {
            fastcgi_pass 127.0.0.1:9000;
            fastcgi_index index.php;
            fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
            include fastcgi_params;
        }
        
        location ~ /\.ht { deny all; }
    }
}
EOF

COPY <<EOF /etc/supervisor/conf.d/supervisord.conf
[supervisord]
nodaemon=true
user=root
loglevel=info

[program:php-fpm]
command=php-fpm
autostart=true
autorestart=true
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
EOF

COPY <<EOF /start.sh
#!/bin/sh
set -e

# CRITICAL: Restore files that were hidden from Render's detection
if [ -f artisan.hidden ]; then
    mv artisan.hidden artisan
    echo "Restored artisan file"
fi
if [ -f composer.json.hidden ]; then
    mv composer.json.hidden composer.json
    mv composer.lock.hidden composer.lock
    echo "Restored composer files"
fi

# Check if running as Reverb WebSocket server
if [ "\$RUN_REVERB" = "true" ]; then
    echo "=== Starting Laravel Reverb WebSocket Server ==="
    
    # Log environment for debugging
    echo "Environment check:"
    echo "  REVERB_HOST: \$REVERB_HOST"
    echo "  REVERB_PORT: \$REVERB_PORT"
    echo "  REVERB_SERVER_HOST: \$REVERB_SERVER_HOST"
    echo "  REDIS_HOST: \$REDIS_HOST"
    
    # Wait for Redis
    echo "Waiting for Redis..."
    RETRY_COUNT=0; MAX_RETRIES=30
    until php -r "\\\$r = new Redis(); \\\$r->connect('\$REDIS_HOST', \$REDIS_PORT); \\\$r->ping();" 2>/dev/null || [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; do
        RETRY_COUNT=\$((RETRY_COUNT + 1))
        if [ \$RETRY_COUNT -lt \$MAX_RETRIES ]; then
            echo "  not ready (\$RETRY_COUNT/\$MAX_RETRIES)..."
            sleep 2
        fi
    done
    
    if [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; then
        echo "ERROR: Redis timeout"
        exit 1
    fi
    
    echo "Redis ready."
    
    # Clear config cache to pick up new settings
    echo "Clearing config cache..."
    php artisan config:clear 2>/dev/null || true
    
    echo "Starting Reverb..."
    exec php artisan reverb:start --host=\${REVERB_HOST:-0.0.0.0} --port=\${REVERB_PORT:-8090}
fi

# Check if running as Horizon worker
if [ "\$RUN_HORIZON" = "true" ]; then
    echo "=== Starting Laravel Horizon Worker ==="
    
    # Log environment for debugging
    echo "Environment check:"
    echo "  QUEUE_CONNECTION: \$QUEUE_CONNECTION"
    echo "  MAIL_MAILER: \$MAIL_MAILER"
    echo "  MAIL_HOST: \$MAIL_HOST"
    echo "  REDIS_HOST: \$REDIS_HOST"
    
    # Wait for Redis
    echo "Waiting for Redis..."
    RETRY_COUNT=0; MAX_RETRIES=30
    until php -r "\\\$r = new Redis(); \\\$r->connect('\$REDIS_HOST', \$REDIS_PORT); \\\$r->ping();" 2>/dev/null || [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; do
        RETRY_COUNT=\$((RETRY_COUNT + 1))
        if [ \$RETRY_COUNT -lt \$MAX_RETRIES ]; then
            echo "  not ready (\$RETRY_COUNT/\$MAX_RETRIES)..."
            sleep 2
        fi
    done
    
    if [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; then
        echo "ERROR: Redis timeout"
        exit 1
    fi
    
    echo "Redis ready."
    
    # Clear config cache to pick up new settings
    echo "Clearing config cache..."
    php artisan config:clear 2>/dev/null || true
    
    echo "Starting Horizon..."
    exec php artisan horizon
fi

# Otherwise run web server
echo "=== Starting JobApp Backend ==="

# Clear any stale caches (shouldn't exist since Render didn't detect Laravel)
echo "Clearing any existing caches..."
rm -f /var/www/html/bootstrap/cache/routes-*.php
rm -f /var/www/html/bootstrap/cache/config.php

if [ "\$SKIP_MIGRATIONS" != "true" ]; then
    echo "Waiting for PostgreSQL..."
    RETRY_COUNT=0; MAX_RETRIES=30
    until php -r "new PDO('pgsql:host=\$DB_HOST;port=\$DB_PORT;dbname=\$DB_DATABASE', '\$DB_USERNAME', '\$DB_PASSWORD');" 2>/dev/null || [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; do
        RETRY_COUNT=\$((RETRY_COUNT + 1))
        if [ \$RETRY_COUNT -lt \$MAX_RETRIES ]; then
            echo "  not ready (\$RETRY_COUNT/\$MAX_RETRIES)..."
            sleep 2
        fi
    done
    
    if [ \$RETRY_COUNT -eq \$MAX_RETRIES ]; then
        echo "WARNING: PostgreSQL timeout, skipping migrations"
    else
        echo "PostgreSQL ready."
        
        php artisan config:clear 2>/dev/null || true
        php artisan cache:clear  2>/dev/null || true
        php artisan route:clear  2>/dev/null || true
        php artisan view:clear   2>/dev/null || true
        
        echo "Running migrations..."
        php artisan migrate --force 2>&1 || { echo "Migration failed"; exit 1; }
        
        echo "Setting up MongoDB..."
        php artisan mongo:setup || echo "WARNING: MongoDB setup non-critical, continuing"
        
        echo "Caching configuration and routes..."
        php artisan config:cache
        
        # IMPORTANT: Clear route cache before caching to pick up new routes
        php artisan route:clear 2>/dev/null || true
        php artisan route:cache
        
        if ls /var/www/html/bootstrap/cache/routes-*.php 2>/dev/null; then
            echo "Route cache created successfully."
        else
            echo "WARNING: No route cache written"
        fi
        
        [ -d resources/views ] && php artisan view:cache || true
        
        echo "Startup caching complete."
    fi
else
    echo "SKIP_MIGRATIONS=true — skipping."
fi

echo "=== Startup complete ==="
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
EOF

RUN chmod +x /start.sh

EXPOSE 8080

ENTRYPOINT ["/start.sh"]
