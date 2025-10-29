# GhostSOL Photon RPC Docker Configuration

This directory contains Docker configuration for running the Light Protocol Photon RPC indexer.

## Quick Start

### 1. Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 32GB RAM available
- At least 500GB free disk space

### 2. Configuration

Copy and edit the environment file:

```bash
cp .env.example .env
# Edit .env with your settings
```

Key settings:
- `SOLANA_CLUSTER`: Target cluster (devnet or mainnet-beta)
- `SOLANA_RPC_URL`: Solana RPC endpoint
- `DB_PASSWORD`: Secure password for PostgreSQL

### 3. Build and Start

```bash
# Build the Docker image
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f photon-rpc
```

### 4. Verify Health

```bash
# Check service status
docker-compose ps

# Check health endpoint
curl http://localhost:8080/health

# Check RPC endpoint
curl -X POST http://localhost:8899 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

## Services

### Photon RPC Indexer
- **Port 8899**: RPC endpoint
- **Port 8080**: Health check
- **Port 8900**: WebSocket
- **Port 9090**: Prometheus metrics

### PostgreSQL Database
- **Port 5432**: Database connection
- Stores compressed account state
- Automated backups recommended

### Prometheus (Optional)
- **Port 9091**: Metrics collection
- Scrapes metrics from Photon RPC

### Grafana (Optional)
- **Port 3000**: Dashboard UI
- Default credentials: admin / (see .env)

## Management

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f photon-rpc

# Last 100 lines
docker-compose logs --tail=100 photon-rpc
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart photon-rpc
```

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove with volumes (WARNING: deletes data!)
docker-compose down -v
```

### Update Configuration

1. Edit `config.toml`
2. Restart the service:
   ```bash
   docker-compose restart photon-rpc
   ```

### Update to Latest Version

```bash
# Pull latest code
docker-compose build --no-cache photon-rpc

# Restart with new image
docker-compose up -d photon-rpc
```

## Monitoring

### Metrics Endpoints

- **Photon RPC**: http://localhost:9090/metrics
- **Prometheus**: http://localhost:9091
- **Grafana**: http://localhost:3000

### Health Check

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "last_indexed_slot": 12345678,
  "sync_lag_slots": 5,
  "uptime_seconds": 3600
}
```

### Database Stats

```bash
docker-compose exec postgres psql -U photon -d photon -c "SELECT * FROM v_indexer_stats;"
```

## Troubleshooting

### Container Won't Start

1. Check logs:
   ```bash
   docker-compose logs photon-rpc
   ```

2. Verify database is ready:
   ```bash
   docker-compose ps postgres
   ```

3. Check disk space:
   ```bash
   df -h
   ```

### Sync Issues

1. Check Solana RPC endpoint:
   ```bash
   curl https://api.devnet.solana.com -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
   ```

2. Verify network connectivity:
   ```bash
   docker-compose exec photon-rpc ping -c 3 api.devnet.solana.com
   ```

3. Check indexer logs for errors

### Database Connection Errors

1. Verify postgres is healthy:
   ```bash
   docker-compose exec postgres pg_isready -U photon
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connection string in config.toml

### High Memory Usage

1. Adjust cache settings in `config.toml`:
   ```toml
   [storage]
   cache_size = 4096  # Reduce from 8192
   ```

2. Limit Docker resources in `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 16G
   ```

## Backup and Recovery

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U photon photon > photon_backup_$(date +%Y%m%d).sql

# Or using docker-compose
docker-compose exec -T postgres pg_dump -U photon photon | gzip > photon_backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# Stop photon-rpc service
docker-compose stop photon-rpc

# Restore backup
cat photon_backup_20231025.sql | docker-compose exec -T postgres psql -U photon photon

# Restart services
docker-compose start photon-rpc
```

### Volume Backup

```bash
# Backup all volumes
docker run --rm \
  -v ghostsol_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_backup.tar.gz /data
```

## Performance Tuning

### Optimize PostgreSQL

Add to `docker-compose.yml` postgres service:

```yaml
command:
  - postgres
  - -c
  - shared_buffers=4GB
  - -c
  - effective_cache_size=12GB
  - -c
  - maintenance_work_mem=1GB
  - -c
  - max_connections=200
```

### Optimize Indexer

Edit `config.toml`:

```toml
[indexer]
workers = 16  # Increase for faster sync
batch_size = 200  # Larger batches

[performance]
threads = 16  # Match CPU cores
aggressive_cache = true
```

## Security

### Production Checklist

- [ ] Change default database password
- [ ] Use secure Grafana password
- [ ] Enable SSL/TLS for RPC endpoint
- [ ] Set up firewall rules
- [ ] Configure backup strategy
- [ ] Enable monitoring and alerting
- [ ] Use secrets management (AWS Secrets Manager, HashiCorp Vault)

### SSL/TLS Configuration

Use a reverse proxy (nginx, traefik) for SSL termination:

```yaml
# Add to docker-compose.yml
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - photon-rpc
```

## Cost Optimization

### Resource Allocation

- **Development**: 4-8 GB RAM, 2-4 CPUs, 100GB disk
- **Staging**: 16 GB RAM, 8 CPUs, 500GB disk
- **Production**: 32 GB RAM, 16 CPUs, 2TB disk

### Monitoring Costs

Track resource usage:

```bash
# CPU and memory
docker stats

# Disk usage
docker system df
```

## Support

For issues or questions:
- Check logs first: `docker-compose logs`
- Review documentation: `/workspace/docs/research/liveness-and-infra.md`
- GitHub Issues: [GhostSOL repository]

## License

See main repository LICENSE file.
