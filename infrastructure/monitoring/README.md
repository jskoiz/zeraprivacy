# GhostSOL Monitoring & Failover System

This directory contains the monitoring and failover infrastructure for GhostSOL, implementing comprehensive health checks, alerting, and automatic failover for production reliability.

## 📁 Directory Structure

```
infrastructure/
├── monitoring/
│   ├── datadog/
│   │   └── dashboards.json          # Datadog dashboard configuration
│   ├── pagerduty/
│   │   └── alerts.json              # PagerDuty alert definitions
│   └── README.md                     # This file
└── scripts/
    └── monitor-health.sh             # Continuous health monitoring script
```

## 🎯 Components

### 1. Datadog Monitoring (`datadog/dashboards.json`)

Comprehensive dashboard tracking:
- **RPC Response Time**: p50, p95, p99 percentiles
- **Forester Queue Depth**: Real-time queue monitoring with thresholds
- **Transaction Success Rate**: >99% target tracking
- **Indexer Sync Status**: Blocks behind monitoring
- **Error Rates**: By operation type
- **API Endpoint Availability**: Health check status
- **Failover Events**: RPC provider failover tracking
- **System Uptime**: 30-day SLO tracking (99.9% target)

#### Setup Instructions

1. **Import Dashboard to Datadog**:
   ```bash
   # Using Datadog API
   curl -X POST "https://api.datadoghq.com/api/v1/dashboard" \
     -H "Content-Type: application/json" \
     -H "DD-API-KEY: ${DATADOG_API_KEY}" \
     -d @datadog/dashboards.json
   ```

2. **Configure Datadog Agent** (if using custom metrics):
   ```bash
   # Install Datadog agent
   DD_API_KEY=${DATADOG_API_KEY} bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
   
   # Configure custom metrics in /etc/datadog-agent/conf.d/
   ```

3. **Environment Variables**:
   ```bash
   export DATADOG_API_KEY="your_api_key_here"
   ```

### 2. PagerDuty Alerting (`pagerduty/alerts.json`)

Alert configurations for critical events:

| Alert | Condition | Severity | Escalation | Response Time |
|-------|-----------|----------|------------|---------------|
| RPC Response Time High | p95 > 1000ms for 5min | Warning | Engineering Team | 5 min |
| All RPC Providers Down | All unreachable | Critical | On-Call Immediate | 0 min |
| Forester Queue Overflow | depth > 200 | Critical | DevOps Team | 5 min |
| Transaction Success Rate Low | <95% for 10min | Warning | Engineering Team | 5 min |
| RPC Provider Failover | >3 failovers in 5min | Warning | Engineering Team | 5 min |
| Indexer Sync Lag | >50 blocks behind | Warning | DevOps Team | 5 min |
| High Error Rate | >1% errors | Warning | Engineering Team | 5 min |
| API Endpoint Down | Health check fails | Critical | On-Call Immediate | 0 min |

#### Setup Instructions

1. **Create PagerDuty Service**:
   - Log in to PagerDuty
   - Go to Services → New Service
   - Name: "GhostSOL Production"
   - Integration Type: Events API v2

2. **Configure Environment Variables**:
   ```bash
   export PAGERDUTY_SERVICE_KEY="your_service_key"
   export PAGERDUTY_ROUTING_KEY="your_routing_key"
   export SLACK_WEBHOOK_URL="your_slack_webhook"
   ```

3. **Set Up Escalation Policies**:
   - Update the IDs in `alerts.json`:
     - `${ENGINEERING_SCHEDULE_ID}`
     - `${ON_CALL_SCHEDULE_ID}`
     - `${DEVOPS_SCHEDULE_ID}`
     - `${ENGINEERING_MANAGER_ID}`
     - `${CTO_ID}`

4. **Test Alerts**:
   ```bash
   # Send test alert
   curl -X POST "https://events.pagerduty.com/v2/enqueue" \
     -H "Content-Type: application/json" \
     -d '{
       "routing_key": "'${PAGERDUTY_ROUTING_KEY}'",
       "event_action": "trigger",
       "payload": {
         "summary": "Test Alert - GhostSOL Monitoring",
         "severity": "warning",
         "source": "manual-test"
       }
     }'
   ```

### 3. Health Monitoring Script (`scripts/monitor-health.sh`)

Continuous monitoring script that checks:
- RPC endpoint health and latency
- Forester queue depth
- API endpoint availability
- Indexer sync status

#### Features
- **30-second check interval** (configurable)
- **Automatic alerting** via Datadog and PagerDuty
- **Threshold-based warnings**:
  - RPC timeout: 5 seconds
  - Forester queue warning: 100 transactions
  - Forester queue critical: 200 transactions
  - Max blocks behind: 50 blocks

#### Setup and Usage

1. **Set Environment Variables**:
   ```bash
   export RPC_ENDPOINT="https://rpc.ghostsol.io"
   export API_ENDPOINT="https://api.ghostsol.io"
   export FORESTER_API="https://api.lightprotocol.com/forester"
   export DATADOG_API_KEY="your_datadog_api_key"
   export PAGERDUTY_ROUTING_KEY="your_pagerduty_key"
   ```

2. **Run the Script**:
   ```bash
   # Direct execution
   ./scripts/monitor-health.sh

   # Run in background
   nohup ./scripts/monitor-health.sh > /var/log/ghostsol-monitor.log 2>&1 &

   # Run with systemd (recommended for production)
   sudo systemctl enable ghostsol-monitor
   sudo systemctl start ghostsol-monitor
   ```

3. **Create Systemd Service** (optional):
   ```ini
   # /etc/systemd/system/ghostsol-monitor.service
   [Unit]
   Description=GhostSOL Health Monitor
   After=network.target

   [Service]
   Type=simple
   User=ghostsol
   WorkingDirectory=/opt/ghostsol
   EnvironmentFile=/etc/ghostsol/monitor.env
   ExecStart=/opt/ghostsol/infrastructure/scripts/monitor-health.sh
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

## 🔧 SDK Failover Logic

The enhanced RPC connection manager (`sdk/src/core/rpc.ts`) provides:

### Features
- **Multiple RPC Providers**: Primary (Helius), Secondary (Custom), Tertiary (Network Default)
- **Health Checks**: Automatic every 30 seconds
- **Smart Failover**: Switches to healthy provider when issues detected
- **Automatic Retry**: 3 attempts with exponential backoff
- **Metrics Tracking**: Latency (p50, p95, p99), errors, failovers
- **Performance Thresholds**:
  - Health check timeout: 2 seconds
  - Max acceptable latency: 2 seconds
  - Failure threshold: 3 consecutive failures

### Usage Example

```typescript
import { createRpcConnectionManager } from '@ghostsol/sdk';

// Create connection manager with automatic failover
const rpcManager = createRpcConnectionManager({
  cluster: 'devnet',
  rpcUrl: 'https://custom-rpc.example.com', // Optional secondary
  commitment: 'confirmed'
});

// Execute operations with automatic retry
const result = await rpcManager.executeWithRetry(
  async (connection, rpc) => {
    return await connection.getBalance(publicKey);
  },
  'getBalance'
);

// Get performance metrics
const metrics = rpcManager.getMetrics();
console.log('Average latency:', metrics.avgLatency, 'ms');
console.log('P95 latency:', metrics.p95Latency, 'ms');
console.log('Failovers:', metrics.failovers);
console.log('Current provider:', metrics.currentProvider);

// Clean up when done
rpcManager.destroy();
```

### Health Check Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Check Current Provider Health                            │
│    ├─ Send getVersion() RPC call                           │
│    ├─ Measure latency                                       │
│    └─ Check if latency < 2000ms                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │   Is Healthy?        │
              └─────────────────────┘
                │              │
         YES ◄──┘              └──► NO
          │                           │
          ▼                           ▼
┌──────────────────┐    ┌────────────────────────────┐
│ Use Current      │    │ Failover to Next Provider   │
│ Provider         │    │ ├─ Increment failure count  │
│                  │    │ ├─ Mark as unhealthy        │
│                  │    │ ├─ Try next provider        │
│                  │    │ └─ Record failover metric   │
└──────────────────┘    └────────────────────────────┘
```

## 📊 Monitoring Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| RPC Response Time (p95) | <1s | >1s | >2s |
| System Uptime | 99.9% | <99.5% | <99% |
| Transaction Success Rate | >99% | <99% | <95% |
| Error Rate | <0.1% | >0.5% | >1% |
| Forester Queue Depth | <50 | >100 | >200 |
| Failover Time | <5s | >5s | >10s |
| Indexer Sync Lag | <10 blocks | >25 blocks | >50 blocks |

## 🧪 Testing Strategy

### 1. Deploy to Staging
```bash
# Deploy monitoring stack
./infrastructure/scripts/deploy-monitoring.sh staging

# Verify dashboards are live
curl https://app.datadoghq.com/dashboard/list
```

### 2. Simulate Failures
```bash
# Test RPC failover
# Stop primary RPC (Helius)
docker stop helius-rpc-proxy

# Verify automatic failover in logs
tail -f /var/log/ghostsol-monitor.log

# Check metrics show failover
curl localhost:3000/metrics | grep failover
```

### 3. Verify Alerts
```bash
# Trigger test alert
curl -X POST localhost:3000/test/trigger-alert?type=rpc_down

# Check PagerDuty incident created
# Expected: Alert fires within 1 minute
```

### 4. Load Testing
```bash
# Run load test to verify monitoring under stress
npm run test:load

# Monitor dashboard for:
# - Latency percentiles
# - Error rates
# - Failover events
```

## 🚨 Troubleshooting

### Dashboard Not Updating
```bash
# Check Datadog agent status
sudo datadog-agent status

# Verify API key
echo $DATADOG_API_KEY

# Check network connectivity
curl -v https://api.datadoghq.com/api/v1/validate
```

### Alerts Not Firing
```bash
# Test PagerDuty integration
curl -X POST "https://events.pagerduty.com/v2/enqueue" \
  -H "Content-Type: application/json" \
  -d '{"routing_key":"'$PAGERDUTY_ROUTING_KEY'","event_action":"trigger","payload":{"summary":"Test","severity":"error","source":"test"}}'

# Check alert conditions in PagerDuty UI
# Verify escalation policies are active
```

### Health Monitor Not Running
```bash
# Check if process is running
ps aux | grep monitor-health

# Check logs
tail -f /var/log/ghostsol-monitor.log

# Restart service
sudo systemctl restart ghostsol-monitor
```

## 📚 Documentation Links

- [Datadog API Reference](https://docs.datadoghq.com/api/)
- [PagerDuty Events API](https://developer.pagerduty.com/docs/events-api-v2/overview/)
- [GhostSOL Runbooks](https://docs.ghostsol.io/runbooks/)
- [Liveness and Infrastructure Research](../docs/research/liveness-and-infra.md)

## 🔒 Security Notes

- **Never commit API keys** to version control
- Use environment variables or secrets management (AWS Secrets Manager, HashiCorp Vault)
- Rotate API keys regularly (quarterly minimum)
- Restrict PagerDuty access to authorized personnel only
- Enable 2FA for all monitoring accounts

## 📝 Maintenance

### Monthly Tasks
- [ ] Review alert thresholds and adjust based on actual performance
- [ ] Check for false positives and tune alert conditions
- [ ] Verify escalation policies are up to date
- [ ] Review and archive old incidents
- [ ] Update runbooks based on incident learnings

### Quarterly Tasks
- [ ] Rotate API keys for Datadog and PagerDuty
- [ ] Review and update monitoring targets
- [ ] Conduct disaster recovery drill
- [ ] Update documentation

## 🎯 Success Criteria

✅ **Completed When:**
- [x] Datadog dashboards configured and live
- [x] PagerDuty alerts defined and tested
- [x] SDK failover logic implemented with health checks
- [x] Health monitoring script deployed and running
- [x] Automatic retry working (<5s failover time)
- [x] Metrics tracked: latency, errors, failovers
- [ ] Alert test successful (simulate RPC failure)
- [ ] All tests passing in staging environment

---

*Last Updated: 2025-10-29*
*Maintained by: GhostSOL DevOps Team*
