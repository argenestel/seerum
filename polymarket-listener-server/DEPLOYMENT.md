# Deployment Guide

This guide explains how to deploy the Polymarket Listener Server using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Supabase project with database tables created (see `supabase-schema.sql`)

## Quick Start

1. **Clone the repository and navigate to the project directory**

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   Edit `.env` and set:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service role key
   - `PORT`: Server port (default: 3002)
   - Other optional variables as needed

4. **Build and start the service**
   ```bash
   docker-compose up -d --build
   ```

5. **Check logs**
   ```bash
   docker-compose logs -f polymarket-listener
   ```

6. **Verify health**
   ```bash
   curl http://localhost:3002/health
   ```

## Production Deployment

For production, use the production override file:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This applies production-specific settings like resource limits and restart policies.

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service role key

### Optional
- `PORT`: Server port (default: 3002)
- `POLL_INTERVAL`: Polling interval in milliseconds (default: 30000)
- `BUILDER_SIGNING_SERVER_URL`: Builder signing server URL (default: http://localhost:3001)
- `MONITOR_USERS`: Comma-separated list of user addresses to monitor
- `NODE_ENV`: Node environment (set to `production`)

## Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Restart service
```bash
docker-compose restart polymarket-listener
```

### Update and rebuild
```bash
docker-compose down
docker-compose up -d --build
```

### Check service status
```bash
docker-compose ps
```

## Health Checks

The container includes a health check that monitors the `/health` endpoint. Check health status:

```bash
docker-compose ps
```

Or directly:
```bash
curl http://localhost:3002/health
```

## Troubleshooting

### Container won't start
1. Check logs: `docker-compose logs polymarket-listener`
2. Verify environment variables are set correctly
3. Ensure Supabase connection is working
4. Check port availability: `netstat -tuln | grep 3002`

### Database connection errors
1. Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
2. Ensure Supabase project is active
3. Check network connectivity from container
4. Verify database tables exist (run `supabase-schema.sql`)

### High memory usage
- Adjust resource limits in `docker-compose.prod.yml`
- Monitor with: `docker stats polymarket-listener-server`

## Security Considerations

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use secrets management** in production (Docker secrets, Kubernetes secrets, etc.)
3. **Limit network exposure** - Only expose necessary ports
4. **Regular updates** - Keep base images and dependencies updated
5. **Non-root user** - Container runs as non-root user `nodejs`

## Monitoring

### Logs
Logs are stored in Docker's JSON logging driver with rotation:
- Max size: 10MB per file
- Max files: 3

Access logs:
```bash
docker-compose logs -f --tail=100
```

### Metrics
Monitor container resources:
```bash
docker stats polymarket-listener-server
```

## Backup

Since the application uses Supabase (external managed database), ensure:
1. Supabase backups are configured
2. Regular database backups are taken
3. Migration scripts are version controlled

## Scaling

To run multiple instances, use Docker Swarm or Kubernetes. For simple scaling:

```bash
docker-compose up -d --scale polymarket-listener=3
```

Note: Ensure your application handles multiple instances correctly (e.g., distributed locking if needed).

