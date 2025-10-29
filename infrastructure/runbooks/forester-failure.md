# Runbook: Forester Service Failure

## Overview
This runbook provides step-by-step instructions for diagnosing and resolving Forester service failures. The Forester is critical for state tree management and batching compressed transactions in the GhostSOL system.

**Priority**: 🔴 Critical (P0)  
**Estimated Resolution Time**: 10-20 minutes

---

## What is the Forester?

The Forester is a service provided by Light Protocol that:
- Manages state trees for compressed accounts
- Batches and submits compressed transactions
- Maintains nullifier queues
- Handles state tree updates and proofs

**Impact of Failure**:
- Users cannot submit new compressed transactions
- Existing balances remain safe (on-chain)
- Reading balances still works
- Standard Solana transactions unaffected

---

## Detection

### Automatic Alerts
- **PagerDuty**: Alert "Forester Service Unavailable" or "Forester High Latency"
- **Datadog**: Dashboard shows Forester errors or no recent batches
- **Status Page**: Forester component shows "degraded" or "down"

### Manual Detection
```bash
# Check Forester health
curl https://forester.ghostsol.io/health

# Check recent batches
curl https://forester.ghostsol.io/api/stats
# Should show recent batch submissions (within last 5 minutes)

# Check via SDK
curl https://rpc.ghostsol.io/api/forester-status
```

### User Reports
- "Transaction stuck in pending"
- "Cannot send compressed transfers"
- SDK errors: "Forester unavailable"

---

## Initial Assessment (2-5 minutes)

### 1. Check Forester Status
```bash
# Service health endpoint
curl https://forester.ghostsol.io/health

# Expected response:
# {
#   "status": "healthy",
#   "lastBatch": "2025-10-29T12:34:56Z",
#   "queueDepth": 45,
#   "slotHeight": 123456789
# }

# Check detailed stats
curl https://forester.ghostsol.io/api/stats | jq
```

### 2. Check Service Status
```bash
# SSH into Forester server
ssh ghostsol-forester-1

# Check service
sudo systemctl status forester

# Quick resource check
htop        # CPU/memory
df -h       # Disk space
```

### 3. Check Dependencies
```bash
# Verify RPC connectivity
curl -X POST https://rpc.ghostsol.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Check Solana network
curl -X POST https://api.devnet.solana.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

---

## Diagnosis (5-10 minutes)

### 1. Check Logs
```bash
# Recent Forester logs
sudo journalctl -u forester -n 200 --no-pager

# Common error patterns to look for:
# - "Error: Connection refused" → RPC/network issue
# - "Error: Insufficient SOL balance" → Wallet funding issue
# - "Error: Transaction simulation failed" → On-chain issue
# - "WARN: Queue depth exceeding threshold" → Performance issue
# - "panic:" → Critical bug

# Application logs
sudo tail -100 /var/log/ghostsol/forester.log

# Error logs specifically
sudo grep -i "error\|fatal\|panic" /var/log/ghostsol/forester.log | tail -50
```

### 2. Check Forester Wallet
```bash
# Check SOL balance (Forester needs SOL for transaction fees)
solana balance -u devnet <FORESTER_WALLET_ADDRESS>

# Should have at least 1 SOL
# If low: Immediate refill required!

# Check recent transactions
solana transaction-history -u devnet <FORESTER_WALLET_ADDRESS> --limit 20
```

### 3. Check State Trees
```bash
# Query state tree status
curl https://forester.ghostsol.io/api/state-trees | jq

# Check for:
# - Trees marked as "full" or "locked"
# - High queue depth (>10000 transactions)
# - Old lastUpdate timestamps (>10 minutes)

# Check specific tree
curl https://forester.ghostsol.io/api/state-trees/<TREE_ID> | jq
```

### 4. Check System Resources
```bash
# CPU and Memory
top -bn1 | head -20

# Disk I/O (high I/O can slow batching)
iostat -x 1 5

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Check for OOM kills
sudo dmesg | grep -i "out of memory"
```

### 5. Check Configuration
```bash
# View current config
sudo cat /etc/ghostsol/forester.conf

# Verify:
# - RPC endpoint is correct
# - Wallet keypair path is valid
# - Batch interval settings
# - Queue thresholds

# Validate config
forester-cli validate-config /etc/ghostsol/forester.conf
```

---

## Resolution Procedures

### Scenario A: Service Crashed
**Symptoms**: `systemctl status forester` shows "inactive (dead)"

```bash
# Restart service
sudo systemctl restart forester

# Monitor startup
sudo journalctl -u forester -f

# Wait 30 seconds, then check health
sleep 30
curl https://forester.ghostsol.io/health

# Verify batches resume
watch -n 5 'curl -s https://forester.ghostsol.io/api/stats | jq .lastBatch'
```

If restart fails:
```bash
# Check for port conflicts
sudo lsof -i :8080

# Check permissions
ls -la /var/lib/ghostsol/forester/
sudo chown -R forester:forester /var/lib/ghostsol/forester/

# Check config validity
forester-cli validate-config /etc/ghostsol/forester.conf

# Try starting in foreground for debugging
sudo -u forester forester --config /etc/ghostsol/forester.conf
```

### Scenario B: Insufficient SOL Balance
**Symptoms**: Logs show "insufficient funds" or wallet balance <0.5 SOL

```bash
# Check current balance
solana balance -u devnet <FORESTER_WALLET_ADDRESS>

# Immediately fund the wallet
solana transfer -u devnet <FORESTER_WALLET_ADDRESS> 10 \
  --from ~/.config/solana/treasury-keypair.json

# Verify transfer
solana balance -u devnet <FORESTER_WALLET_ADDRESS>

# Service should auto-recover
# Monitor logs
sudo journalctl -u forester -f

# Set up low-balance alert (if not already configured)
# Add to monitoring: Alert when balance < 2 SOL
```

### Scenario C: RPC Connection Issues
**Symptoms**: Logs show "Connection refused" or "RPC timeout"

```bash
# Test RPC connectivity
curl https://rpc.ghostsol.io/health

# If RPC is down, check RPC runbook:
# /workspace/infrastructure/runbooks/rpc-failure.md

# If RPC is operational but Forester can't connect:
# Check network connectivity
ping -c 5 rpc.ghostsol.io
traceroute rpc.ghostsol.io

# Check firewall rules
sudo ufw status
sudo iptables -L -n | grep 443

# Update RPC endpoint in config (if needed)
sudo vim /etc/ghostsol/forester.conf
# Update: rpc_url = "https://rpc.ghostsol.io"

# Restart service
sudo systemctl restart forester
```

### Scenario D: High Queue Depth / Performance Degradation
**Symptoms**: Queue depth >5000, slow batch submissions

```bash
# Check current queue
curl https://forester.ghostsol.io/api/stats | jq '.queueDepth'

# Check batch frequency
curl https://forester.ghostsol.io/api/stats | jq '.batchesLast10Min'

# Increase batch frequency (temporary fix)
sudo vim /etc/ghostsol/forester.conf
# Update: batch_interval_ms = 500  # Reduce from 1000
# Update: max_batch_size = 50      # Increase from 25

sudo systemctl restart forester

# Monitor queue drainage
watch -n 10 'curl -s https://forester.ghostsol.io/api/stats | jq .queueDepth'

# If queue not draining:
# Check system resources (CPU, memory, I/O)
# May need to scale to larger instance

# Scale up (Terraform)
cd infrastructure/terraform
vim forester-server.tf  # Update instance_type
terraform apply
```

### Scenario E: State Tree Issues
**Symptoms**: Logs show "state tree full" or "merkle tree error"

```bash
# Check state tree status
curl https://forester.ghostsol.io/api/state-trees | jq

# If tree is full, it needs to be rolled over
# This is usually automatic, but may fail

# Trigger manual rollover (if supported)
curl -X POST https://forester.ghostsol.io/api/rollover-tree \
  -H "Authorization: Bearer $FORESTER_ADMIN_TOKEN"

# If not supported, restart service to trigger rollover
sudo systemctl restart forester

# Monitor tree creation
sudo journalctl -u forester -f | grep -i "tree\|rollover"

# If rollover fails, check on-chain state
# May need to deploy new state tree (advanced)
```

### Scenario F: Corrupted State
**Symptoms**: Service starts but fails to process transactions, state errors

```bash
# Stop service
sudo systemctl stop forester

# Backup current state
sudo cp -r /var/lib/ghostsol/forester /var/lib/ghostsol/forester.backup.$(date +%s)

# Clear local cache (will resync from chain)
sudo rm -rf /var/lib/ghostsol/forester/cache/*

# Restart service
sudo systemctl start forester

# Monitor resync
sudo journalctl -u forester -f

# Should see: "Syncing state trees from chain..."
# Wait 2-5 minutes for resync

# Verify health
curl https://forester.ghostsol.io/health
```

---

## Failover Procedure

The Forester service is typically run by Light Protocol. If the primary Forester fails:

### Option 1: Wait for Light Protocol Recovery
```bash
# Check Light Protocol status
curl https://status.lightprotocol.com

# Contact Light Protocol support
# Email: support@lightprotocol.com
# Discord: #support channel

# Estimated recovery: Usually < 15 minutes
```

### Option 2: Self-Host Forester (Advanced)
```bash
# Only if urgent and Light Protocol is unavailable

# Clone and build Light Protocol
git clone https://github.com/Lightprotocol/light-protocol
cd light-protocol/forester

# Follow setup instructions
# Requires:
# - Funded SOL wallet
# - RPC access
# - State tree access keys

# Start service
./target/release/forester start --config ./config.yml

# Update GhostSOL SDK to use your Forester
# In SDK config:
# foresterEndpoint: "http://your-forester:8080"
```

### Option 3: Direct Light Protocol Forester
```bash
# Update SDK to use Light Protocol's Forester directly
# (Bypass GhostSOL proxy if we run one)

# In SDK config:
foresterEndpoint: "https://forester.lightprotocol.com"
```

---

## Communication Templates

### Internal (Slack #incidents)
```
🟡 FORESTER INCIDENT - [TIMESTAMP]

STATUS: [Investigating / Identified / Resolving / Resolved]
IMPACT: Users cannot submit compressed transactions. Balances safe, reads OK.
AFFECTED: Forester Service
ACTION: [What you're doing to fix it]
ETA: [Estimated resolution time]

Note: Standard Solana transactions unaffected.
Next update in 10 minutes or when resolved.
```

### Status Page Update
```
Title: Forester Service Degraded
Status: Investigating / Monitoring / Resolved

We are experiencing issues with our Forester service for compressed transactions.

Impact:
- ❌ Cannot submit new compressed transactions
- ✅ Existing balances are safe
- ✅ Balance queries working normally
- ✅ Standard Solana transactions unaffected

We are [current action].
Estimated resolution: [time or "investigating"]

Updated: [timestamp]
```

---

## Post-Incident Procedures

### 1. Verify Full Recovery
```bash
# Run comprehensive Forester check
./scripts/forester-health-check.sh

# Verify metrics:
# - Queue depth <100
# - Batch submissions every 1-2 seconds
# - Response time <500ms
# - Wallet balance >1 SOL

# Test user flow
# - Submit compressed transfer
# - Verify transaction confirms
# - Check transaction appears in history
```

### 2. Review Pending Transactions
```bash
# Check if any transactions were stuck
curl https://forester.ghostsol.io/api/pending-transactions

# If stuck transactions exist:
# - Verify they complete now that service is restored
# - Check for any that need manual intervention
# - Communicate with affected users if any
```

### 3. Write Incident Report
See template in `/workspace/infrastructure/runbooks/incident-report-template.md`

### 4. Update Monitoring
```bash
# Add alerts if gaps were discovered:
# - Low SOL balance alert (<2 SOL)
# - High queue depth alert (>5000)
# - No recent batches alert (>5 min)
# - State tree rollover failures

# Update Datadog/monitoring config
vim infrastructure/monitoring/datadog.yml
```

### 5. Contact Light Protocol (if their service)
- Report incident details
- Share logs if helpful
- Discuss prevention measures

---

## Prevention / Monitoring

### Automated Monitoring
```bash
# Set up these alerts (if not already configured):

# 1. Service health check (every 60 seconds)
# Alert if: No response or status != "healthy"

# 2. SOL balance monitor (every 5 minutes)
# Alert if: Balance < 2 SOL
# Critical if: Balance < 0.5 SOL

# 3. Queue depth monitor (every 60 seconds)
# Warn if: Queue depth > 1000
# Alert if: Queue depth > 5000

# 4. Batch submission monitor (every 5 minutes)
# Alert if: No batches submitted in last 5 minutes

# 5. Error rate monitor (every 5 minutes)
# Alert if: Error rate > 5%
```

### Daily Checks
```bash
# Automated daily report
./scripts/forester-daily-report.sh

# Manual checks (1 minute):
# - Check status page: Forester green?
# - Verify wallet balance: >5 SOL?
# - Check queue depth: <100?
```

### Weekly Checks
- Review Forester performance metrics
- Check wallet balance trends (how fast depleting?)
- Review error logs for patterns
- Verify state tree health

---

## Emergency Contacts

| Role | Contact | Notes |
|------|---------|-------|
| Light Protocol Support | support@lightprotocol.com | For Forester issues |
| Light Protocol Discord | #support channel | Faster response |
| GhostSOL On-Call | See RPC runbook | For integration issues |

---

## Related Documentation
- Light Protocol Forester Docs: https://docs.lightprotocol.com/forester
- `/workspace/infrastructure/runbooks/rpc-failure.md` - RPC issues affect Forester
- `/workspace/docs/research/liveness-and-infra.md` - Architecture overview

---

## Version History
- v1.0 (2025-10-29): Initial runbook created
- Last tested: [NEVER - TEST SOON]
- Last incident: [N/A]
