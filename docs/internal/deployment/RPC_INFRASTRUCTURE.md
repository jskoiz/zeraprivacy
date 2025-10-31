# RPC Infrastructure Guide

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2025-10-31

## Overview

The Zera SDK includes a production-grade RPC infrastructure system that provides:

- ✅ **Multiple RPC Provider Support** - Helius, QuickNode, Alchemy, Triton, and custom endpoints
- ✅ **Automatic Failover** - Seamless switching between endpoints on failure
- ✅ **Health Checking** - Continuous monitoring of endpoint availability
- ✅ **Rate Limiting** - Per-endpoint request throttling
- ✅ **Retry Logic** - Exponential backoff on transient failures
- ✅ **Load Balancing** - Weighted distribution across healthy endpoints
- ✅ **Performance Metrics** - Real-time monitoring and analytics
- ✅ **Zero Hardcoded Keys** - All credentials loaded from environment variables

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Supported Providers](#supported-providers)
4. [Advanced Usage](#advanced-usage)
5. [Monitoring & Metrics](#monitoring--metrics)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)

---

## Quick Start

### Basic Setup (Environment Variables)

The simplest way to configure RPC endpoints is using environment variables:

```bash
# .env file
HELIUS_API_KEY=your-helius-api-key-here
SOLANA_CLUSTER=devnet
```

The SDK will automatically load and use these settings:

```typescript
import { init } from '@your-org/ghostsol-sdk';

await init({
  wallet: keypair,
  cluster: 'devnet'
});
// RPC configuration loaded automatically from environment variables
```

### Manual Configuration

For more control, you can configure RPC settings explicitly:

```typescript
import { init, loadRpcConfig, createRpcManager } from '@your-org/ghostsol-sdk';

// Load RPC configuration
const rpcConfig = loadRpcConfig('devnet', {
  commitment: 'confirmed',
  maxRetries: 3,
  enableHealthCheck: true
});

// Initialize SDK with custom RPC config
await init({
  wallet: keypair,
  cluster: 'devnet',
  rpcConfig: rpcConfig
});
```

---

## Configuration

### Environment Variables

#### Required Variables

```bash
# At least one of these should be configured:
HELIUS_API_KEY=your-helius-api-key
# OR
SOLANA_RPC_URL=https://your-rpc-endpoint.com
```

#### Provider-Specific Variables

**Helius (Recommended for ZK Compression)**
```bash
HELIUS_API_KEY=your-helius-api-key
RPC_PRIORITY_HELIUS=1  # Lower number = higher priority
```

**QuickNode**
```bash
QUICKNODE_ENDPOINT=https://your-endpoint.quiknode.pro/your-token/
QUICKNODE_API_KEY=your-quicknode-api-key  # Optional
RPC_PRIORITY_QUICKNODE=2
```

**Alchemy**
```bash
ALCHEMY_API_KEY=your-alchemy-api-key
RPC_PRIORITY_ALCHEMY=3
```

**Triton**
```bash
TRITON_ENDPOINT=https://your-endpoint.rpcpool.com
TRITON_API_KEY=your-triton-api-key  # Optional
RPC_PRIORITY_TRITON=4
```

**Custom RPC**
```bash
CUSTOM_RPC_URL=https://your-custom-rpc.com
CUSTOM_RPC_API_KEY=your-api-key  # Optional
CUSTOM_RPC_SUPPORTS_ZK=false  # Set to true if endpoint supports ZK Compression
RPC_PRIORITY_CUSTOM=5
```

#### Infrastructure Settings

```bash
# Health checking (default: true)
RPC_ENABLE_HEALTH_CHECK=true

# Rate limiting (default: true)
RPC_ENABLE_RATE_LIMITING=true

# Metrics collection (default: true)
RPC_ENABLE_METRICS=true
```

### Programmatic Configuration

#### Simple URL-Based Config

```typescript
import { createRpcConfigFromUrl } from '@your-org/ghostsol-sdk';

const rpcConfig = createRpcConfigFromUrl(
  'https://api.devnet.solana.com',
  'devnet',
  {
    commitment: 'confirmed',
    timeout: 30000,
    maxRetries: 3
  }
);
```

#### Advanced Multi-Provider Config

```typescript
import { RpcConfig, RpcEndpointConfig } from '@your-org/ghostsol-sdk';

const rpcConfig: RpcConfig = {
  cluster: 'devnet',
  commitment: 'confirmed',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  enableHealthCheck: true,
  healthCheckInterval: 60000,
  enableRateLimiting: true,
  enableMetrics: true,
  endpoints: [
    {
      provider: 'helius',
      url: 'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
      priority: 1,
      weight: 10,
      supportsZkCompression: true
    },
    {
      provider: 'quicknode',
      url: 'https://your-endpoint.quiknode.pro/your-token/',
      priority: 2,
      weight: 8,
      supportsZkCompression: false
    }
  ]
};
```

---

## Supported Providers

### Helius ⭐ (Recommended)

**Best For**: ZK Compression operations, high reliability

**Setup**:
```bash
HELIUS_API_KEY=your-helius-api-key
```

**Features**:
- ✅ ZK Compression support
- ✅ High uptime
- ✅ Excellent performance
- ✅ Generous rate limits

**Get API Key**: [https://www.helius.dev/](https://www.helius.dev/)

### QuickNode

**Best For**: Enterprise applications, guaranteed uptime

**Setup**:
```bash
QUICKNODE_ENDPOINT=https://your-endpoint.quiknode.pro/your-token/
QUICKNODE_API_KEY=your-api-key  # Optional
```

**Features**:
- ✅ 99.9% uptime SLA
- ✅ Global infrastructure
- ✅ Dedicated resources
- ⚠️ No ZK Compression support (yet)

**Get Endpoint**: [https://www.quicknode.com/](https://www.quicknode.com/)

### Alchemy

**Best For**: Developer-friendly features, analytics

**Setup**:
```bash
ALCHEMY_API_KEY=your-alchemy-api-key
```

**Features**:
- ✅ Enhanced APIs
- ✅ Built-in analytics
- ✅ WebSocket support
- ⚠️ No ZK Compression support

**Get API Key**: [https://www.alchemy.com/](https://www.alchemy.com/)

### Triton (RPC Pool)

**Best For**: Stake-weighted RPC, Solana validators

**Setup**:
```bash
TRITON_ENDPOINT=https://your-endpoint.rpcpool.com
TRITON_API_KEY=your-api-key  # Optional
```

**Features**:
- ✅ Stake-weighted RPC
- ✅ Direct validator access
- ✅ High performance
- ⚠️ No ZK Compression support

**Get Endpoint**: [https://triton.one/](https://triton.one/)

### Custom RPC

**Best For**: Self-hosted or other providers

**Setup**:
```bash
CUSTOM_RPC_URL=https://your-rpc.com
CUSTOM_RPC_API_KEY=your-api-key  # If needed
CUSTOM_RPC_SUPPORTS_ZK=false  # Set to true if supported
```

---

## Advanced Usage

### Using RPC Manager Directly

For advanced scenarios, you can use the `RpcManager` directly:

```typescript
import { loadRpcConfig, createRpcManager } from '@your-org/ghostsol-sdk';

// Load configuration
const rpcConfig = loadRpcConfig('devnet');

// Create RPC manager
const rpcManager = createRpcManager(rpcConfig);

// Get connection
const connection = await rpcManager.getConnection();

// Get ZK RPC
const zkRpc = await rpcManager.getZkRpc();

// Execute with automatic retry
const result = await rpcManager.executeWithRetry(
  async (connection) => {
    return await connection.getBalance(publicKey);
  },
  'getBalance'
);

// Clean up when done
rpcManager.stop();
```

### Priority and Weight Configuration

**Priority** determines the order in which endpoints are tried:
- Lower number = higher priority
- RPC Manager tries endpoints in priority order

**Weight** affects load balancing:
- Higher weight = more requests
- Useful for distributing load across providers

Example:
```typescript
const endpoints = [
  {
    provider: 'helius',
    priority: 1,  // Try first
    weight: 10,   // Gets 10/(10+5) = 67% of requests
    // ...
  },
  {
    provider: 'quicknode',
    priority: 2,  // Try second
    weight: 5,    // Gets 5/(10+5) = 33% of requests
    // ...
  }
];
```

### Rate Limiting

Configure per-endpoint rate limits:

```typescript
const endpoint: RpcEndpointConfig = {
  provider: 'helius',
  url: 'https://...',
  maxRps: 10,  // Maximum 10 requests per second
  // ...
};
```

The SDK automatically throttles requests to respect rate limits.

---

## Monitoring & Metrics

### Getting Metrics

Access real-time metrics through the SDK:

```typescript
import { init, getSdkInstance } from '@your-org/ghostsol-sdk';

await init({ /* ... */ });

const sdk = getSdkInstance();

// Get RPC metrics
const metrics = sdk.getRpcMetrics();
console.log(metrics);
// {
//   endpoints: [
//     {
//       provider: 'helius',
//       url: 'https://...',
//       health: {
//         status: 'healthy',
//         averageLatency: 250,
//         requestCount: 1000,
//         errorCount: 5,
//         consecutiveFailures: 0,
//         ...
//       }
//     }
//   ],
//   totalRequests: 1000,
//   totalErrors: 5,
//   averageLatency: 275
// }
```

### Getting Health Status

Check endpoint health:

```typescript
const health = sdk.getRpcHealth();
for (const [url, info] of health.entries()) {
  console.log(`${url}: ${info.status}`);
  console.log(`  Latency: ${info.averageLatency}ms`);
  console.log(`  Success Rate: ${
    ((info.requestCount - info.errorCount) / info.requestCount * 100).toFixed(2)
  }%`);
}
```

### Health Status Values

- **`healthy`** - Endpoint is working normally
- **`degraded`** - Endpoint is slow or experiencing issues
- **`unhealthy`** - Endpoint has failed multiple times (automatic failover active)
- **`unknown`** - Endpoint status not yet determined

### Logging RPC Configuration

Log configuration safely (API keys are masked):

```typescript
import { loadRpcConfig, getRpcConfigForLogging } from '@your-org/ghostsol-sdk';

const rpcConfig = loadRpcConfig('devnet');
const safeConfig = getRpcConfigForLogging(rpcConfig);
console.log(safeConfig);
// API keys are automatically masked: "api-key=***"
```

---

## Best Practices

### 1. Use Multiple Providers

Configure at least 2 RPC providers for redundancy:

```bash
# Primary: Helius (supports ZK Compression)
HELIUS_API_KEY=your-helius-key
RPC_PRIORITY_HELIUS=1

# Backup: QuickNode (high reliability)
QUICKNODE_ENDPOINT=https://your-endpoint.quiknode.pro/
RPC_PRIORITY_QUICKNODE=2
```

### 2. Enable Health Checking

Keep health checking enabled in production:

```bash
RPC_ENABLE_HEALTH_CHECK=true
```

This allows the SDK to detect and route around failing endpoints.

### 3. Set Appropriate Timeouts

Configure timeouts based on your needs:

```typescript
const rpcConfig = loadRpcConfig('devnet', {
  timeout: 30000,      // 30 seconds for requests
  maxRetries: 3,       // Retry up to 3 times
  retryDelay: 1000,    // 1 second between retries
});
```

### 4. Monitor Metrics

Regularly check RPC metrics in production:

```typescript
// Log metrics every 5 minutes
setInterval(() => {
  const metrics = sdk.getRpcMetrics();
  console.log('[RPC Metrics]', metrics);
}, 5 * 60 * 1000);
```

### 5. Use Environment-Specific Configuration

Different configs for different environments:

```bash
# Development
SOLANA_CLUSTER=devnet
HELIUS_API_KEY=dev-key

# Production
SOLANA_CLUSTER=mainnet-beta
HELIUS_API_KEY=prod-key
QUICKNODE_ENDPOINT=https://prod-endpoint.quiknode.pro/
```

### 6. Cleanup Resources

Always cleanup when shutting down:

```typescript
const sdk = getSdkInstance();

// When shutting down
sdk.dispose();
```

---

## Troubleshooting

### Issue: "No RPC endpoints configured"

**Cause**: No RPC configuration found in environment variables or config.

**Solution**:
```bash
# Set at least one RPC configuration
HELIUS_API_KEY=your-api-key
# OR
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Issue: "All endpoints unhealthy"

**Cause**: All configured RPC endpoints are failing health checks.

**Solutions**:
1. Check your internet connection
2. Verify API keys are correct
3. Check RPC provider status pages
4. Temporarily disable health checking:
   ```bash
   RPC_ENABLE_HEALTH_CHECK=false
   ```

### Issue: "RPC request failed after N attempts"

**Cause**: Request failed on all endpoints after retries.

**Solutions**:
1. Check if the request is valid
2. Increase timeout: `timeout: 60000`
3. Increase retries: `maxRetries: 5`
4. Add more RPC providers for redundancy

### Issue: "No ZK Compression-compatible RPC endpoints"

**Cause**: No configured endpoint supports ZK Compression.

**Solution**:
```bash
# Configure Helius (supports ZK Compression)
HELIUS_API_KEY=your-helius-key
```

Or mark your custom endpoint as ZK-compatible:
```bash
CUSTOM_RPC_SUPPORTS_ZK=true
```

### Issue: Rate limiting errors

**Cause**: Exceeding RPC provider rate limits.

**Solutions**:
1. Enable SDK rate limiting:
   ```bash
   RPC_ENABLE_RATE_LIMITING=true
   ```
2. Configure per-endpoint limits:
   ```typescript
   {
     provider: 'helius',
     maxRps: 10,  // 10 requests/second
     // ...
   }
   ```
3. Upgrade your RPC plan
4. Add more providers for load distribution

---

## Security

### Never Commit API Keys

```bash
# ❌ WRONG - Hardcoded in code
const rpcUrl = 'https://rpc.com/?api-key=abc123';

# ✅ CORRECT - Use environment variables
HELIUS_API_KEY=abc123
```

### Use Server-Side Variables in Next.js

```bash
# ❌ WRONG - Exposed to browser
NEXT_PUBLIC_HELIUS_API_KEY=abc123

# ✅ CORRECT - Server-side only
HELIUS_API_KEY=abc123
```

### Rotate API Keys Regularly

1. Generate new API key from provider
2. Update environment variable
3. Restart application
4. Revoke old key

### Monitor for Leaked Credentials

- Use tools like `git-secrets` or `truffleHog`
- Enable GitHub secret scanning
- Regular security audits

### Use HTTPS in Production

The SDK enforces HTTPS in production environments:

```typescript
// Automatically validated in production
const rpcConfig = loadRpcConfig('mainnet-beta');
// Will throw error if any endpoint uses HTTP
```

---

## Migration from Hardcoded Keys

If you're upgrading from an older version with hardcoded API keys:

### Step 1: Add Environment Variables

```bash
# .env
HELIUS_API_KEY=your-actual-helius-key
SOLANA_CLUSTER=devnet
```

### Step 2: Update Code

```typescript
// Old way (with hardcoded key)
await init({
  wallet: keypair,
  rpcUrl: 'https://devnet.helius-rpc.com/?api-key=HARDCODED_KEY'
});

// New way (environment-based)
await init({
  wallet: keypair,
  cluster: 'devnet'
  // RPC config loaded automatically from environment
});
```

### Step 3: Remove Hardcoded Keys

Search your codebase for hardcoded keys:
```bash
# Find potential hardcoded keys
grep -r "api-key=" .
grep -r "helius-rpc.com" .
```

### Step 4: Deploy

Deploy with new environment variables set in your hosting platform.

---

## Examples

### Example 1: Simple Setup with Helius

```typescript
import { init } from '@your-org/ghostsol-sdk';
import { Keypair } from '@solana/web3.js';

// Environment: HELIUS_API_KEY=your-key

const keypair = Keypair.generate();

await init({
  wallet: keypair,
  cluster: 'devnet'
});

// SDK automatically uses Helius RPC
```

### Example 2: Multi-Provider with Fallback

```bash
# .env
HELIUS_API_KEY=primary-key
RPC_PRIORITY_HELIUS=1

QUICKNODE_ENDPOINT=https://backup-endpoint.quiknode.pro/
RPC_PRIORITY_QUICKNODE=2
```

```typescript
await init({
  wallet: keypair,
  cluster: 'devnet'
});

// Automatically uses Helius as primary
// Falls back to QuickNode if Helius fails
```

### Example 3: Custom Configuration

```typescript
import { createRpcManager, loadRpcConfig } from '@your-org/ghostsol-sdk';

const rpcConfig = loadRpcConfig('devnet', {
  commitment: 'finalized',
  timeout: 60000,
  maxRetries: 5,
  enableHealthCheck: true,
  enableRateLimiting: true,
  enableMetrics: true
});

const rpcManager = createRpcManager(rpcConfig);

// Use custom RPC manager
const connection = await rpcManager.getConnection();
```

### Example 4: Monitoring Dashboard

```typescript
import { init, getSdkInstance } from '@your-org/ghostsol-sdk';

await init({ /* ... */ });

const sdk = getSdkInstance();

// Real-time monitoring
setInterval(() => {
  const metrics = sdk.getRpcMetrics();
  const health = sdk.getRpcHealth();
  
  console.log('=== RPC Status ===');
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Total Errors: ${metrics.totalErrors}`);
  console.log(`Average Latency: ${metrics.averageLatency.toFixed(0)}ms`);
  console.log(`Success Rate: ${
    ((metrics.totalRequests - metrics.totalErrors) / metrics.totalRequests * 100).toFixed(2)
  }%`);
  
  console.log('\n=== Endpoint Health ===');
  for (const [url, info] of health.entries()) {
    console.log(`${url}:`);
    console.log(`  Status: ${info.status}`);
    console.log(`  Latency: ${info.averageLatency.toFixed(0)}ms`);
    console.log(`  Requests: ${info.requestCount}`);
    console.log(`  Errors: ${info.errorCount}`);
  }
}, 60000); // Every minute
```

---

## API Reference

### `loadRpcConfig(cluster, overrides?)`

Load RPC configuration from environment variables.

**Parameters**:
- `cluster`: `'devnet' | 'mainnet-beta'`
- `overrides`: Partial configuration to override defaults

**Returns**: `RpcConfig`

### `createRpcConfigFromUrl(url, cluster, options?)`

Create simple RPC configuration from a single URL.

**Parameters**:
- `url`: RPC endpoint URL
- `cluster`: `'devnet' | 'mainnet-beta'`
- `options`: Optional configuration overrides

**Returns**: `RpcConfig`

### `createRpcManager(config)`

Create RPC manager instance.

**Parameters**:
- `config`: `RpcConfig`

**Returns**: `RpcManager`

### `RpcManager.getConnection()`

Get a healthy connection with automatic failover.

**Returns**: `Promise<Connection>`

### `RpcManager.getZkRpc()`

Get ZK Compression RPC with automatic failover.

**Returns**: `Promise<Rpc>`

### `RpcManager.executeWithRetry(operation, operationType?)`

Execute operation with automatic retry and failover.

**Parameters**:
- `operation`: `(connection: Connection) => Promise<T>`
- `operationType`: Optional label for logging

**Returns**: `Promise<T>`

### `RpcManager.getMetrics()`

Get RPC metrics for monitoring.

**Returns**: Metrics object with request counts, errors, and latency

### `RpcManager.getHealthStatus()`

Get health status for all endpoints.

**Returns**: `Map<string, EndpointHealthInfo>`

### `RpcManager.stop()`

Stop health checking and cleanup resources.

---

## Support

For issues or questions:
- **GitHub Issues**: [Create an issue](https://github.com/your-org/ghostsol-sdk/issues)
- **Documentation**: [Full docs](https://docs.ghostsol.dev)
- **Discord**: [Join our community](https://discord.gg/ghostsol)

---

## Changelog

### v1.0.0 (2025-10-31)
- ✅ Initial production release
- ✅ Multi-provider support (Helius, QuickNode, Alchemy, Triton)
- ✅ Automatic failover and health checking
- ✅ Rate limiting and retry logic
- ✅ Performance metrics and monitoring
- ✅ Zero hardcoded API keys
- ✅ Comprehensive documentation

---

**Last Updated**: 2025-10-31  
**Version**: 1.0.0
