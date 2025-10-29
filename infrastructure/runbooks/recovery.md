# Runbook: General Recovery & Disaster Scenarios

## Overview
This runbook covers general recovery procedures, disaster scenarios, and catastrophic failures that span multiple systems. Use this as the master recovery guide when specific component runbooks don't apply.

**Priority**: 🔴 Critical (P0)  
**Scope**: Multi-component or infrastructure-wide failures

---

## Table of Contents
1. [Complete Infrastructure Failure](#complete-infrastructure-failure)
2. [Data Loss / Corruption](#data-loss--corruption)
3. [Cascading Failures](#cascading-failures)
4. [Emergency Rollback](#emergency-rollback)
5. [Security Incident](#security-incident)
6. [User Fund Recovery](#user-fund-recovery)
7. [Network Partition / Split Brain](#network-partition--split-brain)

---

## Complete Infrastructure Failure

### Scenario
All GhostSOL infrastructure is down (RPC, Forester, SDK endpoints).

### Impact Assessment
- **User Funds**: ✅ Cryptographically safe on Solana blockchain
- **New Transactions**: ❌ Cannot submit
- **Balance Queries**: ❌ Cannot query (but data safe on-chain)
- **Recovery Path**: ✅ Multiple options available

### Immediate Actions (0-5 minutes)

```bash
# 1. Confirm scope of outage
./scripts/check-all-services.sh

# 2. Update status page
curl -X POST https://uptime.ghostsol.io/api/incidents \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -d '{
    "title": "Infrastructure-Wide Outage",
    "status": "investigating",
    "components": ["all"],
    "message": "All services are down. User funds remain safe on-chain."
  }'

# 3. Post in Slack #incidents
# Use template: "CRITICAL: Infrastructure-wide outage"

# 4. Assess user impact
# Check usage logs from last hour
./scripts/get-active-users.sh --last-hour
```

### Recovery Options

#### Option A: Restore from Backup (20-30 minutes)
```bash
# 1. Check latest backup
aws s3 ls s3://ghostsol-backups/infrastructure/ --recursive | tail -10

# 2. Restore infrastructure from Terraform state
cd infrastructure/terraform
terraform init
terraform plan -var-file="production.tfvars"
terraform apply -auto-approve

# 3. Wait for services to come up
./scripts/wait-for-services.sh

# 4. Verify health
./scripts/health-check-all.sh
```

#### Option B: Failover to DR Region (15-20 minutes)
```bash
# If multi-region setup exists

# 1. Switch DNS to DR region
cd infrastructure/terraform
terraform apply -var="use_dr_region=true"

# 2. Verify DR services
curl https://rpc-dr.ghostsol.io/health
curl https://forester-dr.ghostsol.io/health

# 3. Update SDK endpoint configuration
# Users will auto-failover on next connection

# 4. Monitor DR capacity
./scripts/monitor-dr-load.sh
```

#### Option C: Emergency Light Protocol Direct Access
```bash
# Route users directly to Light Protocol infrastructure

# 1. Update SDK configuration (push emergency update)
# Point directly to Light Protocol endpoints

# 2. Communicate to users:
# "Use Light Protocol RPC directly while we restore service"

# 3. Guide: See /docs/USER_RECOVERY_GUIDE.md
```

### Post-Recovery

```bash
# 1. Verify all services operational
./scripts/health-check-all.sh

# 2. Check data integrity
./scripts/verify-data-integrity.sh

# 3. Test critical user flows
./scripts/e2e-test-critical-paths.sh

# 4. Conduct immediate postmortem
# Schedule within 2 hours while incident is fresh
```

---

## Data Loss / Corruption

### Scenario
Database corruption, accidental deletion, or data inconsistency detected.

### Detection
- Queries returning inconsistent results
- Database integrity checks failing
- Transaction history missing or incorrect
- User balance discrepancies

### Assessment (5 minutes)

```bash
# 1. Scope the damage
psql -h db.ghostsol.io -U ghostsol -d indexer -c "
  SELECT 
    schemaname, tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# 2. Check for specific corruption
psql -h db.ghostsol.io -U ghostsol -d indexer -c "
  SELECT * FROM pg_stat_database WHERE datname = 'indexer';"

# 3. Identify affected data
# Check recent transactions, user accounts, etc.

# 4. Determine recovery point objective (RPO)
# How much data loss is acceptable?
```

### Recovery Procedure

#### Step 1: Stop Writes (CRITICAL)
```bash
# Prevent further corruption

# Stop all services that write to database
sudo systemctl stop photon-indexer
sudo systemctl stop forester
sudo systemctl stop sdk-api

# Or revoke write permissions
psql -h db.ghostsol.io -U postgres -c "
  REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM ghostsol;"
```

#### Step 2: Backup Current State
```bash
# Even if corrupted, backup current state
pg_dump -h db.ghostsol.io -U ghostsol -d indexer > /tmp/corrupted-db-backup-$(date +%s).sql

# Upload to S3
aws s3 cp /tmp/corrupted-db-backup-*.sql s3://ghostsol-backups/incident-backups/
```

#### Step 3: Restore from Backup
```bash
# Find latest good backup
aws s3 ls s3://ghostsol-backups/database/ --recursive | tail -20

# Download backup
aws s3 cp s3://ghostsol-backups/database/indexer-2025-10-29-00-00.sql.gz /tmp/

# Restore
gunzip /tmp/indexer-2025-10-29-00-00.sql.gz
psql -h db.ghostsol.io -U ghostsol -d indexer < /tmp/indexer-2025-10-29-00-00.sql

# Verify restore
psql -h db.ghostsol.io -U ghostsol -d indexer -c "SELECT COUNT(*) FROM transactions;"
```

#### Step 4: Resync from Blockchain (if needed)
```bash
# If backup is too old, resync recent data from chain

# Start indexer in catch-up mode
sudo systemctl start photon-indexer

# Monitor sync progress
./scripts/monitor-sync-progress.sh

# Expected time: Depends on blocks to sync
# ~100,000 blocks ≈ 1-2 hours
```

#### Step 5: Verify Data Integrity
```bash
# Run comprehensive data integrity checks
./scripts/verify-data-integrity.sh

# Spot-check user balances against chain
./scripts/verify-user-balances-sample.sh --sample-size 100

# Check transaction history completeness
./scripts/check-transaction-gaps.sh
```

### Data Loss Mitigation

If some data is permanently lost:

```bash
# 1. Identify affected users
./scripts/identify-affected-users.sh --since "2025-10-29 00:00:00"

# 2. Manual recovery for affected users
# Help users reindex their transactions from chain

# 3. Communicate to affected users
# Template in section below

# 4. Consider compensation if significant impact
```

---

## Cascading Failures

### Scenario
One failure triggers others (e.g., RPC failure → Forester failure → SDK failure).

### Strategy: Work Backwards

```bash
# 1. Identify the root cause (usually the first failure)
./scripts/identify-root-cause.sh

# 2. Fix root cause FIRST
# Don't try to fix downstream issues until root is stable

# Example: If RPC failed first
# → Fix RPC (see rpc-failure.md)
# → Wait for Forester to auto-recover
# → Wait for SDK to auto-recover

# 3. Monitor cascade recovery
watch -n 5 './scripts/check-all-services.sh'

# 4. Manually restart services that don't auto-recover
./scripts/restart-dependent-services.sh
```

### Prevention
```bash
# Implement circuit breakers
# Add health checks with auto-recovery
# Set up proper retry logic with exponential backoff

# Review: /workspace/docs/research/liveness-and-infra.md
```

---

## Emergency Rollback

### Scenario
Recent deployment caused critical issues. Need to rollback immediately.

### Quick Rollback (5-10 minutes)

```bash
# 1. Identify current version
./scripts/get-current-version.sh

# 2. Identify last known good version
aws s3 ls s3://ghostsol-releases/ --recursive | tail -20

# 3. Rollback via Terraform
cd infrastructure/terraform
terraform apply -var="release_version=v1.2.3" -auto-approve

# 4. Verify rollback
./scripts/health-check-all.sh
./scripts/verify-version.sh

# 5. Test critical paths
./scripts/e2e-test-critical-paths.sh
```

### For Application Code
```bash
# SDK/Application rollback

# 1. Revert git commits
git log --oneline -10
git revert <commit-hash>  # Or git reset if safe

# 2. Rebuild and redeploy
npm run build
npm run deploy

# 3. Invalidate CDN cache (if applicable)
aws cloudfront create-invalidation \
  --distribution-id EXXXXXXXXXXXXX \
  --paths "/*"
```

### For Database Changes
```bash
# If database migration caused issues

# 1. Run down migration
npm run migrate:down

# 2. Verify schema reverted
psql -h db.ghostsol.io -U ghostsol -d indexer -c "\dt"

# 3. Restore data if migration modified data
# See "Data Loss / Corruption" section

# 4. Restart services
./scripts/restart-all-services.sh
```

---

## Security Incident

### Scenario
Security breach, unauthorized access, or suspicious activity detected.

### IMMEDIATE ACTIONS (0-5 minutes)

```bash
# 1. ISOLATE AFFECTED SYSTEMS
# Take offline immediately
sudo systemctl stop photon-indexer
sudo systemctl stop forester
sudo systemctl stop sdk-api

# Or use firewall
sudo ufw deny from any to any

# 2. ROTATE ALL CREDENTIALS
# Critical: Do this IMMEDIATELY

# Rotate database passwords
psql -h db.ghostsol.io -U postgres -c "
  ALTER USER ghostsol WITH PASSWORD 'NEW_RANDOM_PASSWORD';"

# Rotate API keys
./scripts/rotate-api-keys.sh

# Rotate SSH keys
./scripts/rotate-ssh-keys.sh

# Rotate wallet keypairs (if compromised)
# CRITICAL: Move funds first if wallet compromised!

# 3. PRESERVE EVIDENCE
# Do NOT delete logs!
# Copy logs for investigation
./scripts/backup-all-logs.sh --destination /secure/incident-$(date +%s)/

# 4. NOTIFY SECURITY TEAM
# Email: security@ghostsol.io
# Or page security lead directly
```

### Investigation (15-30 minutes)

```bash
# 1. Check access logs
sudo grep -r "Failed password" /var/log/auth.log
sudo last -20

# 2. Check for unauthorized changes
sudo find /etc /var/www -type f -mtime -1 -ls

# 3. Check network connections
sudo netstat -antup | grep ESTABLISHED

# 4. Check for backdoors
sudo find / -name ".ssh" -type d 2>/dev/null
sudo cat /root/.ssh/authorized_keys

# 5. Check running processes
ps aux | grep -v "^\[" | less

# 6. Review database access logs
psql -h db.ghostsol.io -U postgres -c "
  SELECT * FROM pg_stat_activity ORDER BY query_start DESC LIMIT 50;"
```

### Recovery

```bash
# 1. Patch vulnerability
# Apply security updates

# 2. Rebuild from clean image
# Do NOT reuse potentially compromised systems
cd infrastructure/terraform
terraform taint aws_instance.rpc_server
terraform apply

# 3. Restore from backup (verify backup is clean)
# Restore only from backup BEFORE breach time

# 4. Implement additional security measures
# - Enable 2FA for all access
# - Implement IP whitelisting
# - Enable audit logging
# - Set up intrusion detection

# 5. Notify users (if user data affected)
# See communication templates below
```

---

## User Fund Recovery

### Scenario
User reports funds are "missing" or inaccessible.

### Important: Funds Cannot Be Lost
Due to GhostSOL's architecture, user funds are:
- Stored on Solana blockchain (immutable)
- Cryptographically secured by user's keypair
- Recoverable even if all GhostSOL infrastructure is down

### Recovery Procedure

```bash
# 1. Verify user's public key
# Ask user for their public key

# 2. Query on-chain state directly
solana account -u devnet <USER_PUBKEY> --output json

# 3. Check compressed account state
# Using Light Protocol SDK directly
./scripts/check-compressed-balance.sh <USER_PUBKEY>

# 4. If balance exists on-chain but not showing in SDK:
# → Indexer sync issue
# → Guide user to reindex

# 5. If balance truly missing:
# → Review transaction history
# → Check for transfers/withdrawals
# → Investigate potential bug

# 6. Emergency user recovery options:
# See /workspace/docs/USER_RECOVERY_GUIDE.md
```

### Self-Service Recovery Options for Users

```typescript
// Option 1: Use Light Protocol SDK directly
import { LightSDK } from '@lightprotocol/sdk';

const sdk = new LightSDK({
  rpc: 'https://api.devnet.solana.com',
  // Use Light Protocol directly, bypass GhostSOL
});

const balance = await sdk.getBalance(userPubkey);

// Option 2: Query on-chain directly
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const accountInfo = await connection.getAccountInfo(userPubkey);

// Option 3: Self-host Photon indexer
// See Light Protocol documentation
```

---

## Network Partition / Split Brain

### Scenario
Network split causes systems to operate independently (rare but catastrophic).

### Detection
- Inconsistent data between regions
- Duplicate transactions
- Users see different balances from different endpoints

### Resolution

```bash
# 1. STOP ALL WRITE OPERATIONS IMMEDIATELY
./scripts/emergency-stop-all-writes.sh

# 2. Identify authoritative source
# Usually: The blockchain is the source of truth

# 3. Reconcile data
# Query blockchain for true state
# Discard inconsistent local state

# 4. Resync from blockchain
./scripts/full-resync-from-chain.sh

# 5. Verify consistency across all nodes
./scripts/verify-cross-node-consistency.sh

# 6. Resume operations
./scripts/resume-operations.sh
```

---

## Communication Templates

### Internal (Critical Incident)
```
🔴🔴🔴 CRITICAL INCIDENT - [TIMESTAMP]

SEVERITY: P0 - Infrastructure-wide failure
STATUS: [Investigating / War room active]
IMPACT: [Describe user impact]
USER FUNDS: SAFE (cryptographically secured on-chain)

ACTIONS IN PROGRESS:
1. [What you're doing]
2. [Next steps]

WAR ROOM: [Zoom/Slack/Phone]
UPDATES: Every 15 minutes

@channel - All hands on deck if available
```

### User Communication (Critical)
```
Subject: [CRITICAL] GhostSOL Service Disruption

We are experiencing a critical service disruption affecting all GhostSOL infrastructure.

MOST IMPORTANT: Your funds are cryptographically safe on the Solana blockchain.

Current Status:
- Services are unavailable
- New transactions cannot be processed
- Your existing balances are secured on-chain

What We're Doing:
[Brief description of recovery efforts]

Estimated Resolution:
[Time estimate or "working urgently"]

Your Funds Are Safe:
Even if all our infrastructure fails, your funds remain on the Solana blockchain and are accessible through alternative methods. See our recovery guide: https://docs.ghostsol.io/emergency-recovery

Live Updates:
https://uptime.ghostsol.io

We sincerely apologize for this disruption and will conduct a full postmortem once service is restored.

- GhostSOL Team
```

---

## Post-Incident Procedures

### 1. Comprehensive System Validation
```bash
# Run full test suite
npm run test:all

# Run E2E tests
npm run test:e2e

# Validate data integrity
./scripts/full-data-validation.sh

# Performance testing
./scripts/load-test.sh

# Security scan
./scripts/security-scan.sh
```

### 2. Incident Report (Within 24 hours)
Create detailed incident report including:
- Timeline of events
- Root cause analysis
- User impact assessment
- Resolution steps
- Lessons learned
- Action items to prevent recurrence

Template: `/workspace/infrastructure/runbooks/incident-report-template.md`

### 3. Public Postmortem (If user-facing)
Publish public postmortem within 48 hours:
- What happened
- Why it happened
- What we're doing to prevent it
- How we're compensating affected users (if applicable)

### 4. Update Documentation
```bash
# Update all relevant runbooks
# Add new scenarios discovered
# Update time estimates
# Document any new tools/procedures used
```

### 5. Conduct Team Retrospective
- Blameless postmortem meeting
- Review response effectiveness
- Identify improvement areas
- Update on-call procedures

---

## Prevention Strategies

### 1. Regular DR Testing
```bash
# Quarterly DR drill
./scripts/dr-drill.sh

# Test:
# - Backup restoration
# - Failover procedures
# - Communication protocols
# - Runbook accuracy
```

### 2. Chaos Engineering
```bash
# Monthly chaos tests (in staging)
./scripts/chaos-test.sh --scenario random

# Randomly fail components
# Verify system resilience
# Test auto-recovery
```

### 3. Multi-Region Setup
```bash
# Deploy to multiple regions
cd infrastructure/terraform
terraform apply -var="multi_region=true"

# Test cross-region failover
./scripts/test-region-failover.sh
```

### 4. Monitoring & Alerting
```bash
# Ensure comprehensive monitoring:
# - All critical components
# - Cascading failure detection
# - Anomaly detection
# - User impact metrics
```

---

## Emergency Contacts

| Situation | Contact | Method |
|-----------|---------|--------|
| Infrastructure failure | DevOps Lead | PagerDuty + Phone |
| Security incident | Security Team | security@ghostsol.io |
| User fund issues | CTO + Security | PagerDuty (urgent) |
| Light Protocol issues | Light Protocol Support | Discord #support |
| Legal issues | Legal Counsel | legal@ghostsol.io |

**War Room Procedures**: See `/workspace/infrastructure/runbooks/war-room-procedures.md`

---

## Related Documentation
- `/workspace/infrastructure/runbooks/rpc-failure.md`
- `/workspace/infrastructure/runbooks/forester-failure.md`
- `/workspace/docs/USER_RECOVERY_GUIDE.md`
- `/workspace/docs/research/liveness-and-infra.md`

---

## Version History
- v1.0 (2025-10-29): Initial runbook created
- Last tested: [NEVER - SCHEDULE DR DRILL]
- Last incident: [N/A]

**⚠️ CRITICAL**: DR drills should be conducted quarterly. Schedule first drill immediately!
