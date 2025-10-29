# GhostSOL Infrastructure Documentation

This directory contains all infrastructure-related code, documentation, and operational runbooks for GhostSOL.

## 📁 Directory Structure

```
infrastructure/
├── status-page/           # Public status page and monitoring
│   ├── index.html        # Status page UI
│   └── api/
│       └── health.ts     # Health check API
└── runbooks/             # Operational runbooks
    ├── rpc-failure.md    # RPC incident response
    ├── forester-failure.md  # Forester incident response
    ├── recovery.md       # General disaster recovery
    └── incident-communication-template.md  # Communication templates
```

## 🌐 Status Page

**Location**: `status-page/index.html`  
**Deployment URL**: https://uptime.ghostsol.io (to be deployed)

The status page provides:
- Real-time system health monitoring
- Component-level status (RPC, Forester, SDK)
- Historical uptime statistics (24h, 30d, 90d)
- Incident history
- Email subscription for updates

### Quick Start

```bash
# Test locally
cd status-page
python3 -m http.server 8000
# Visit: http://localhost:8000
```

### Deployment

See `/workspace/STATUS_PAGE_COMPLETION_SUMMARY.md` for deployment instructions.

## 🔧 Status API

**Location**: `status-page/api/health.ts`

Health monitoring API that checks:
- Photon RPC (Primary & Backup)
- Forester Service
- SDK Endpoints

### Usage

```typescript
import { getSystemStatus } from './health';

const status = await getSystemStatus();
console.log(status);
```

### Environment Variables

```bash
PHOTON_RPC_PRIMARY=https://rpc.ghostsol.io
PHOTON_RPC_BACKUP=https://rpc-backup.ghostsol.io
FORESTER_ENDPOINT=https://forester.ghostsol.io
SDK_ENDPOINT=https://api.ghostsol.io
```

## 📖 Operational Runbooks

### RPC Failure (`runbooks/rpc-failure.md`)

Use this runbook when:
- RPC health checks fail
- Users report connection errors
- Response times exceed 3 seconds
- Alerts trigger for RPC issues

**Scenarios covered**:
- Disk full
- Indexer crashed
- High latency
- Network/DDoS attack
- Hardware failure
- Complete failover

### Forester Failure (`runbooks/forester-failure.md`)

Use this runbook when:
- Forester health checks fail
- Users can't submit compressed transactions
- Queue depth is high
- Forester alerts trigger

**Scenarios covered**:
- Service crashed
- Insufficient SOL balance
- RPC connection issues
- High queue depth
- State tree issues
- Corrupted state

### General Recovery (`runbooks/recovery.md`)

Use this runbook for:
- Infrastructure-wide outages
- Data loss/corruption
- Cascading failures
- Emergency rollbacks
- Security incidents
- User fund recovery
- Network partitions

### Incident Communication (`runbooks/incident-communication-template.md`)

Templates for:
- Internal Slack notifications
- Status page updates
- User email communications
- Social media posts
- Postmortem reports

## 🚨 Emergency Procedures

### If All Services Are Down

1. **Immediate Actions** (0-5 min)
   ```bash
   # Check scope
   ./scripts/check-all-services.sh
   
   # Update status page
   # Post in Slack #incidents
   # Page on-call engineer
   ```

2. **Follow Recovery Runbook**
   - See `runbooks/recovery.md`
   - Section: "Complete Infrastructure Failure"

3. **Communicate**
   - Use templates in `runbooks/incident-communication-template.md`
   - Update status page every 15 minutes

### If Specific Component Fails

- **RPC Issue** → `runbooks/rpc-failure.md`
- **Forester Issue** → `runbooks/forester-failure.md`
- **Multiple Issues** → `runbooks/recovery.md` (Cascading Failures)

## 👥 User Support

### User Recovery Guide

**Location**: `/workspace/docs/USER_RECOVERY_GUIDE.md`

Direct users here if they:
- Cannot access funds during outage
- Want to self-host infrastructure
- Need emergency fund access
- Want to understand recovery options

**Quick link to share**: `https://docs.ghostsol.io/recovery`

## 🧪 Testing

### Test Status Page

```bash
cd status-page
python3 -m http.server 8000
```

### Test Health API

```bash
cd status-page/api
npx ts-node health.ts
```

### Test Runbooks (Dry Run)

```bash
# Review runbooks in staging
# DO NOT run destructive commands in production
# Walk through procedures step-by-step
# Time each procedure
# Update time estimates
```

## 📊 Monitoring Integration

### PagerDuty

Configure alerts to reference runbooks:
- RPC alerts → Link to `rpc-failure.md`
- Forester alerts → Link to `forester-failure.md`
- Critical alerts → Link to `recovery.md`

### Datadog

Set up dashboard with:
- RPC response times
- Forester queue depth
- Error rates
- Uptime percentages

### Status Page API

The status page auto-refreshes from `/api/health` every 30 seconds.

## 🎯 Success Metrics

Track these metrics:
- **MTTD** (Mean Time To Detect): Time from incident start to detection
- **MTTR** (Mean Time To Resolve): Time from detection to resolution
- **Uptime**: Target 99.9% (43 min downtime/month)
- **User Impact**: Number of users affected per incident

## 📅 Regular Maintenance

### Daily
- Review status page (all components green?)
- Check error logs
- Verify backups completed

### Weekly
- Review incident history
- Update runbooks if needed
- Check disk space trends

### Monthly
- Test failover procedures
- Review all runbooks
- Audit access credentials

### Quarterly
- Full disaster recovery drill
- Update all documentation
- Review and update communication templates

## 📞 Emergency Contacts

| Role | Contact Method | Availability |
|------|---------------|--------------|
| On-Call Engineer | PagerDuty | 24/7 |
| DevOps Lead | Slack/Phone | Business hours |
| Security Team | security@ghostsol.io | 24/7 for P0 |
| Light Protocol | Discord #support | Business hours |

**Status Page**: https://uptime.ghostsol.io  
**War Room**: Zoom link in PagerDuty alert

## 🔗 Related Documentation

- `/workspace/STATUS_PAGE_COMPLETION_SUMMARY.md` - Implementation details
- `/workspace/docs/USER_RECOVERY_GUIDE.md` - User-facing recovery
- `/workspace/docs/research/liveness-and-infra.md` - Architecture
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` - Overall roadmap

## 📝 Contributing

When updating runbooks:
1. ✅ Test procedures in staging first
2. ✅ Update time estimates based on actual incidents
3. ✅ Add new scenarios as discovered
4. ✅ Keep communication templates current
5. ✅ Version history at bottom of each runbook

## ✨ Quick Links

- **Deploy Status Page**: See `STATUS_PAGE_COMPLETION_SUMMARY.md`
- **Incident Response**: Start with appropriate runbook
- **User Questions**: Direct to `USER_RECOVERY_GUIDE.md`
- **Team Training**: Schedule runbook walkthrough
- **DR Drill**: Use `recovery.md` Section: "Prevention Strategies"

---

**Last Updated**: 2025-10-29  
**Maintained By**: GhostSOL DevOps Team  
**Questions**: #infrastructure Slack channel
