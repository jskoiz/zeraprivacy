# Runbook: Photon RPC Failure

## Overview
This runbook provides step-by-step instructions for diagnosing and resolving Photon RPC failures in the GhostSOL infrastructure.

**Priority**: 🔴 Critical (P0)  
**Estimated Resolution Time**: 15-30 minutes

---

## Detection

### Automatic Alerts
- **PagerDuty**: Alert "RPC Response Time High" or "RPC Unavailable"
- **Datadog**: Dashboard shows RPC errors or high latency (>3s)
- **Status Page**: Component shows "degraded" or "down"

### Manual Detection
- Users report inability to submit transactions
- SDK returns connection errors
- Status API health checks failing

---

## Initial Assessment (2-5 minutes)

### 1. Check Status Page
```bash
# View current system status
curl https://uptime.ghostsol.io/api/health | jq
```

### 2. Check RPC Health Endpoint
```bash
# Primary RPC
curl https://rpc.ghostsol.io/health
curl -X POST https://rpc.ghostsol.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'

# Backup RPC
curl https://rpc-backup.ghostsol.io/health
```

### 3. Quick Metrics Check
```bash
# Check response time and error rate
curl https://metrics.ghostsol.io/api/rpc/stats

# Expected output:
# {
#   "avgResponseTime": 45,
#   "errorRate": 0.01,
#   "requestsPerMinute": 150
# }
```

---

## Diagnosis (5-10 minutes)

### 1. Server Health Check
```bash
# SSH into RPC server
ssh ghostsol-rpc-primary

# Check service status
sudo systemctl status photon-indexer
sudo systemctl status nginx

# Check system resources
htop                    # CPU and memory
df -h                   # Disk space
iostat -x 1 5          # Disk I/O
netstat -an | grep ESTABLISHED | wc -l  # Connection count
```

### 2. Check Logs
```bash
# Recent indexer logs
sudo journalctl -u photon-indexer -n 100 --no-pager

# Look for:
# - "Error: Connection refused"
# - "FATAL: out of memory"
# - "Error: disk full"
# - "panic:" or stack traces

# Nginx error logs
sudo tail -100 /var/log/nginx/error.log

# Application logs
sudo tail -100 /var/log/ghostsol/rpc.log
```

### 3. Network Connectivity
```bash
# Test Solana RPC connectivity
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Check DNS resolution
nslookup rpc.ghostsol.io

# Test internal network
ping -c 5 forester.internal.ghostsol.io
```

### 4. Database Check (if applicable)
```bash
# PostgreSQL connection
psql -h db.ghostsol.io -U ghostsol -d indexer -c "SELECT 1;"

# Check database size
psql -h db.ghostsol.io -U ghostsol -d indexer -c "
  SELECT pg_size_pretty(pg_database_size('indexer'));"

# Check active connections
psql -h db.ghostsol.io -U ghostsol -d indexer -c "
  SELECT count(*) FROM pg_stat_activity;"
```

---

## Resolution Procedures

### Scenario A: Disk Full
**Symptoms**: "No space left on device" errors in logs

```bash
# Check disk usage
df -h

# Find large files
du -sh /* | sort -hr | head -10

# Clear old logs (CAUTION: backup first!)
sudo ./scripts/clear-old-logs.sh

# Or manually
sudo find /var/log/ghostsol -name "*.log.*" -mtime +7 -delete
sudo journalctl --vacuum-time=7d

# If database logs are large
sudo -u postgres psql -c "SELECT pg_rotate_logfile();"

# Verify space recovered
df -h

# Restart service if needed
sudo systemctl restart photon-indexer
```

**Long-term fix**:
```bash
# Increase disk size in Terraform
cd infrastructure/terraform
vim rpc-server.tf  # Update root_block_device.volume_size
terraform plan
terraform apply

# Set up automated log rotation
sudo vim /etc/logrotate.d/ghostsol
# Add rotation config
```

### Scenario B: Indexer Crashed
**Symptoms**: Service not running, recent panic in logs

```bash
# Check service status
sudo systemctl status photon-indexer

# View crash logs
sudo journalctl -u photon-indexer -n 200 --no-pager | grep -i "panic\|fatal\|error"

# Restart service
sudo systemctl restart photon-indexer

# Monitor startup
sudo journalctl -u photon-indexer -f

# Check if sync resumes
./scripts/check-sync-status.sh
```

If service won't start:
```bash
# Check config file
sudo cat /etc/ghostsol/indexer.conf

# Validate config
photon-indexer --validate-config /etc/ghostsol/indexer.conf

# Check permissions
ls -la /var/lib/ghostsol/indexer/

# If corrupted state, restore from backup
sudo systemctl stop photon-indexer
sudo mv /var/lib/ghostsol/indexer /var/lib/ghostsol/indexer.old
sudo ./scripts/restore-from-backup.sh latest
sudo systemctl start photon-indexer
```

### Scenario C: High Latency / Degraded Performance
**Symptoms**: Service running but slow (>3s response time)

```bash
# Check current load
uptime
top -n 1

# Check for slow queries (PostgreSQL)
psql -h db.ghostsol.io -U ghostsol -d indexer -c "
  SELECT pid, now() - query_start AS duration, query 
  FROM pg_stat_activity 
  WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
  ORDER BY duration DESC 
  LIMIT 10;"

# Kill long-running queries (if safe)
psql -h db.ghostsol.io -U ghostsol -d indexer -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'active' AND query_start < now() - interval '5 minutes';"

# Check indexer sync status
curl http://localhost:8899/sync-status

# If behind, wait for catch-up
# If not catching up, investigate:
sudo journalctl -u photon-indexer -n 100 | grep -i "slot\|sync"
```

### Scenario D: Network / DDoS Attack
**Symptoms**: High connection count, unusual traffic patterns

```bash
# Check connection count
netstat -an | grep :443 | wc -l

# Check top IP addresses
sudo netstat -ntu | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -20

# Enable rate limiting (Nginx)
sudo vim /etc/nginx/sites-available/ghostsol-rpc
# Add: limit_req_zone $binary_remote_addr zone=rpc:10m rate=100r/s;

sudo nginx -t
sudo systemctl reload nginx

# Or block specific IPs (temporary)
sudo ufw deny from 1.2.3.4 to any port 443

# Enable Cloudflare DDoS protection (if configured)
# Update DNS to proxy through Cloudflare
```

### Scenario E: Hardware Failure
**Symptoms**: Server unresponsive, hardware errors in logs

```bash
# Check if server is responsive
ping rpc.ghostsol.io
ssh ghostsol-rpc-primary

# If unresponsive, use cloud console/IPMI
# Check system logs for hardware errors

# IMMEDIATE ACTION: Failover to backup
# Update DNS to point to backup RPC
# (This requires DNS access or automation)

# Via Terraform:
cd infrastructure/terraform
vim dns.tf  # Update A record to backup IP
terraform apply

# Or via DNS provider UI:
# Change A record for rpc.ghostsol.io
# From: 1.2.3.4 (primary)
# To: 5.6.7.8 (backup)
# TTL: 60 seconds

# Provision new primary server
cd infrastructure/terraform
terraform apply -var="provision_new_primary=true"

# Monitor new server deployment
# Once ready, sync data and switch back
```

---

## Failover Procedure (Critical)

If primary RPC is completely unavailable:

### 1. Activate Backup RPC (5 minutes)
```bash
# Update DNS immediately
# Option A: Terraform
cd infrastructure/terraform
terraform apply -var="use_backup_rpc=true"

# Option B: Manual DNS update
# Login to DNS provider
# Update A record: rpc.ghostsol.io -> BACKUP_IP

# Option C: Automated failover (if configured)
./scripts/failover-to-backup.sh

# Verify DNS propagation
dig rpc.ghostsol.io +short

# Test backup RPC
curl https://rpc.ghostsol.io/health
```

### 2. Update Status Page
```bash
# Update status page manually
curl -X POST https://uptime.ghostsol.io/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Primary RPC Failover",
    "status": "ongoing",
    "message": "Switched to backup RPC. Investigating primary.",
    "components": ["photon-rpc-primary"]
  }'
```

### 3. Communication
- Post in #incidents Slack channel
- Update status page
- If downtime >15 min, post public update

---

## Communication Templates

### Internal (Slack #incidents)
```
🔴 RPC INCIDENT - [TIMESTAMP]

STATUS: [Investigating / Identified / Resolving / Resolved]
IMPACT: [Users unable to submit transactions / Degraded performance]
AFFECTED: Photon RPC Primary
ACTION: [What you're doing to fix it]
ETA: [Estimated resolution time]

Next update in 15 minutes or when resolved.
```

### Status Page Update
```
Title: Photon RPC Degraded Performance
Status: Investigating / Identified / Monitoring / Resolved

Description:
We are currently experiencing [issue description]. 
Our team is [current action]. 
Estimated resolution: [time or "investigating"]

Updated: [timestamp]
```

### User Notification (if >15 min downtime)
```
Subject: GhostSOL Service Disruption

We are experiencing issues with our primary RPC endpoint. 
Your funds remain cryptographically secure.

Current Status: [brief description]
Impact: [what users can/cannot do]
Workaround: [if any available]

We expect to resolve this by [time/date].
Follow live updates: https://uptime.ghostsol.io

- GhostSOL Team
```

---

## Post-Incident Procedures

### 1. Verify Full Recovery
```bash
# Run comprehensive health check
./scripts/health-check-full.sh

# Verify metrics
# - Response time <500ms
# - Error rate <0.1%
# - All components "operational"

# Test user flows
# - Submit transaction
# - Query balance
# - Check transaction history
```

### 2. Write Incident Report
Create file: `incidents/YYYY-MM-DD-rpc-failure.md`

Include:
- Timeline of events
- Root cause analysis
- Resolution steps taken
- Impact assessment (users affected, downtime duration)
- Lessons learned
- Action items to prevent recurrence

### 3. Update This Runbook
```bash
# Add new scenarios discovered
# Update timing estimates
# Add automation steps if manual process was slow
# Document any missing tools or access issues
```

### 4. Review Alerts
- Was detection fast enough?
- Were the right people notified?
- Update alert thresholds if needed
- Add new alerts for gaps discovered

### 5. Conduct Blameless Postmortem
- Schedule team meeting within 48 hours
- Share learnings with broader team
- Update documentation based on feedback

---

## Prevention / Monitoring

### Daily Checks
```bash
# Automated daily health report
./scripts/daily-health-report.sh

# Manual checks (2 minutes)
- Check status page: all green?
- Review yesterday's error logs
- Verify backup RPC is synced
```

### Weekly Checks
- Review RPC performance metrics
- Check disk space trends
- Verify backups are working
- Test failover procedure (in staging)

### Monthly Checks
- Review all incidents from past month
- Update runbooks based on learnings
- Audit access credentials
- Test disaster recovery procedure

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| On-Call Engineer | [Name] | +1-XXX-XXX-XXXX | 24/7 |
| DevOps Lead | [Name] | +1-XXX-XXX-XXXX | Business hours |
| CTO | [Name] | +1-XXX-XXX-XXXX | Escalation only |
| Light Protocol Support | support@lightprotocol.com | Email | Business hours |

**PagerDuty**: https://ghostsol.pagerduty.com  
**Slack**: #incidents (emergency only)  
**Status Page**: https://uptime.ghostsol.io

---

## Related Documentation
- `/workspace/docs/research/liveness-and-infra.md` - Infrastructure architecture
- `/workspace/infrastructure/runbooks/forester-failure.md` - Forester issues
- `/workspace/infrastructure/runbooks/recovery.md` - General recovery procedures
- `/workspace/docs/USER_RECOVERY_GUIDE.md` - User-facing recovery docs

---

## Version History
- v1.0 (2025-10-29): Initial runbook created
- Last tested: [NEVER - TEST SOON]
- Last incident: [N/A]

**⚠️ IMPORTANT**: This runbook should be tested in staging environment at least quarterly!
