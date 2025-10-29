/**
 * rpc.ts
 * 
 * Purpose: Initialize and manage ZK Compression RPC connection with failover support
 * 
 * Dependencies:
 * - @lightprotocol/stateless.js for RPC creation
 * - @solana/web3.js for Connection and commitment levels
 * 
 * Exports:
 * - createCompressedRpc() - Creates ZK Compression RPC instance
 * - RpcConnectionManager - Manages multiple RPC providers with health checks and failover
 */

import { Connection, Commitment } from '@solana/web3.js';
import { createRpc, Rpc } from '@lightprotocol/stateless.js';
import { GhostSolConfig, NETWORKS, LIGHT_PROTOCOL_RPC_ENDPOINTS } from './types';

/**
 * RPC Provider configuration
 */
interface RpcProvider {
  name: string;
  url: string;
  connection: Connection;
  rpc: Rpc;
  healthy: boolean;
  lastHealthCheck: number;
  failureCount: number;
}

/**
 * Metrics for monitoring RPC performance
 */
interface RpcMetrics {
  latency: number[];
  failovers: number;
  errors: Record<string, number>;
  healthChecks: number;
  lastMetricTime: number;
}

/**
 * RPC Connection Manager with health checks and automatic failover
 * 
 * This class manages multiple RPC providers and automatically fails over
 * to healthy providers when issues are detected.
 */
export class RpcConnectionManager {
  private providers: RpcProvider[] = [];
  private currentProviderIndex: number = 0;
  private healthCheckInterval: NodeJS.Timer | null = null;
  private metrics: RpcMetrics = {
    latency: [],
    failovers: 0,
    errors: {},
    healthChecks: 0,
    lastMetricTime: Date.now()
  };
  
  // Configuration
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly HEALTH_TIMEOUT = 2000; // 2 seconds
  private readonly MAX_LATENCY = 2000; // 2 seconds
  private readonly MAX_FAILURE_COUNT = 3;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(
    private config: GhostSolConfig,
    private enableBackgroundHealthChecks: boolean = true
  ) {
    this.initializeProviders();
    
    if (this.enableBackgroundHealthChecks) {
      this.startHealthCheckInterval();
    }
  }

  /**
   * Initialize RPC providers
   */
  private initializeProviders(): void {
    const cluster = this.config.cluster || 'devnet';
    const networkConfig = NETWORKS[cluster];
    
    if (!networkConfig) {
      throw new Error(`Unsupported cluster: ${cluster}`);
    }

    // Primary provider: Helius (Light Protocol)
    const primaryUrl = LIGHT_PROTOCOL_RPC_ENDPOINTS[cluster];
    if (primaryUrl) {
      this.addProvider('Helius (Primary)', primaryUrl);
    }

    // Secondary provider: Custom RPC if provided
    if (this.config.rpcUrl && this.config.rpcUrl !== primaryUrl) {
      this.addProvider('Custom RPC', this.config.rpcUrl);
    }

    // Tertiary provider: Network default as fallback
    if (networkConfig.rpcUrl !== primaryUrl && networkConfig.rpcUrl !== this.config.rpcUrl) {
      this.addProvider('Network Default', networkConfig.rpcUrl);
    }

    if (this.providers.length === 0) {
      throw new Error('No RPC providers configured');
    }

    console.log(`Initialized ${this.providers.length} RPC provider(s)`);
  }

  /**
   * Add an RPC provider to the pool
   */
  private addProvider(name: string, url: string): void {
    try {
      const commitment = this.config.commitment || 'confirmed';
      const connection = new Connection(url, {
        commitment,
        confirmTransactionInitialTimeout: 60000,
      });

      const rpc = createRpc(connection);

      this.providers.push({
        name,
        url,
        connection,
        rpc,
        healthy: true,
        lastHealthCheck: Date.now(),
        failureCount: 0
      });

      console.log(`Added RPC provider: ${name} (${url})`);
    } catch (error) {
      console.error(`Failed to add provider ${name}:`, error);
    }
  }

  /**
   * Get current active connection with health check
   */
  async getConnection(): Promise<Connection> {
    // Check current provider health before use
    const currentProvider = this.providers[this.currentProviderIndex];
    
    if (!currentProvider.healthy || await this.isUnhealthy(this.currentProviderIndex)) {
      await this.failoverToNext();
    }

    return this.providers[this.currentProviderIndex].connection;
  }

  /**
   * Get current active RPC instance with health check
   */
  async getRpc(): Promise<Rpc> {
    // Check current provider health before use
    const currentProvider = this.providers[this.currentProviderIndex];
    
    if (!currentProvider.healthy || await this.isUnhealthy(this.currentProviderIndex)) {
      await this.failoverToNext();
    }

    return this.providers[this.currentProviderIndex].rpc;
  }

  /**
   * Get current provider name
   */
  getCurrentProviderName(): string {
    return this.providers[this.currentProviderIndex]?.name || 'Unknown';
  }

  /**
   * Execute operation with automatic retry and failover
   */
  async executeWithRetry<T>(
    operation: (connection: Connection, rpc: Rpc) => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.RETRY_ATTEMPTS; attempt++) {
      try {
        const startTime = Date.now();
        const connection = await this.getConnection();
        const rpc = await this.getRpc();
        
        const result = await operation(connection, rpc);
        
        // Record successful operation metrics
        const latency = Date.now() - startTime;
        this.recordMetric('latency', latency);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        const currentProvider = this.providers[this.currentProviderIndex];
        
        console.warn(
          `${operationName} failed on ${currentProvider.name} (attempt ${attempt + 1}/${this.RETRY_ATTEMPTS}):`,
          error
        );
        
        this.recordError(operationName, error as Error);
        currentProvider.failureCount++;
        
        // If this provider has failed too many times, mark as unhealthy and failover
        if (currentProvider.failureCount >= this.MAX_FAILURE_COUNT) {
          currentProvider.healthy = false;
          await this.failoverToNext();
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.RETRY_ATTEMPTS - 1) {
          await this.sleep(this.RETRY_DELAY * Math.pow(2, attempt));
        }
      }
    }
    
    throw new Error(
      `${operationName} failed after ${this.RETRY_ATTEMPTS} attempts: ${lastError?.message}`
    );
  }

  /**
   * Check if a provider is unhealthy
   */
  private async isUnhealthy(providerIndex: number): Promise<boolean> {
    try {
      const provider = this.providers[providerIndex];
      const start = Date.now();
      
      // Perform health check with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), this.HEALTH_TIMEOUT)
      );
      
      const healthCheckPromise = provider.connection.getVersion();
      
      await Promise.race([healthCheckPromise, timeoutPromise]);
      
      const latency = Date.now() - start;
      
      // Update health status
      provider.lastHealthCheck = Date.now();
      provider.failureCount = Math.max(0, provider.failureCount - 1); // Decay failure count on success
      
      // Track metrics
      this.recordMetric('rpc_latency', latency);
      this.metrics.healthChecks++;
      
      // Consider unhealthy if latency is too high
      if (latency > this.MAX_LATENCY) {
        console.warn(`Provider ${provider.name} latency high: ${latency}ms`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.recordError('health_check_failed', error as Error);
      return true;
    }
  }

  /**
   * Failover to the next available provider
   */
  private async failoverToNext(): Promise<void> {
    const oldProvider = this.providers[this.currentProviderIndex];
    console.warn(`Failing over from ${oldProvider.name}`);
    
    // Try to find a healthy provider
    let attempts = 0;
    const maxAttempts = this.providers.length;
    
    while (attempts < maxAttempts) {
      this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
      const newProvider = this.providers[this.currentProviderIndex];
      
      // Check if new provider is healthy
      if (newProvider.healthy && !await this.isUnhealthy(this.currentProviderIndex)) {
        console.log(`Failed over to ${newProvider.name}`);
        this.recordMetric('rpc_failover', 1);
        this.metrics.failovers++;
        return;
      }
      
      attempts++;
    }
    
    // If all providers are unhealthy, use the current one anyway and hope for the best
    console.error('All RPC providers appear unhealthy, using current provider anyway');
    this.providers[this.currentProviderIndex].healthy = true; // Reset health status
  }

  /**
   * Start background health check interval
   */
  private startHealthCheckInterval(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    console.log('Performing background health checks...');
    
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const isUnhealthy = await this.isUnhealthy(i);
      
      if (isUnhealthy && provider.healthy) {
        console.warn(`Provider ${provider.name} marked as unhealthy`);
        provider.healthy = false;
      } else if (!isUnhealthy && !provider.healthy) {
        console.log(`Provider ${provider.name} recovered, marked as healthy`);
        provider.healthy = true;
        provider.failureCount = 0;
      }
    }
  }

  /**
   * Record a metric value
   */
  private recordMetric(metricName: string, value: number): void {
    if (metricName === 'latency' || metricName === 'rpc_latency') {
      this.metrics.latency.push(value);
      // Keep only last 100 latency measurements
      if (this.metrics.latency.length > 100) {
        this.metrics.latency.shift();
      }
    } else if (metricName === 'rpc_failover') {
      this.metrics.failovers += value;
    }
    
    this.metrics.lastMetricTime = Date.now();
    
    // Log metrics to console (can be replaced with actual monitoring integration)
    if (process.env.DEBUG) {
      console.log(`[METRIC] ${metricName}: ${value}`);
    }
  }

  /**
   * Record an error
   */
  private recordError(operation: string, error: Error): void {
    const errorKey = `${operation}_error`;
    this.metrics.errors[errorKey] = (this.metrics.errors[errorKey] || 0) + 1;
    
    if (process.env.DEBUG) {
      console.error(`[ERROR] ${operation}:`, error.message);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): RpcMetrics & {
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    currentProvider: string;
    providerHealth: Array<{ name: string; healthy: boolean; failureCount: number }>;
  } {
    const sortedLatency = [...this.metrics.latency].sort((a, b) => a - b);
    const avgLatency = sortedLatency.length > 0
      ? sortedLatency.reduce((a, b) => a + b, 0) / sortedLatency.length
      : 0;
    const p95Index = Math.floor(sortedLatency.length * 0.95);
    const p99Index = Math.floor(sortedLatency.length * 0.99);
    
    return {
      ...this.metrics,
      avgLatency: Math.round(avgLatency),
      p95Latency: sortedLatency[p95Index] || 0,
      p99Latency: sortedLatency[p99Index] || 0,
      currentProvider: this.getCurrentProviderName(),
      providerHealth: this.providers.map(p => ({
        name: p.name,
        healthy: p.healthy,
        failureCount: p.failureCount
      }))
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log('RPC Connection Manager destroyed');
  }
}

/**
 * Create a ZK Compression RPC instance with proper configuration
 * 
 * This function initializes the RPC connection to ZK Compression services
 * with appropriate commitment levels and endpoint configuration.
 * 
 * @param config - Configuration options including RPC URL and cluster
 * @returns Configured RPC instance for ZK Compression operations
 * @throws Error if RPC configuration is invalid
 */
export function createCompressedRpc(config: GhostSolConfig) {
  // Determine the network configuration
  const cluster = config.cluster || 'devnet';
  const networkConfig = NETWORKS[cluster];
  
  if (!networkConfig) {
    throw new Error(`Unsupported cluster: ${cluster}. Supported clusters: devnet, mainnet`);
  }

  // Use provided RPC URL or fall back to network default
  const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
  
  // Validate RPC URL format
  if (!rpcUrl.startsWith('http')) {
    throw new Error(`Invalid RPC URL: ${rpcUrl}. Must be a valid HTTP/HTTPS URL`);
  }

  // Create Solana connection for underlying blockchain operations
  const connection = new Connection(rpcUrl, {
    commitment: config.commitment || networkConfig.commitment,
    confirmTransactionInitialTimeout: 60000, // 60 seconds timeout
  });

  // Create ZK Compression RPC instance
  // The createRpc function from @lightprotocol/stateless.js handles:
  // - Connection to ZK Compression services
  // - Validity proof generation
  // - Compressed account state management
  // 
  // IMPORTANT: Use Helius RPC endpoints for ZK Compression operations
  // Helius provides reliable RPC services with ZK Compression support
  const lightProtocolRpcUrl = LIGHT_PROTOCOL_RPC_ENDPOINTS[cluster];
  if (!lightProtocolRpcUrl) {
    throw new Error(`Light Protocol RPC endpoint not available for cluster: ${cluster}`);
  }

  console.log(`Using Helius RPC endpoint for ${cluster}: ${lightProtocolRpcUrl}`);

  // Create Light Protocol RPC connection for ZK Compression operations
  const lightProtocolConnection = new Connection(lightProtocolRpcUrl, {
    commitment: config.commitment || networkConfig.commitment,
    confirmTransactionInitialTimeout: 60000,
  });

  // Test the Helius RPC connection
  try {
    // This will be tested when the connection is first used
    console.log(`Helius RPC endpoint configured for ${cluster}`);
  } catch (error) {
    console.warn(`Helius RPC endpoint ${lightProtocolRpcUrl} may not be available:`, error);
    console.warn('ZK Compression operations may fail if RPC is not accessible');
  }

  const rpc = createRpc(lightProtocolConnection);

  return {
    rpc,
    connection: lightProtocolConnection, // Use Helius connection for ZK operations
    cluster,
    rpcUrl: lightProtocolRpcUrl
  };
}

/**
 * Create RPC Connection Manager with failover support
 * 
 * @param config - SDK configuration
 * @param enableBackgroundHealthChecks - Enable automatic background health checks
 * @returns RPC Connection Manager instance
 */
export function createRpcConnectionManager(
  config: GhostSolConfig,
  enableBackgroundHealthChecks: boolean = true
): RpcConnectionManager {
  return new RpcConnectionManager(config, enableBackgroundHealthChecks);
}

/**
 * Validate RPC connection and test basic functionality
 * 
 * @param connection - Solana connection to test
 * @returns Promise that resolves if connection is valid
 * @throws Error if connection test fails
 */
export async function validateRpcConnection(connection: Connection): Promise<void> {
  try {
    // Test basic connection with a simple RPC call
    const version = await connection.getVersion();
    
    if (!version || !version['solana-core']) {
      throw new Error('Invalid response from RPC endpoint');
    }
    
    // Test commitment level by getting recent blockhash
    await connection.getRecentBlockhash();
    
  } catch (error) {
    throw new Error(
      `RPC connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the appropriate commitment level for different operations
 * 
 * @param operation - The operation type
 * @param configCommitment - Commitment from config
 * @returns Appropriate commitment level
 */
export function getCommitmentForOperation(
  operation: 'query' | 'transaction',
  configCommitment?: Commitment
): Commitment {
  // Use config commitment if provided
  if (configCommitment) {
    return configCommitment;
  }
  
  // Default commitments based on operation type
  switch (operation) {
    case 'query':
      return 'confirmed'; // Faster for balance queries
    case 'transaction':
      return 'confirmed'; // Balanced for transactions
    default:
      return 'confirmed';
  }
}
