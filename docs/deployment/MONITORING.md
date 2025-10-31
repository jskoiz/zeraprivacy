# GhostSol SDK Monitoring & Analytics

This document describes the monitoring, error tracking, and analytics capabilities of the GhostSol SDK.

## Table of Contents

- [Overview](#overview)
- [Monitoring](#monitoring)
  - [Setup](#monitoring-setup)
  - [Error Tracking](#error-tracking)
  - [Performance Metrics](#performance-metrics)
  - [Health Checks](#health-checks)
  - [Alerts](#alerts)
- [Analytics](#analytics)
  - [Setup](#analytics-setup)
  - [Opt-In Policy](#opt-in-policy)
  - [Privacy Considerations](#privacy-considerations)
  - [Usage Tracking](#usage-tracking)
- [Integration with Sentry](#integration-with-sentry)
- [Custom Handlers](#custom-handlers)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

The GhostSol SDK includes built-in monitoring and analytics capabilities to help you:

- **Track errors** in production and development
- **Monitor performance** of SDK operations
- **Collect usage statistics** (with explicit opt-in)
- **Set up alerts** for critical issues
- **Perform health checks** on SDK components

All monitoring features are **privacy-respecting** and **configurable**. Analytics requires explicit opt-in and never collects sensitive data like private keys, addresses, or transaction amounts.

## Monitoring

### Monitoring Setup

Initialize monitoring at the start of your application:

```typescript
import { initializeMonitoring } from '@ghostsol/sdk';

// Basic setup
const monitor = initializeMonitoring({
  enabled: true,
  environment: 'production',
  debug: false,
});

// Advanced setup with Sentry
const monitor = initializeMonitoring({
  enabled: true,
  sentryDsn: 'https://your-sentry-dsn@sentry.io/project',
  environment: 'production',
  version: '1.0.0',
  performanceSampleRate: 0.1,
  alertThresholds: {
    maxErrorRate: 10, // errors per minute
    maxLatency: 5000, // milliseconds
    maxFailureRate: 0.1, // 10%
  },
});
```

### Error Tracking

The SDK automatically tracks errors in all operations. You can also manually track errors:

```typescript
import { getMonitor } from '@ghostsol/sdk';

const monitor = getMonitor();

try {
  // Your code
} catch (error) {
  monitor?.trackError(error, {
    operation: 'custom_operation',
    metadata: { userId: 'user123' },
    severity: 'high',
  });
}
```

**Severity Levels:**
- `low`: Minor issues, non-critical
- `medium`: Issues that may affect functionality
- `high`: Significant errors affecting operations
- `critical`: Critical errors requiring immediate attention

### Performance Metrics

Track performance of custom operations:

```typescript
import { getMonitor } from '@ghostsol/sdk';

const monitor = getMonitor();

// Manual timing
const endTimer = monitor?.startTimer('my_operation');
try {
  await myOperation();
  endTimer?.(true); // Success
} catch (error) {
  endTimer?.(false); // Failure
  throw error;
}

// Or use trackMetric directly
monitor?.trackMetric({
  operation: 'data_fetch',
  duration: 123.45,
  success: true,
  tags: { endpoint: 'api' },
});
```

### Health Checks

Perform periodic health checks:

```typescript
import { getMonitor, init } from '@ghostsol/sdk';

const monitor = getMonitor();

// Perform health check
const health = await monitor?.performHealthCheck(
  // RPC check
  async () => {
    try {
      const sdk = getSdkInstance();
      await sdk.getBalance();
      return true;
    } catch {
      return false;
    }
  },
  // Compression check
  async () => {
    return true; // Check if compression is available
  },
  // Balance cache check
  async () => {
    return true; // Check if cache is working
  }
);

console.log('Health:', health);
// {
//   healthy: true,
//   checks: {
//     rpc: { healthy: true, latency: 123 },
//     compression: { healthy: true, available: true },
//     balance: { healthy: true, cached: true }
//   },
//   timestamp: 1234567890
// }
```

### Alerts

Configure alert thresholds and receive notifications:

```typescript
const monitor = initializeMonitoring({
  enabled: true,
  alertThresholds: {
    maxErrorRate: 10, // Alert if > 10 errors/minute
    maxLatency: 5000, // Alert if avg latency > 5 seconds
    maxFailureRate: 0.1, // Alert if > 10% of operations fail
  },
  onError: (error) => {
    // Custom alert handler
    if (error.severity === 'critical') {
      sendSlackAlert(error.message);
    }
  },
});

// Get alerts
const stats = monitor.getStats();
console.log('Recent alerts:', stats.alerts);
```

### Monitoring Statistics

Retrieve comprehensive monitoring statistics:

```typescript
const stats = monitor?.getStats();
console.log(stats);
// {
//   totalErrors: 5,
//   errorsByType: { 'TransferError': 3, 'CompressionError': 2 },
//   totalOperations: 100,
//   averageLatency: 234.56,
//   successRate: 0.95,
//   alerts: [...]
// }
```

## Analytics

### Analytics Setup

Analytics are **disabled by default** and require explicit opt-in:

```typescript
import { initializeAnalytics } from '@ghostsol/sdk';

// Analytics MUST be explicitly enabled
const analytics = initializeAnalytics({
  enabled: true, // Required - must explicitly opt in
  endpoint: 'https://analytics.example.com/events',
  apiKey: 'your-api-key',
  appContext: {
    name: 'MyApp',
    version: '1.0.0',
    environment: 'production',
  },
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
});
```

### Opt-In Policy

**IMPORTANT:** Analytics are completely opt-in. Users must explicitly enable analytics:

```typescript
// ❌ This will NOT enable analytics
const analytics = initializeAnalytics({
  // enabled not specified
});

// ✅ This will enable analytics
const analytics = initializeAnalytics({
  enabled: true, // Explicit opt-in required
});
```

### Privacy Considerations

The SDK analytics **NEVER** collect:
- Private keys
- Wallet addresses
- Transaction amounts (exact values)
- Personal identifiable information (PII)

Analytics **DO** collect:
- Operation types (compress, transfer, decompress)
- Success/failure rates
- Performance metrics (duration)
- Feature usage counts
- Error types (without sensitive data)
- Transaction amount ranges (e.g., "1-10 SOL")

All user IDs are anonymized and randomly generated.

### Usage Tracking

Track SDK usage patterns:

```typescript
import { getAnalytics } from '@ghostsol/sdk';

const analytics = getAnalytics();

// Track feature usage
analytics?.trackFeature('custom_feature', {
  context: 'user_action',
});

// Track operations
const complete = analytics?.trackOperationStart('data_sync', {
  source: 'blockchain',
});
// ... perform operation
complete?.(true); // Mark as successful

// Track custom events
analytics?.trackCustom('user_milestone', {
  milestone: 'first_transaction',
});

// Get usage statistics
const stats = analytics?.getStats();
console.log(stats);
// {
//   totalOperations: 50,
//   operationsByType: { 'transfer': 30, 'compress': 20 },
//   totalErrors: 2,
//   featureUsage: { 'transfer': 30 },
//   averageOperationDuration: 234.56,
//   sessionDuration: 120000
// }
```

### Feature Usage Details

Get detailed feature usage information:

```typescript
const features = analytics?.getFeatureUsage();
console.log(features);
// [
//   {
//     feature: 'transfer',
//     count: 30,
//     firstUsed: 1234567890,
//     lastUsed: 1234567999,
//     averageDuration: 234.56
//   },
//   ...
// ]
```

## Integration with Sentry

The SDK includes built-in Sentry integration for error tracking:

### 1. Install Sentry

```bash
npm install @sentry/browser
# or
npm install @sentry/node
```

### 2. Include Sentry in Your App

```html
<!-- Browser -->
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
```

Or in Node.js:
```typescript
import * as Sentry from '@sentry/node';
```

### 3. Initialize Monitoring with Sentry

```typescript
import { initializeMonitoring } from '@ghostsol/sdk';

const monitor = initializeMonitoring({
  enabled: true,
  sentryDsn: 'https://your-sentry-dsn@sentry.io/project',
  environment: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  performanceSampleRate: 0.1,
});
```

The SDK will automatically:
- Send errors to Sentry
- Add breadcrumbs for operations
- Include context and metadata
- Track performance transactions

## Custom Handlers

Implement custom handlers for monitoring events:

```typescript
const monitor = initializeMonitoring({
  enabled: true,
  onError: (error) => {
    // Send to custom logging service
    logToService(error);
    
    // Send alerts for critical errors
    if (error.severity === 'critical') {
      sendPagerDutyAlert(error);
    }
  },
  onPerformanceMetric: (metric) => {
    // Send to custom metrics service
    metricsService.track(metric.operation, metric.duration);
  },
});

const analytics = initializeAnalytics({
  enabled: true,
  onEvent: (event) => {
    // Send to custom analytics platform
    customAnalytics.track(event.name, event.properties);
  },
});
```

## Best Practices

### 1. Initialize Early

Initialize monitoring and analytics at the start of your application:

```typescript
// Initialize monitoring first
const monitor = initializeMonitoring({
  enabled: true,
  environment: process.env.NODE_ENV,
});

// Then initialize SDK
await init({
  wallet: keypair,
  cluster: 'devnet',
});
```

### 2. Set Appropriate Alert Thresholds

Configure thresholds based on your application's needs:

```typescript
const monitor = initializeMonitoring({
  enabled: true,
  alertThresholds: {
    maxErrorRate: process.env.NODE_ENV === 'production' ? 5 : 50,
    maxLatency: 5000,
    maxFailureRate: 0.05,
  },
});
```

### 3. Use Sample Rates for High-Traffic Apps

Reduce overhead by sampling:

```typescript
const monitor = initializeMonitoring({
  enabled: true,
  performanceSampleRate: 0.1, // Track 10% of operations
});
```

### 4. Respect User Privacy

Always get explicit consent before enabling analytics:

```typescript
const userConsent = await getUserConsent();

if (userConsent) {
  initializeAnalytics({
    enabled: true,
    endpoint: 'https://analytics.example.com',
  });
}
```

### 5. Clean Up Data Periodically

The SDK automatically cleans up old data (older than 1 hour) every 10 minutes. For manual cleanup:

```typescript
monitor?.clear();
analytics?.clear();
```

### 6. Export Data for Analysis

Export monitoring data for offline analysis:

```typescript
const monitorData = monitor?.export();
const analyticsData = analytics?.export();

// Save to file or send to analysis service
fs.writeFileSync('monitoring-data.json', JSON.stringify(monitorData));
```

## Examples

### Example 1: Basic Monitoring Setup

```typescript
import { initializeMonitoring, init, getMonitor } from '@ghostsol/sdk';

// Initialize monitoring
const monitor = initializeMonitoring({
  enabled: true,
  environment: 'production',
  debug: false,
});

// Initialize SDK
await init({
  wallet: keypair,
  cluster: 'devnet',
});

// Perform operations (automatically monitored)
await transfer(recipient, 1000000);

// Check statistics
const stats = monitor.getStats();
console.log(`Success rate: ${(stats.successRate * 100).toFixed(2)}%`);
```

### Example 2: Custom Error Handling

```typescript
import { getMonitor } from '@ghostsol/sdk';

async function customOperation() {
  const monitor = getMonitor();
  const endTimer = monitor?.startTimer('custom_operation');
  
  try {
    // Your operation
    await doSomething();
    endTimer?.(true);
  } catch (error) {
    endTimer?.(false);
    monitor?.trackError(error, {
      operation: 'custom_operation',
      severity: 'high',
      metadata: { context: 'user_action' },
    });
    throw error;
  }
}
```

### Example 3: Health Check Dashboard

```typescript
import { getMonitor } from '@ghostsol/sdk';

async function createHealthDashboard() {
  const monitor = getMonitor();
  
  setInterval(async () => {
    const health = await monitor?.performHealthCheck(
      checkRpcHealth,
      checkCompressionHealth,
      checkBalanceCacheHealth
    );
    
    if (!health?.healthy) {
      console.error('⚠️ Unhealthy components:', health?.checks);
      sendAlert('SDK health check failed');
    } else {
      console.log('✅ All systems healthy');
    }
  }, 60000); // Check every minute
}
```

### Example 4: Opt-In Analytics with User Consent

```typescript
import { initializeAnalytics, getAnalytics } from '@ghostsol/sdk';

async function setupAnalytics() {
  // Show consent dialog to user
  const userConsent = await showConsentDialog({
    title: 'Help Improve Our App',
    message: 'Allow anonymous usage analytics? No personal data will be collected.',
  });
  
  if (userConsent) {
    initializeAnalytics({
      enabled: true,
      endpoint: 'https://analytics.example.com',
      appContext: {
        name: 'MyApp',
        version: '1.0.0',
      },
    });
    
    console.log('✅ Analytics enabled');
  } else {
    console.log('Analytics disabled - respecting user choice');
  }
}
```

### Example 5: Complete Production Setup

```typescript
import { 
  initializeMonitoring, 
  initializeAnalytics,
  init,
  getMonitor,
  getAnalytics 
} from '@ghostsol/sdk';

async function setupProduction() {
  // 1. Initialize monitoring with Sentry
  const monitor = initializeMonitoring({
    enabled: true,
    sentryDsn: process.env.SENTRY_DSN,
    environment: 'production',
    version: process.env.APP_VERSION,
    performanceSampleRate: 0.1,
    alertThresholds: {
      maxErrorRate: 5,
      maxLatency: 5000,
      maxFailureRate: 0.05,
    },
    onError: (error) => {
      if (error.severity === 'critical') {
        sendSlackAlert(`Critical Error: ${error.message}`);
      }
    },
  });
  
  // 2. Initialize analytics (with user consent)
  const hasConsent = await checkUserConsent();
  if (hasConsent) {
    const analytics = initializeAnalytics({
      enabled: true,
      endpoint: process.env.ANALYTICS_ENDPOINT,
      apiKey: process.env.ANALYTICS_API_KEY,
      appContext: {
        name: 'MyApp',
        version: process.env.APP_VERSION,
        environment: 'production',
      },
    });
  }
  
  // 3. Initialize SDK
  await init({
    wallet: keypair,
    cluster: 'mainnet-beta',
    rpcConfig: {
      endpoints: [
        { url: process.env.PRIMARY_RPC, priority: 1 },
        { url: process.env.FALLBACK_RPC, priority: 2 },
      ],
    },
  });
  
  // 4. Set up periodic health checks
  setInterval(async () => {
    const health = await monitor.performHealthCheck(
      checkRpcHealth,
      checkCompressionHealth,
      checkBalanceCacheHealth
    );
    
    if (!health.healthy) {
      sendAlert('SDK health check failed', health);
    }
  }, 300000); // Every 5 minutes
  
  // 5. Export metrics periodically
  setInterval(() => {
    const stats = monitor.getStats();
    const analyticsData = analytics?.getStats();
    
    sendMetrics({
      monitoring: stats,
      analytics: analyticsData,
      timestamp: Date.now(),
    });
  }, 60000); // Every minute
}
```

## Troubleshooting

### Monitoring Not Working

1. Check if monitoring is enabled:
```typescript
const monitor = getMonitor();
if (!monitor) {
  console.log('Monitoring not initialized');
}
```

2. Verify Sentry DSN if using Sentry:
```typescript
console.log('Sentry DSN:', process.env.SENTRY_DSN);
```

### Analytics Not Collecting Data

1. Verify analytics is explicitly enabled:
```typescript
const analytics = getAnalytics();
console.log('Analytics enabled:', analytics?.isEnabled());
```

2. Check if events are being queued:
```typescript
const data = analytics?.export();
console.log('Queued events:', data?.events.length);
```

3. Manually flush events:
```typescript
await analytics?.flush();
```

### Performance Impact

Monitor the performance impact of monitoring/analytics:

```typescript
// Use sampling to reduce overhead
const monitor = initializeMonitoring({
  enabled: true,
  performanceSampleRate: 0.1, // Only track 10%
});

// Disable in development if needed
const monitor = initializeMonitoring({
  enabled: process.env.NODE_ENV === 'production',
});
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/ghostsol
- Documentation: https://docs.ghostsol.com
- Discord: https://discord.gg/ghostsol
