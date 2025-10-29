# Incident Communication Templates

## Overview
This document provides templates for communicating during incidents across different channels and audiences. Use these templates to ensure consistent, clear, and timely communication during incidents.

---

## Communication Principles

### Key Principles
1. **Be Transparent**: Honest about what happened and impact
2. **Be Timely**: Update frequently, even if no new information
3. **Be Clear**: Avoid jargon, explain technical issues simply
4. **Reassure Users**: Emphasize fund safety first
5. **Own It**: Take responsibility, no blame-shifting

### Communication Cadence
- **First 5 minutes**: Initial acknowledgment
- **Every 15 minutes**: Updates during active incident
- **Resolution**: Immediate notification when resolved
- **24-48 hours**: Detailed postmortem

---

## Internal Communication

### 1. Initial Alert (Slack #incidents)

```
🔴 INCIDENT DETECTED - [TIMESTAMP]

COMPONENT: [RPC / Forester / SDK / Multiple]
SEVERITY: P0 / P1 / P2
STATUS: Investigating

SYMPTOMS:
- [What's happening]
- [User impact]

INITIAL ASSESSMENT:
- [What we know so far]
- [What we're checking]

ASSIGNED TO: @[engineer-name]
INCIDENT COMMANDER: @[name]

Response starting now. Updates every 15 min.
```

**Example**:
```
🔴 INCIDENT DETECTED - 2025-10-29 14:23:00 UTC

COMPONENT: Photon RPC Primary
SEVERITY: P0
STATUS: Investigating

SYMPTOMS:
- RPC health check failing
- Users reporting "connection refused" errors
- 500ms+ response times

INITIAL ASSESSMENT:
- Started ~5 minutes ago
- Backup RPC still operational
- Checking server status now

ASSIGNED TO: @alice
INCIDENT COMMANDER: @bob

Response starting now. Updates every 15 min.
```

---

### 2. Incident Update (Slack #incidents)

```
📊 INCIDENT UPDATE - [TIMESTAMP]

STATUS: [Investigating / Identified / Resolving / Monitoring]
TIME ELAPSED: [X minutes]

WHAT WE KNOW:
- [New information]
- [Root cause if identified]

ACTIONS TAKEN:
- ✅ [Completed action]
- 🔄 [In progress action]
- ⏳ [Planned action]

CURRENT IMPACT:
- [What users can't do]
- [What still works]

FUNDS STATUS: All user funds remain cryptographically safe on-chain.

ETA: [Resolution estimate or "investigating"]

Next update in 15 minutes or when status changes.
```

**Example**:
```
📊 INCIDENT UPDATE - 2025-10-29 14:38:00 UTC

STATUS: Identified
TIME ELAPSED: 15 minutes

WHAT WE KNOW:
- Primary RPC server disk is 100% full
- Log files consuming all space
- Root cause: Log rotation failed

ACTIONS TAKEN:
- ✅ Confirmed backup RPC operational
- ✅ DNS failover initiated to backup
- 🔄 Clearing logs on primary server
- ⏳ Will restart primary once space cleared

CURRENT IMPACT:
- Users automatically failing over to backup RPC
- Some may experience 2-3 second delay
- All operations functional

FUNDS STATUS: All user funds remain cryptographically safe on-chain.

ETA: Primary RPC back online in ~10 minutes

Next update in 10 minutes or when resolved.
```

---

### 3. Resolution Notification (Slack #incidents)

```
✅ INCIDENT RESOLVED - [TIMESTAMP]

DURATION: [Total time]
RESOLVED BY: @[name]

WHAT HAPPENED:
[Brief explanation]

HOW WE FIXED IT:
[Resolution steps]

USER IMPACT:
- [Who was affected]
- [What they couldn't do]
- [Compensation if applicable]

NEXT STEPS:
- [ ] Post-incident review scheduled for [date/time]
- [ ] Postmortem document [link when ready]
- [ ] Update runbooks
- [ ] Implement preventive measures

FUNDS STATUS: All user funds safe. No data loss.

Thanks to @[names] for rapid response.
```

**Example**:
```
✅ INCIDENT RESOLVED - 2025-10-29 14:52:00 UTC

DURATION: 29 minutes
RESOLVED BY: @alice, @bob

WHAT HAPPENED:
Primary RPC server ran out of disk space due to log rotation script failing. This caused the RPC to become unresponsive.

HOW WE FIXED IT:
- Cleared old logs (freed 15GB)
- Fixed log rotation cron job
- Restarted RPC service
- Verified health and performance

USER IMPACT:
- Users who connected 14:25-14:38 may have experienced 2-5 second delays
- Auto-failover to backup RPC worked as designed
- ~50 active users affected
- No transactions lost or failed

NEXT STEPS:
- [x] Post-incident review scheduled for tomorrow 10am
- [ ] Postmortem document (will publish in 24h)
- [ ] Update disk space monitoring alerts
- [ ] Implement automated log cleanup

FUNDS STATUS: All user funds safe. No data loss.

Thanks to @alice for quick diagnosis and @bob for coordinating response.
```

---

## Public Communication (Status Page)

### 1. Initial Incident Notification

```
Title: [Component Name] [Issue Type]
Status: Investigating
Components: [List affected components]

---

We are currently investigating issues with [component name]. 

Impact:
- [What users can't do]
- [What still works]

Your funds remain cryptographically safe on the Solana blockchain.

We are investigating and will provide updates as we learn more.

Updated: [timestamp]
```

**Example**:
```
Title: Photon RPC Degraded Performance
Status: Investigating
Components: Photon RPC (Primary)

---

We are currently investigating elevated response times on our primary RPC endpoint.

Impact:
- Some requests may take 2-5 seconds instead of <1 second
- Backup RPC is operational and handling overflow
- All operations remain functional

Your funds remain cryptographically safe on the Solana blockchain.

We are investigating and will provide updates as we learn more.

Updated: 2025-10-29 14:25:00 UTC
```

---

### 2. Identified Incident Update

```
Title: [Component Name] [Issue Type]
Status: Identified
Components: [List affected components]

---

We have identified the root cause of the [component name] issues.

Root Cause:
[Brief, user-friendly explanation]

Current Status:
[What we're doing to fix it]

Impact:
- [Updated impact assessment]

Estimated Resolution:
[Time estimate]

Your funds remain safe. We will update when resolved.

Updated: [timestamp]
```

**Example**:
```
Title: Photon RPC Degraded Performance  
Status: Identified
Components: Photon RPC (Primary)

---

We have identified the root cause of the RPC performance issues.

Root Cause:
Our primary RPC server ran out of disk space due to excessive logging.

Current Status:
- Clearing disk space (in progress)
- Backup RPC handling all traffic normally
- Service will auto-recover once space is cleared

Impact:
- Minimal - automatic failover is working as designed
- Some users may notice slight delays

Estimated Resolution:
~10 minutes

Your funds remain safe. We will update when resolved.

Updated: 2025-10-29 14:38:00 UTC
```

---

### 3. Resolution Notification

```
Title: [Component Name] [Issue Type]
Status: Resolved
Components: [List affected components]

---

The [component name] issues have been resolved.

What Happened:
[Brief explanation]

Resolution:
[What we did to fix it]

Impact:
- Duration: [X minutes]
- [Who was affected]

Prevention:
[What we're doing to prevent recurrence]

All systems are now operational. Thank you for your patience.

Updated: [timestamp]
```

**Example**:
```
Title: Photon RPC Degraded Performance
Status: Resolved  
Components: Photon RPC (Primary)

---

The RPC performance issues have been resolved.

What Happened:
Our primary RPC server's disk filled up due to a log rotation script failure, causing degraded performance for approximately 29 minutes.

Resolution:
- Cleared disk space
- Fixed log rotation automation
- Verified all systems operational
- Performance back to normal (<500ms response times)

Impact:
- Duration: 29 minutes (14:23 - 14:52 UTC)
- ~50 active users experienced 2-5 second delays
- No transaction failures or data loss
- Automatic failover worked as designed

Prevention:
- Enhanced disk space monitoring
- Automated log cleanup
- Additional alerting thresholds

All systems are now operational. Thank you for your patience.

Updated: 2025-10-29 14:52:00 UTC
```

---

## User Email Communication

### 1. Critical Incident Notification

**Subject**: [URGENT] GhostSOL Service Disruption - Your Funds Are Safe

```
Dear GhostSOL User,

We are writing to inform you of a service disruption affecting [component/service name].

MOST IMPORTANT: Your funds are cryptographically safe on the Solana blockchain.

What's Happening:
[Brief, clear explanation of the issue]

Impact on You:
✅ Your funds are safe and secured on-chain
❌ [What you can't currently do]
✅ [What still works]

Current Status:
[What we're doing to resolve it]

Estimated Resolution:
[Time estimate or "We are working urgently to resolve this"]

What You Can Do:
- Check live updates: https://uptime.ghostsol.io
- For urgent access, see our recovery guide: [link]
- Contact support: support@ghostsol.io

We sincerely apologize for this disruption and are working urgently to restore full service.

- The GhostSOL Team

---
Live Status: https://uptime.ghostsol.io
Support: support@ghostsol.io
```

---

### 2. All-Clear Notification

**Subject**: GhostSOL Service Restored - Thank You for Your Patience

```
Dear GhostSOL User,

We are pleased to inform you that the service disruption affecting [component] has been resolved.

Summary:
- Issue: [Brief explanation]
- Duration: [X minutes/hours]
- Resolution: [What we did]

Impact:
[Description of who was affected and how]

All Systems Now Operational:
✅ RPC endpoints
✅ Forester service  
✅ SDK endpoints
✅ All balances and transactions accessible

What We're Doing to Prevent This:
[Brief list of preventive measures]

Full postmortem report will be published within 48 hours at: [link]

Thank you for your patience and understanding. If you experienced any issues or have questions, please don't hesitate to contact us.

- The GhostSOL Team

---
Status Page: https://uptime.ghostsol.io
Support: support@ghostsol.io
```

---

### 3. Scheduled Maintenance Notification

**Subject**: Scheduled Maintenance: [Date/Time] - Brief Service Interruption

```
Dear GhostSOL User,

We will be performing scheduled maintenance on [date] at [time] [timezone].

Maintenance Window:
- Start: [Date/Time]
- Duration: Approximately [X minutes]  
- Expected Completion: [Date/Time]

Impact During Maintenance:
❌ [What will be unavailable]
✅ [What will remain available]
✅ Your funds remain safe on-chain

What We're Doing:
[Brief explanation of maintenance activities]
- [Activity 1]
- [Activity 2]

Benefits After Maintenance:
[What improvements users will see]

No Action Required:
The maintenance will be performed automatically. You don't need to do anything.

Live Updates:
We will provide updates during the maintenance window at: https://uptime.ghostsol.io

Questions? Contact us at support@ghostsol.io

Thank you for your understanding.

- The GhostSOL Team
```

---

## Social Media (Twitter/Discord)

### 1. Incident Alert

```
🔴 We are currently investigating issues with [component name]. 

Impact: [brief description]
Your funds: ✅ Safe on-chain

Live updates: https://uptime.ghostsol.io

We're working on a fix and will update soon.
```

---

### 2. Resolution Tweet

```
✅ The [component name] issues have been resolved.

Duration: [X minutes]
Cause: [brief explanation]  
Resolution: [brief fix description]

All systems operational. Thanks for your patience!

Full details: https://uptime.ghostsol.io
```

---

### 3. Scheduled Maintenance

```
🔧 Scheduled maintenance: [Date] at [Time] [TZ]

Duration: ~[X minutes]
Impact: [brief description]

Your funds remain safe. Updates at: https://uptime.ghostsol.io

#maintenance #ghostsol
```

---

## Postmortem Report

### Public Postmortem Template

**File**: `postmortems/YYYY-MM-DD-incident-name.md`

```markdown
# Incident Postmortem: [Incident Title]

**Date**: [YYYY-MM-DD]  
**Duration**: [X hours/minutes]  
**Impact**: [High/Medium/Low]  
**Affected Users**: [Number or percentage]

---

## Summary

On [date] at [time], we experienced [brief description of incident]. The incident lasted [duration] and affected [scope]. All user funds remained cryptographically safe on the Solana blockchain throughout the incident.

---

## Impact

- **User Impact**: [Description of what users experienced]
- **Affected Users**: [Number/percentage of users affected]
- **Failed Requests**: [Number/percentage if applicable]
- **Data Loss**: None - all data secured on-chain
- **Financial Impact**: [If any, e.g., compensation provided]

---

## Timeline (All times UTC)

- **14:23:00** - Incident begins: [what happened]
- **14:25:00** - First alert triggered
- **14:26:00** - Engineer paged, begins investigation
- **14:30:00** - Root cause identified: [cause]
- **14:32:00** - Mitigation started: [action]
- **14:38:00** - Failover to backup completed
- **14:45:00** - Primary system recovered
- **14:50:00** - Full verification completed
- **14:52:00** - Incident resolved

**Total Duration**: 29 minutes

---

## Root Cause

[Detailed explanation of what went wrong and why]

### Technical Details

[More technical explanation for developers/engineers]

### Why It Wasn't Caught Earlier

[Explanation of monitoring gaps or why alerts didn't fire]

---

## Resolution

### Immediate Fix

[What we did to resolve the immediate issue]

### Verification

[How we verified the fix worked]

---

## Lessons Learned

### What Went Well

- ✅ [Thing that worked well]
- ✅ [Thing that worked well]
- ✅ [Thing that worked well]

### What Went Wrong

- ❌ [Thing that didn't work]
- ❌ [Thing that didn't work]
- ❌ [Thing that didn't work]

### Where We Got Lucky

- 🍀 [Thing that could have been worse]
- 🍀 [Thing that could have been worse]

---

## Action Items

| Action | Owner | Priority | Due Date | Status |
|--------|-------|----------|----------|--------|
| [Specific action] | @engineer | P0 | [Date] | ☐ |
| [Specific action] | @engineer | P1 | [Date] | ☐ |
| [Specific action] | @devops | P1 | [Date] | ☐ |

---

## Prevention

To prevent this from happening again, we are implementing:

1. **[Preventive Measure 1]**
   - Timeline: [Date]
   - Owner: [Name]
   - Description: [Details]

2. **[Preventive Measure 2]**
   - Timeline: [Date]
   - Owner: [Name]
   - Description: [Details]

---

## User Compensation

[If applicable, describe any compensation provided to affected users]

---

## Conclusion

We sincerely apologize for this incident. We take reliability seriously and are committed to preventing similar incidents in the future. If you have any questions or concerns, please reach out to support@ghostsol.io.

---

**Report prepared by**: [Name]  
**Reviewed by**: [Names]  
**Published**: [Date]
```

---

## Communication Checklist

Use this checklist during an incident:

### Detection (0-5 minutes)
- [ ] Incident detected (automated or manual)
- [ ] Severity assessed (P0/P1/P2)
- [ ] On-call engineer paged
- [ ] Incident channel created (#incident-YYYY-MM-DD)

### Initial Response (5-15 minutes)
- [ ] Initial Slack notification posted
- [ ] Incident commander assigned
- [ ] Status page updated (investigating)
- [ ] Preliminary impact assessment completed

### Active Incident (Every 15 minutes)
- [ ] Slack update posted
- [ ] Status page updated
- [ ] Progress documented

### Resolution (Immediate)
- [ ] Slack resolution notification posted
- [ ] Status page updated (resolved)
- [ ] Verification completed
- [ ] Monitoring confirmed

### Post-Incident (24-48 hours)
- [ ] User email notification (if P0)
- [ ] Social media notification (if public impact)
- [ ] Postmortem scheduled
- [ ] Postmortem document created
- [ ] Public postmortem published
- [ ] Action items tracked

---

## Severity Definitions

### P0 - Critical
- **User Impact**: Major functionality unavailable
- **Example**: RPC completely down, users cannot transact
- **Response Time**: Immediate
- **Communication**: All channels, frequent updates

### P1 - High
- **User Impact**: Degraded functionality
- **Example**: Slow response times, some features unavailable
- **Response Time**: <15 minutes
- **Communication**: Status page, Slack

### P2 - Medium
- **User Impact**: Minor issues, workarounds available
- **Example**: Non-critical feature broken
- **Response Time**: <1 hour
- **Communication**: Internal only initially

---

## Version History
- v1.0 (2025-10-29): Initial template created

---

**Remember**: Clear, honest, and timely communication builds trust, even during incidents.
```

Now let me save this final template file.
