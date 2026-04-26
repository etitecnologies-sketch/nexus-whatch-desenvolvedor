# Deployment Guide - Nexus Watch

Complete guide for deploying Nexus Watch to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Platforms](#cloud-platforms)
5. [Database Setup](#database-setup)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)

## Pre-Deployment Checklist

- [ ] All tests passing: `pnpm test`
- [ ] TypeScript compilation successful: `pnpm check`
- [ ] Code formatted: `pnpm format`
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates obtained
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Security audit completed
- [ ] Performance testing done

## Environment Configuration

### Production Environment Variables

Create `.env.production` with:

```bash
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=mysql://user:password@db-host:3306/nexus_watch

# Authentication
JWT_SECRET=your_very_secure_jwt_secret_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
BUILT_IN_FORGE_API_KEY=your_production_api_key
BUILT_IN_FORGE_API_URL=https://api.your-domain.com
VITE_FRONTEND_FORGE_API_KEY=your_frontend_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.your-domain.com

# Application
VITE_APP_TITLE=Nexus Watch
VITE_APP_LOGO=https://your-domain.com/logo.png

# Owner Info
OWNER_NAME=Your Company Name

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.your-domain.com
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# Port
PORT=3000
```

### Security Best Practices

- Use strong, unique JWT_SECRET (minimum 32 characters)
- Store secrets in secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)
- Never commit `.env.production` to version control
- Rotate secrets regularly
- Use HTTPS for all communications
- Implement rate limiting
- Enable CORS only for trusted domains

## Docker Deployment

### Build Docker Image

```bash
# Build image
docker build -t nexus-watch:latest .

# Tag for registry
docker tag nexus-watch:latest your-registry/nexus-watch:latest

# Push to registry
docker push your-registry/nexus-watch:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    image: nexus-watch:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://root:password@db:3306/nexus_watch
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      VITE_SUPABASE_ANON_KEY: ${VITE_SUPABASE_ANON_KEY}
      BUILT_IN_FORGE_API_KEY: ${BUILT_IN_FORGE_API_KEY}
    depends_on:
      - db
    restart: always
    networks:
      - nexus-network

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: nexus_watch
    volumes:
      - db-data:/var/lib/mysql
    restart: always
    networks:
      - nexus-network

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: always
    networks:
      - nexus-network

volumes:
  db-data:

networks:
  nexus-network:
    driver: bridge
```

### Run with Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Cloud Platforms

### Railway

1. **Connect GitHub repository**
   - Sign in to Railway
   - Create new project from GitHub

2. **Configure environment variables**
   - Add all variables from `.env.production`

3. **Configure database**
   - Add MySQL plugin
   - Update DATABASE_URL

4. **Deploy**
   - Push to main branch
   - Railway auto-deploys

### Render

1. **Create Web Service**
   - Connect GitHub repository
   - Select Node environment

2. **Set environment variables**
   - Add all production variables

3. **Configure database**
   - Use Render's managed database
   - Update DATABASE_URL

4. **Deploy**
   - Render auto-deploys on push

### AWS (EC2 + RDS)

1. **Launch EC2 instance**
   ```bash
   # SSH into instance
   ssh -i key.pem ec2-user@instance-ip

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install pnpm
   npm install -g pnpm
   ```

2. **Setup RDS database**
   - Create MySQL instance
   - Configure security groups
   - Get connection string

3. **Deploy application**
   ```bash
   # Clone repository
   git clone https://github.com/etitecnologies-sketch/Nexus-Watch.git
   cd Nexus-Watch

   # Install dependencies
   pnpm install

   # Build
   pnpm build

   # Start with PM2
   npm install -g pm2
   pm2 start dist/index.js --name "nexus-watch"
   pm2 save
   pm2 startup
   ```

### Google Cloud Run

1. **Create Dockerfile** (already included)

2. **Build and push image**
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/nexus-watch
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy nexus-watch \
     --image gcr.io/PROJECT_ID/nexus-watch \
     --platform managed \
     --region us-central1 \
     --set-env-vars DATABASE_URL=mysql://...,JWT_SECRET=...
   ```

## Database Setup

### Initial Setup

```bash
# Connect to database
mysql -h db-host -u root -p

# Create database
CREATE DATABASE nexus_watch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user
CREATE USER 'nexus'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON nexus_watch.* TO 'nexus'@'%';
FLUSH PRIVILEGES;
```

### Apply Migrations

```bash
# Generate migrations
pnpm drizzle-kit generate

# Apply migrations
pnpm drizzle-kit migrate
```

### Backup Database

```bash
# Create backup
mysqldump -h db-host -u nexus -p nexus_watch > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
mysql -h db-host -u nexus -p nexus_watch < backup_20260421_120000.sql
```

### Connection Pooling

Configure in production:

```typescript
// server/_core/db.ts
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

## SSL/TLS Configuration

### Obtain SSL Certificate

Using Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Auto-renew
sudo certbot renew --dry-run
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring & Logging

### Application Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# View logs
pm2 logs nexus-watch

# Monitor
pm2 monit
```

### Log Aggregation

Using ELK Stack:

```yaml
# docker-compose.yml additions
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - discovery.type=single-node
  ports:
    - "9200:9200"

logstash:
  image: docker.elastic.co/logstash/logstash:8.0.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  ports:
    - "5000:5000"

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - "5601:5601"
```

### Health Checks

```bash
# Add health check endpoint
curl http://localhost:3000/health

# Configure in docker-compose
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DB_HOST="db-host"
DB_USER="nexus"
DB_NAME="nexus_watch"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://your-bucket/backups/
```

### Disaster Recovery

```bash
# 1. Restore database
gunzip < backup_20260421_120000.sql.gz | mysql -h db-host -u nexus -p nexus_watch

# 2. Restart application
docker-compose restart app

# 3. Verify
curl http://localhost:3000/health
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_devices_userId_status ON devices(userId, status);
CREATE INDEX idx_cameras_userId_status ON cameras(userId, status);
CREATE INDEX idx_notifications_userId_createdAt ON notifications(userId, createdAt DESC);
```

### Caching

```typescript
// Redis caching
import Redis from 'redis';

const redis = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// Cache device status for 5 minutes
const cacheKey = `device:${deviceId}:status`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const status = await getDeviceStatus(deviceId);
await redis.setex(cacheKey, 300, JSON.stringify(status));
return status;
```

### Load Balancing

```nginx
upstream nexus_watch {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://nexus_watch;
        proxy_set_header Host $host;
    }
}
```

## Troubleshooting

### Common Issues

**Database connection failed**
- Check DATABASE_URL
- Verify database is running
- Check firewall rules
- Verify credentials

**High memory usage**
- Check for memory leaks
- Implement connection pooling
- Add caching layer
- Monitor with `pm2 monit`

**Slow response times**
- Check database indexes
- Enable caching
- Implement load balancing
- Monitor with APM tools

## Support

For deployment issues:
- Check [documentation](./docs)
- Review [troubleshooting guide](./docs/troubleshooting.md)
- Open [GitHub issue](https://github.com/etitecnologies-sketch/Nexus-Watch/issues)
- Email: support@etitecnologies.com

---

**Last Updated**: April 2026
