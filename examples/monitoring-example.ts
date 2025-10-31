/**
 * Example: Using Monitoring and Analytics with GhostSol SDK
 * 
 * This example demonstrates how to set up and use the monitoring
 * and analytics features of the GhostSol SDK.
 */

import { 
  initializeMonitoring,
  initializeAnalytics,
  getMonitor,
  getAnalytics,
  init,
  transfer,
  compress,
  getBalance,
  getSdkInstance
} from '@ghostsol/sdk';
import { Keypair } from '@solana/web3.js';

async function setupMonitoringAndAnalytics() {
  console.log('🔧 Setting up monitoring and analytics...\n');

  // 1. Initialize Monitoring
  const monitor = initializeMonitoring({
    enabled: true,
    environment: 'development',
    debug: true,
    performanceSampleRate: 1.0, // Track 100% in development
    alertThresholds: {
      maxErrorRate: 10,
      maxLatency: 5000,
      maxFailureRate: 0.1,
    },
    onError: (error) => {
      console.log(`🚨 Error detected: ${error.message} [${error.severity}]`);
    },
    onPerformanceMetric: (metric) => {
      console.log(`📊 Performance: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    },
  });

  console.log('✅ Monitoring initialized');

  // 2. Initialize Analytics (with explicit opt-in)
  const analytics = initializeAnalytics({
    enabled: true, // Explicit opt-in required
    debug: true,
    appContext: {
      name: 'MonitoringExample',
      version: '1.0.0',
      environment: 'development',
    },
    onEvent: (event) => {
      console.log(`📈 Analytics event: ${event.name} [${event.type}]`);
    },
  });

  console.log('✅ Analytics initialized (opt-in)\n');

  return { monitor, analytics };
}

async function demonstrateMonitoring() {
  console.log('=== Monitoring & Analytics Demo ===\n');

  // Setup
  const { monitor, analytics } = await setupMonitoringAndAnalytics();

  // Create a test wallet
  const keypair = Keypair.generate();
  console.log(`Wallet: ${keypair.publicKey.toBase58()}\n`);

  // Initialize SDK (this will be automatically monitored)
  console.log('🔄 Initializing SDK...');
  await init({
    wallet: keypair,
    cluster: 'devnet',
  });
  console.log('✅ SDK initialized\n');

  // Example 1: Tracked Operations
  console.log('--- Example 1: Automatically Tracked Operations ---');
  try {
    // These operations are automatically monitored
    const balance = await getBalance();
    console.log(`Balance: ${balance} lamports\n`);
  } catch (error) {
    console.log('Expected error (no compressed account)\n');
  }

  // Example 2: Manual Error Tracking
  console.log('--- Example 2: Manual Error Tracking ---');
  try {
    throw new Error('Example error for tracking');
  } catch (error) {
    monitor.trackError(error as Error, {
      operation: 'custom_operation',
      severity: 'low',
      metadata: { context: 'example' },
    });
  }
  console.log('');

  // Example 3: Manual Performance Tracking
  console.log('--- Example 3: Manual Performance Tracking ---');
  const endTimer = monitor.startTimer('custom_task');
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
  endTimer(true);
  console.log('');

  // Example 4: Feature Tracking
  console.log('--- Example 4: Feature Tracking ---');
  analytics.trackFeature('custom_feature', {
    context: 'demo',
  });
  console.log('');

  // Example 5: Custom Analytics Events
  console.log('--- Example 5: Custom Analytics Events ---');
  analytics.trackCustom('user_milestone', {
    milestone: 'demo_completed',
  });
  console.log('');

  // Example 6: Health Check
  console.log('--- Example 6: Health Check ---');
  const health = await monitor.performHealthCheck(
    // RPC check
    async () => {
      try {
        const sdk = getSdkInstance();
        return sdk.isInitialized();
      } catch {
        return false;
      }
    },
    // Compression check
    async () => {
      return true; // Simplified for example
    },
    // Balance check
    async () => {
      return true; // Simplified for example
    }
  );
  console.log('Health check result:', JSON.stringify(health, null, 2));
  console.log('');

  // Example 7: Get Statistics
  console.log('--- Example 7: Monitoring Statistics ---');
  const monitorStats = monitor.getStats();
  console.log('Monitoring Stats:', JSON.stringify(monitorStats, null, 2));
  console.log('');

  console.log('--- Example 8: Analytics Statistics ---');
  const analyticsStats = analytics.getStats();
  console.log('Analytics Stats:', JSON.stringify(analyticsStats, null, 2));
  console.log('');

  // Example 9: Feature Usage
  console.log('--- Example 9: Feature Usage Details ---');
  const features = analytics.getFeatureUsage();
  console.log('Feature Usage:', JSON.stringify(features, null, 2));
  console.log('');

  // Example 10: Export Data
  console.log('--- Example 10: Export Data ---');
  const monitorExport = monitor.export();
  const analyticsExport = analytics.export();
  console.log('Exported monitoring data:', {
    errorCount: monitorExport.errors.length,
    metricCount: monitorExport.metrics.length,
  });
  console.log('Exported analytics data:', {
    eventCount: analyticsExport.events.length,
    totalOperations: analyticsExport.stats.totalOperations,
  });
  console.log('');

  console.log('=== Demo Complete ===\n');
  console.log('✅ All monitoring and analytics features demonstrated');
  console.log('📝 Check the console output above for detailed results');
}

// Example with error handling and custom alerts
async function productionExample() {
  console.log('=== Production Setup Example ===\n');

  // Production monitoring setup
  const monitor = initializeMonitoring({
    enabled: true,
    sentryDsn: process.env.SENTRY_DSN, // Optional Sentry integration
    environment: 'production',
    version: '1.0.0',
    performanceSampleRate: 0.1, // Sample 10% in production
    alertThresholds: {
      maxErrorRate: 5,
      maxLatency: 5000,
      maxFailureRate: 0.05,
    },
    onError: (error) => {
      // Send critical errors to alert system
      if (error.severity === 'critical') {
        console.log(`🚨 CRITICAL ALERT: ${error.message}`);
        // sendToAlertSystem(error);
      }
    },
  });

  // Optional: Analytics with user consent
  const userConsent = true; // Get from user preference
  if (userConsent) {
    const analytics = initializeAnalytics({
      enabled: true,
      endpoint: 'https://analytics.example.com',
      apiKey: process.env.ANALYTICS_API_KEY,
      appContext: {
        name: 'ProductionApp',
        version: '1.0.0',
        environment: 'production',
      },
    });
  }

  console.log('✅ Production monitoring configured');
  console.log('📊 Analytics: ' + (userConsent ? 'Enabled (with consent)' : 'Disabled'));
}

// Run examples
if (require.main === module) {
  demonstrateMonitoring()
    .then(() => productionExample())
    .then(() => console.log('\n✅ All examples completed successfully'))
    .catch(error => {
      console.error('❌ Example failed:', error);
      process.exit(1);
    });
}

export {
  setupMonitoringAndAnalytics,
  demonstrateMonitoring,
  productionExample,
};
