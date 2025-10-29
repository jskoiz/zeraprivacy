# GhostSOL Photon RPC Infrastructure Runbook

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployment](#deployment)
4. [Operations](#operations)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)
7. [Incident Response](#incident-response)
8. [Maintenance](#maintenance)
9. [Disaster Recovery](#disaster-recovery)
10. [Contacts](#contacts)

---

## Overview

### Purpose

This runbook provides operational procedures for managing the GhostSOL Photon RPC infrastructure. The Photon RPC is a critical component that indexes ZK Compression state for the GhostSOL privacy protocol.

### Components

- **Photon RPC Indexer**: Light Protocol indexer for compressed account state
- **PostgreSQL Database**: State storage backend
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards
- **Multi-RPC Failover**: Automatic failover to backup providers

### Service Level Objectives (SLOs)

- **Availability**: 99.9% uptime (8.76 hours downtime/year)
- **Response Time**: <1s p95 for RPC queries
- **Data Freshness**: <100 slots lag from latest Solana state
- **Recovery Time Objective (RTO)**: <5 minutes
- **Recovery Point Objective (RPO)**: 0 (no data loss)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                        │
│                  (devnet / mainnet-beta)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Monitor & Index
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              GhostSOL Photon RPC Infrastructure             │
│                                                             │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │  Photon RPC      │◄──────►│   PostgreSQL     │          │
│  │  Indexer         │        │   Database       │          │
│  │  (Port 8899)     │        │   (Port 5432)    │          │
│  └──────┬───────────┘        └──────────────────┘          │
│         │                                                   │
│         │ Metrics                                          │
│         ▼                                                   │
│  ┌──────────────────┐        ┌──────────────────┐          │
│  │   Prometheus     │───────►│     Grafana      │          │
│  │  (Port 9090)     │        │   (Port 3000)    │          │
│  └──────────────────┘        └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ RPC Requests
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 GhostSOL SDK (with Failover)                │
│                                                             │
│  Primary: rpc.ghostsol.io                                  │
│  Fallback 1: Helius                                        │
│  Fallback 2: Light Protocol                                │
│  Fallback 3: Solana Public RPC                             │
└─────────────────────────────────────────────────────────────┘
```

### Network Topology

**Production Environment**:
- **Primary**: AWS us-east-1 (c6i.4xlarge)
- **Backup**: GCP us-west-1 (n2-standard-16) [Future]
- **Database**: AWS RDS PostgreSQL 15

**Staging Environment**:
- **Location**: AWS us-east-2
- **Instance**: c6i.2xlarge

**Development Environment**:
- **Location**: Docker Compose on localhost
- **Resources**: 16GB RAM, 8 CPUs

---

## Deployment

### Prerequisites

- AWS/GCP account with appropriate permissions
- Terraform v1.0+
- Docker and Docker Compose
- SSH key pair configured in cloud provider
- Domain name (optional, for custom RPC endpoint)

### Deployment Methods

#### Method 1: Terraform (AWS Production)

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Configure variables
cp variables.tfvars production.tfvars
# Edit production.tfvars with your settings

# Plan deployment
terraform plan -var-file=production.tfvars

# Deploy
terraform apply -var-file=production.tfvars

# Get outputs
terraform output
```

**Expected Outputs**:
- Instance ID
- Public IP address
- RPC endpoint URL
- Health check endpoint URL
- SSH command

#### Method 2: Docker Compose (Development/Staging)

```bash
# Navigate to docker directory
cd infrastructure/docker/photon-rpc

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f photon-rpc
```

#### Method 3: Automated Deployment Script

```bash
# Deploy with script
./infrastructure/scripts/deploy-photon.sh -m terraform -e production

# Or for Docker deployment
./infrastructure/scripts/deploy-photon.sh -m docker -e development
```

### Post-Deployment Verification

```bash
# Run health checks
./infrastructure/scripts/health-check.sh <RPC_URL> <HEALTH_URL>

# Wait for sync (optional)
./infrastructure/scripts/wait-for-sync.sh <HEALTH_URL>

# Verify metrics endpoint
curl http://<IP>:9090/metrics
```

---

## Operations

### Starting Services

#### Terraform Deployment

```bash
# SSH into instance
ssh -i ~/.ssh/ghostsol-key.pem ubuntu@<instance-ip>

# Start Photon RPC service
sudo systemctl start photon-rpc

# Check status
sudo systemctl status photon-rpc
```

#### Docker Deployment

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d photon-rpc
```

### Stopping Services

#### Terraform Deployment

```bash
# Stop service gracefully
sudo systemctl stop photon-rpc

# Or force stop if needed
sudo systemctl kill photon-rpc
```

#### Docker Deployment

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop photon-rpc
```

### Restarting Services

#### Terraform Deployment

```bash
# Restart service
sudo systemctl restart photon-rpc

# Reload configuration
sudo systemctl reload photon-rpc
```

#### Docker Deployment

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart photon-rpc
```

### Configuration Updates

#### Update config.toml

```bash
# Terraform deployment
ssh ubuntu@<instance-ip>
sudo nano /opt/photon-rpc/config.toml
sudo systemctl restart photon-rpc

# Docker deployment
# Edit config.toml locally
docker-compose restart photon-rpc
```

#### Update Environment Variables

```bash
# Docker deployment only
# Edit .env file
nano .env
docker-compose up -d photon-rpc
```

---

## Monitoring

### Key Metrics

#### RPC Performance
- **Request Rate**: Requests per second
- **Response Time**: p50, p95, p99 latency
- **Error Rate**: Failed requests per second
- **Active Connections**: Current connection count

#### Indexer Health
- **Last Indexed Slot**: Current sync position
- **Sync Lag**: Slots behind latest Solana state
- **Indexing Rate**: Slots processed per second
- **Compressed Accounts**: Total accounts indexed

#### System Resources
- **CPU Usage**: Target <80% average
- **Memory Usage**: Target <90% utilization
- **Disk Usage**: Alert at 80% full
- **Network Bandwidth**: Monitor for saturation

### Accessing Metrics

#### Prometheus

```bash
# Access Prometheus UI
http://<instance-ip>:9090

# Query metrics directly
curl http://<instance-ip>:9090/api/v1/query?query=up

# Example queries:
# - RPC request rate: rate(http_requests_total[5m])
# - CPU usage: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
# - Sync lag: indexer_sync_lag_slots
```

#### Grafana

```bash
# Access Grafana UI
http://<instance-ip>:3000

# Default credentials: admin / (see .env)

# Import dashboards:
# - Node Exporter Dashboard (ID: 1860)
# - PostgreSQL Dashboard (ID: 9628)
# - Custom GhostSOL Dashboard (in grafana-dashboards/)
```

#### Health Endpoint

```bash
# Check health
curl http://<instance-ip>:8080/health

# Expected response:
{
  "status": "healthy",
  "last_indexed_slot": 12345678,
  "sync_lag_slots": 45,
  "uptime_seconds": 3600,
  "version": "1.0.0"
}
```

### Alerting Rules

#### Critical Alerts (Page On-Call)

1. **Service Down**
   - Condition: Health check fails for >5 minutes
   - Action: Page on-call engineer immediately

2. **High Sync Lag**
   - Condition: Sync lag >1000 slots for >10 minutes
   - Action: Page on-call engineer

3. **Disk Full**
   - Condition: Disk usage >90%
   - Action: Page on-call engineer

#### Warning Alerts (Notify Slack)

1. **Elevated Error Rate**
   - Condition: Error rate >5% for >5 minutes
   - Action: Notify #ghostsol-ops

2. **High CPU**
   - Condition: CPU usage >80% for >15 minutes
   - Action: Notify #ghostsol-ops

3. **Memory Pressure**
   - Condition: Memory usage >85% for >10 minutes
   - Action: Notify #ghostsol-ops

---

## Troubleshooting

### Common Issues

#### Issue: Service Won't Start

**Symptoms**:
- systemctl status shows "failed" or "inactive"
- Docker container exits immediately

**Diagnosis**:
```bash
# Check logs
sudo journalctl -u photon-rpc -n 100
# Or for Docker
docker-compose logs --tail=100 photon-rpc

# Check configuration
sudo nano /opt/photon-rpc/config.toml

# Verify database connection
pg_isready -h localhost -p 5432 -U photon
```

**Solutions**:
1. Fix configuration errors in config.toml
2. Ensure PostgreSQL is running and accessible
3. Verify correct Solana RPC endpoint
4. Check disk space: `df -h`
5. Review file permissions: `ls -la /opt/photon-rpc`

#### Issue: High Sync Lag

**Symptoms**:
- `sync_lag_slots` in health check is very high (>1000)
- Slow indexing rate

**Diagnosis**:
```bash
# Check indexing rate
curl http://localhost:8080/health | jq '.indexing_rate'

# Check Solana RPC connectivity
curl https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Check system resources
top
iostat -x 5
```

**Solutions**:
1. Verify Solana RPC endpoint is responsive
2. Increase `workers` in config.toml
3. Increase `batch_size` in config.toml
4. Upgrade to larger instance type
5. Check for database bottlenecks

#### Issue: High CPU Usage

**Symptoms**:
- CPU usage consistently >80%
- Slow RPC response times

**Diagnosis**:
```bash
# Check CPU usage per process
top -b -n 1 | head -20

# Check I/O wait
iostat -x 5

# Check database queries
# (Connect to PostgreSQL and check slow queries)
```

**Solutions**:
1. Optimize database queries (add indexes)
2. Reduce `workers` if I/O bound
3. Increase instance size (more CPUs)
4. Enable aggressive caching in config

#### Issue: Database Connection Errors

**Symptoms**:
- "could not connect to database" errors
- RPC queries failing

**Diagnosis**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
# Or for Docker
docker-compose ps postgres

# Test connection
psql -h localhost -U photon -d photon

# Check connections
psql -U photon -d photon -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions**:
1. Restart PostgreSQL
2. Check connection pool size in config
3. Verify database credentials
4. Check disk space for database
5. Review PostgreSQL logs for errors

---

## Incident Response

### Incident Response Workflow

```
1. DETECT
   ├─ Monitoring alert
   ├─ User report
   └─ Health check failure

2. ASSESS
   ├─ Check dashboards
   ├─ Review logs
   └─ Determine severity

3. RESPOND
   ├─ Page on-call (Critical)
   ├─ Notify team (Warning)
   └─ Begin investigation

4. MITIGATE
   ├─ Failover to backup
   ├─ Apply quick fix
   └─ Restore service

5. RESOLVE
   ├─ Apply permanent fix
   ├─ Verify resolution
   └─ Monitor for recurrence

6. DOCUMENT
   ├─ Write incident report
   ├─ Identify root cause
   └─ Create action items
```

### Severity Levels

#### SEV-1 (Critical)

**Definition**: Complete service outage affecting all users

**Response Time**: <5 minutes

**Examples**:
- All RPC providers down
- Database corrupted
- Instance crashed

**Actions**:
1. Page on-call engineer immediately
2. Post status update to users
3. Activate disaster recovery plan
4. Failover to backup infrastructure

#### SEV-2 (High)

**Definition**: Partial outage or severe degradation

**Response Time**: <15 minutes

**Examples**:
- High error rate (>10%)
- Sync lag >5000 slots
- Performance degradation

**Actions**:
1. Notify on-call engineer
2. Post status update to internal team
3. Begin investigation
4. Implement workarounds

#### SEV-3 (Medium)

**Definition**: Minor issues with limited impact

**Response Time**: <1 hour

**Examples**:
- Elevated error rate (5-10%)
- Slow response times
- Non-critical metrics anomalies

**Actions**:
1. Create ticket
2. Investigate during business hours
3. Monitor for escalation

### Runbooks for Common Incidents

#### Runbook: Complete Service Outage

1. **Verify Outage**
   ```bash
   curl http://<instance-ip>:8080/health
   # If fails, service is down
   ```

2. **Check Instance Status**
   ```bash
   # AWS
   aws ec2 describe-instance-status --instance-id <instance-id>
   
   # Or SSH if possible
   ssh ubuntu@<instance-ip>
   ```

3. **Attempt Restart**
   ```bash
   sudo systemctl restart photon-rpc
   # Wait 30 seconds
   curl http://localhost:8080/health
   ```

4. **If Restart Fails, Check Logs**
   ```bash
   sudo journalctl -u photon-rpc -n 500
   ```

5. **Failover to Backup**
   - SDK automatically fails over to Helius/Light Protocol
   - If needed, deploy new instance with Terraform
   - Update DNS to point to new instance

6. **Post-Incident**
   - Review logs for root cause
   - Fix underlying issue
   - Write incident report

#### Runbook: High Sync Lag

1. **Verify Sync Lag**
   ```bash
   curl http://localhost:8080/health | jq '.sync_lag_slots'
   ```

2. **Check Indexing Rate**
   ```bash
   # Monitor for 1 minute
   watch -n 5 'curl -s http://localhost:8080/health | jq ".last_indexed_slot"'
   ```

3. **Check Solana RPC**
   ```bash
   curl https://api.devnet.solana.com -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'
   ```

4. **Temporary Fixes**
   - Increase workers in config
   - Use faster Solana RPC (e.g., Helius)
   - Restart indexer

5. **Long-term Solutions**
   - Upgrade instance type
   - Optimize database
   - Add read replicas

---

## Maintenance

### Routine Maintenance Tasks

#### Daily
- [ ] Review monitoring dashboards
- [ ] Check health endpoint status
- [ ] Review error logs for anomalies
- [ ] Verify disk space (should be <70%)

#### Weekly
- [ ] Review performance metrics
- [ ] Check sync lag trends
- [ ] Analyze slow database queries
- [ ] Review and rotate logs

#### Monthly
- [ ] Update Photon RPC to latest version
- [ ] Review and optimize database indexes
- [ ] Test disaster recovery procedures
- [ ] Review and update documentation
- [ ] Analyze cost trends

#### Quarterly
- [ ] Conduct failover testing
- [ ] Review capacity planning
- [ ] Update dependencies
- [ ] Security audit
- [ ] Incident retrospective

### Software Updates

#### Update Photon RPC

```bash
# SSH into instance
ssh ubuntu@<instance-ip>

# Navigate to directory
cd /opt/photon-rpc/light-protocol

# Pull latest code
git fetch
git checkout <version-tag>

# Rebuild
cargo build --release --bin photon-indexer

# Restart service
sudo systemctl restart photon-rpc

# Verify
curl http://localhost:8080/health
```

#### Update PostgreSQL

```bash
# Docker deployment
docker-compose pull postgres
docker-compose up -d postgres

# Verify
docker-compose exec postgres psql -U photon -c "SELECT version();"
```

### Database Maintenance

#### Backup Database

```bash
# Create backup
docker-compose exec -T postgres pg_dump -U photon photon | \
  gzip > photon_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Upload to S3
aws s3 cp photon_backup_*.sql.gz s3://ghostsol-backups/photon-rpc/
```

#### Restore Database

```bash
# Download from S3
aws s3 cp s3://ghostsol-backups/photon-rpc/photon_backup_20231025.sql.gz .

# Stop Photon RPC
docker-compose stop photon-rpc

# Restore
gunzip < photon_backup_20231025.sql.gz | \
  docker-compose exec -T postgres psql -U photon photon

# Restart
docker-compose start photon-rpc
```

#### Optimize Database

```bash
# Connect to database
docker-compose exec postgres psql -U photon photon

# Vacuum and analyze
VACUUM ANALYZE;

# Reindex
REINDEX DATABASE photon;

# Check table sizes
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::text)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(table_name::text) DESC;
```

---

## Disaster Recovery

### Backup Strategy

#### What to Backup

1. **PostgreSQL Database** (Critical)
   - Frequency: Every 6 hours
   - Retention: 30 days
   - Location: S3 with versioning

2. **Configuration Files** (Important)
   - Frequency: On change
   - Retention: Git history
   - Location: GitHub repository

3. **Terraform State** (Critical)
   - Frequency: On change
   - Retention: Infinite
   - Location: S3 with versioning

#### Automated Backups

```bash
# Add to crontab
0 */6 * * * /opt/scripts/backup-database.sh

# backup-database.sh content:
#!/bin/bash
BACKUP_FILE="photon_backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz"
docker-compose exec -T postgres pg_dump -U photon photon | gzip > $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://ghostsol-backups/photon-rpc/
find . -name "photon_backup_*.sql.gz" -mtime +7 -delete
```

### Recovery Procedures

#### Scenario 1: Database Corruption

**RTO**: <30 minutes  
**RPO**: <6 hours

**Procedure**:
1. Stop Photon RPC
2. Download latest backup from S3
3. Restore database
4. Restart Photon RPC
5. Verify sync resumes

#### Scenario 2: Instance Failure

**RTO**: <15 minutes  
**RPO**: 0 (failover to backup RPC)

**Procedure**:
1. SDK automatically fails over to Helius
2. Deploy new instance with Terraform
3. Restore latest database backup
4. Update DNS to new instance
5. Verify health and monitor

#### Scenario 3: Complete Infrastructure Loss

**RTO**: <2 hours  
**RPO**: <6 hours

**Procedure**:
1. Deploy new infrastructure from scratch
2. Restore database from S3 backup
3. Verify sync and health
4. Update SDK RPC endpoints
5. Monitor for issues

---

## Contacts

### On-Call Rotation

- **Primary**: [Your Name] - [phone]
- **Secondary**: [Backup Name] - [phone]
- **Escalation**: [Manager Name] - [phone]

### External Vendors

- **AWS Support**: [account-number] - support.aws.amazon.com
- **Helius**: support@helius.xyz
- **Light Protocol**: discord.gg/lightprotocol

### Communication Channels

- **Slack**: #ghostsol-ops (alerts and incidents)
- **PagerDuty**: ghostsol.pagerduty.com
- **Status Page**: status.ghostsol.io

---

## Appendix

### Useful Commands

```bash
# Check service status
systemctl status photon-rpc

# View logs
journalctl -u photon-rpc -f

# Check disk usage
df -h
du -sh /opt/photon-rpc/*

# Check network connections
netstat -tulpn | grep 8899

# Check PostgreSQL connections
psql -U photon -c "SELECT count(*) FROM pg_stat_activity;"

# Restart all services
docker-compose restart

# View resource usage
docker stats

# Clean up Docker resources
docker system prune -a
```

### Reference Documentation

- [Light Protocol Docs](https://docs.lightprotocol.com)
- [Solana RPC API](https://docs.solana.com/api/http)
- [PostgreSQL Administration](https://www.postgresql.org/docs/15/admin.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GhostSOL Liveness & Infra Research](../docs/research/liveness-and-infra.md)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-29  
**Owner**: GhostSOL DevOps Team  
**Review Frequency**: Quarterly
