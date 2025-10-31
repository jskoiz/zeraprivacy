/**
 * rpc-manager.ts
 * 
 * Purpose: Production-grade RPC endpoint management
 * 
 * This module provides:
 * - Automatic endpoint fallback on failure
 * - Health checking for endpoint availability
 * - Rate limiting per endpoint
 * - Request retry logic with exponential backoff
 * - Performance metrics and monitoring
 * - Load balancing across multiple endpoints
 * 
 * Features:
 * - Automatic failover to healthy endpoints
 * - Circuit breaker pattern for failing endpoints
 * - Connection pooling and reuse
 * - Request timeout handling
 */

import { Connection, Commitment } from '@solana/web3.js';
import { createRpc } from '@lightprotocol/stateless.js';
import { RpcConfig, RpcEndpointConfig, getZkCompressionEndpoints } from './rpc-config';
import { globalCacheManager, RPCCache } from './cache';

/**
 * Endpoint health status
 */
export enum EndpointHealth {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Endpoint health information
 */
export interface EndpointHealthInfo {
  status: EndpointHealth;
  lastCheck: number;
  lastSuccess: number;
  lastFailure: number;
  consecutiveFailures: number;
  averageLatency: number;
  requestCount: number;
  errorCount: number;
}

/**
 * Rate limiter for endpoint
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxRps: number) {
    this.maxTokens = maxRps;
    this.refillRate = maxRps;
    this.tokens = maxRps;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token for rate limiting
   * Returns true if request can proceed, false if rate limited
   */
  tryConsume(): boolean {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Wait until rate limit allows request
   */
  async waitForToken(): Promise<void> {
    while (!this.tryConsume()) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * RPC Manager for handling multiple endpoints with fallback and health checking
 */
export class RpcManager {
  private config: RpcConfig;
  private healthInfo: Map<string, EndpointHealthInfo>;
  private rateLimiters: Map<string, RateLimiter>;
  private connections: Map<string, Connection>;
  private zkRpcs: Map<string, any>;
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private currentEndpointIndex: number = 0;
  private rpcCache: RPCCache;

  constructor(config: RpcConfig) {
    this.config = config;
    this.healthInfo = new Map();
    this.rateLimiters = new Map();
    this.connections = new Map();
    this.zkRpcs = new Map();
    this.rpcCache = globalCacheManager.getRPCCache();

    // Initialize health info for all endpoints
    for (const endpoint of config.endpoints) {
      this.healthInfo.set(endpoint.url, {
        status: EndpointHealth.UNKNOWN,
        lastCheck: 0,
        lastSuccess: 0,
        lastFailure: 0,
        consecutiveFailures: 0,
        averageLatency: 0,
        requestCount: 0,
        errorCount: 0,
      });

      // Initialize rate limiter if endpoint has maxRps
      if (config.enableRateLimiting && endpoint.maxRps && endpoint.maxRps > 0) {
        this.rateLimiters.set(endpoint.url, new RateLimiter(endpoint.maxRps));
      }
    }

    // Start health checking if enabled
    if (config.enableHealthCheck) {
      this.startHealthChecking();
    }
  }

  /**
   * Get a healthy connection with automatic fallback
   */
  async getConnection(): Promise<Connection> {
    const endpoint = await this.selectEndpoint();
    return this.getOrCreateConnection(endpoint);
  }

  /**
   * Get ZK Compression RPC with automatic fallback
   */
  async getZkRpc(): Promise<any> {
    const zkEndpoints = getZkCompressionEndpoints(this.config);
    
    if (zkEndpoints.length === 0) {
      throw new Error(
        'No ZK Compression-compatible RPC endpoints configured. ' +
        'Please configure a Helius RPC endpoint with HELIUS_API_KEY or set CUSTOM_RPC_SUPPORTS_ZK=true'
      );
    }

    // Try to find a healthy ZK endpoint
    for (const endpoint of zkEndpoints) {
      const health = this.healthInfo.get(endpoint.url);
      if (health && health.status !== EndpointHealth.UNHEALTHY) {
        return this.getOrCreateZkRpc(endpoint);
      }
    }

    // If no healthy endpoint, use the first one and let it fail/recover
    return this.getOrCreateZkRpc(zkEndpoints[0]);
  }

  /**
   * Execute a request with automatic retry and fallback
   */
  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    operationType: string = 'request'
  ): Promise<T> {
    let lastError: Error | undefined;
    const maxAttempts = this.config.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const endpoint = await this.selectEndpoint();
        const connection = this.getOrCreateConnection(endpoint);

        // Apply rate limiting if enabled
        if (this.config.enableRateLimiting) {
          const rateLimiter = this.rateLimiters.get(endpoint.url);
          if (rateLimiter) {
            await rateLimiter.waitForToken();
          }
        }

        const startTime = Date.now();
        const result = await this.executeWithTimeout(operation(connection));
        const latency = Date.now() - startTime;

        // Update health metrics on success
        this.recordSuccess(endpoint.url, latency);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Get current endpoint for error recording
        const currentEndpoint = this.config.endpoints[this.currentEndpointIndex];
        if (currentEndpoint) {
          this.recordFailure(currentEndpoint.url, lastError);
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `RPC ${operationType} failed after ${maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: Promise<T>): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    return Promise.race([operation, timeoutPromise]);
  }

  /**
   * Select the best available endpoint based on health and priority
   */
  private async selectEndpoint(): Promise<RpcEndpointConfig> {
    const healthyEndpoints = this.config.endpoints.filter((endpoint) => {
      const health = this.healthInfo.get(endpoint.url);
      return !health || health.status !== EndpointHealth.UNHEALTHY;
    });

    if (healthyEndpoints.length === 0) {
      // All endpoints unhealthy, reset and try again
      console.warn('[RpcManager] All endpoints unhealthy, resetting health status');
      for (const [url, health] of this.healthInfo.entries()) {
        health.status = EndpointHealth.UNKNOWN;
        health.consecutiveFailures = 0;
      }
      return this.config.endpoints[0];
    }

    // Use round-robin with priority and weight
    // Endpoints are already sorted by priority in config
    // Weight affects how many times an endpoint appears in rotation
    const weightedEndpoints: RpcEndpointConfig[] = [];
    for (const endpoint of healthyEndpoints) {
      for (let i = 0; i < endpoint.weight; i++) {
        weightedEndpoints.push(endpoint);
      }
    }

    const selected = weightedEndpoints[this.currentEndpointIndex % weightedEndpoints.length];
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % weightedEndpoints.length;

    return selected;
  }

  /**
   * Get or create connection for endpoint
   */
  private getOrCreateConnection(endpoint: RpcEndpointConfig): Connection {
    let connection = this.connections.get(endpoint.url);
    
    if (!connection) {
      connection = new Connection(endpoint.url, {
        commitment: this.config.commitment,
        confirmTransactionInitialTimeout: this.config.timeout,
        ...(endpoint.headers && { httpHeaders: endpoint.headers }),
      });
      this.connections.set(endpoint.url, connection);
    }

    return connection;
  }

  /**
   * Get or create ZK RPC for endpoint
   */
  private getOrCreateZkRpc(endpoint: RpcEndpointConfig): any {
    let zkRpc = this.zkRpcs.get(endpoint.url);
    
    if (!zkRpc) {
      const connection = this.getOrCreateConnection(endpoint);
      zkRpc = createRpc(connection);
      this.zkRpcs.set(endpoint.url, zkRpc);
    }

    return zkRpc;
  }

  /**
   * Record successful request for metrics
   */
  private recordSuccess(url: string, latency: number): void {
    const health = this.healthInfo.get(url);
    if (!health) return;

    health.lastSuccess = Date.now();
    health.consecutiveFailures = 0;
    health.requestCount++;
    
    // Update average latency with exponential moving average
    if (health.averageLatency === 0) {
      health.averageLatency = latency;
    } else {
      health.averageLatency = health.averageLatency * 0.9 + latency * 0.1;
    }

    // Update health status based on latency
    if (latency < 1000) {
      health.status = EndpointHealth.HEALTHY;
    } else if (latency < 5000) {
      health.status = EndpointHealth.DEGRADED;
    }
  }

  /**
   * Record failed request for metrics
   */
  private recordFailure(url: string, error: Error): void {
    const health = this.healthInfo.get(url);
    if (!health) return;

    health.lastFailure = Date.now();
    health.consecutiveFailures++;
    health.errorCount++;

    // Mark as unhealthy after 3 consecutive failures
    if (health.consecutiveFailures >= 3) {
      health.status = EndpointHealth.UNHEALTHY;
      console.warn(`[RpcManager] Endpoint ${url} marked as unhealthy after ${health.consecutiveFailures} failures`);
    } else {
      health.status = EndpointHealth.DEGRADED;
    }
  }

  /**
   * Start periodic health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Perform initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks on all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const checks = this.config.endpoints.map(async (endpoint) => {
      try {
        const connection = this.getOrCreateConnection(endpoint);
        const startTime = Date.now();
        
        // Simple health check: get slot
        await Promise.race([
          connection.getSlot(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000)),
        ]);
        
        const latency = Date.now() - startTime;
        
        const health = this.healthInfo.get(endpoint.url);
        if (health) {
          health.lastCheck = Date.now();
          
          // Recover from unhealthy state on successful check
          if (health.status === EndpointHealth.UNHEALTHY) {
            health.status = EndpointHealth.DEGRADED;
            health.consecutiveFailures = 0;
            console.log(`[RpcManager] Endpoint ${endpoint.url} recovered from unhealthy state`);
          }
          
          // Update latency
          if (health.averageLatency === 0) {
            health.averageLatency = latency;
          } else {
            health.averageLatency = health.averageLatency * 0.9 + latency * 0.1;
          }
        }
      } catch (error) {
        const health = this.healthInfo.get(endpoint.url);
        if (health) {
          health.lastCheck = Date.now();
          // Don't immediately mark as unhealthy on health check failure
          // Let actual request failures drive that
        }
      }
    });

    await Promise.allSettled(checks);
  }

  /**
   * Stop health checking
   */
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Get health status for all endpoints
   */
  getHealthStatus(): Map<string, EndpointHealthInfo> {
    return new Map(this.healthInfo);
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics(): {
    endpoints: Array<{
      provider: string;
      url: string;
      health: EndpointHealthInfo;
    }>;
    totalRequests: number;
    totalErrors: number;
    averageLatency: number;
  } {
    const endpoints = this.config.endpoints.map((endpoint) => ({
      provider: endpoint.provider,
      url: endpoint.url,
      health: this.healthInfo.get(endpoint.url)!,
    }));

    let totalRequests = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let healthyEndpoints = 0;

    for (const health of this.healthInfo.values()) {
      totalRequests += health.requestCount;
      totalErrors += health.errorCount;
      if (health.averageLatency > 0) {
        totalLatency += health.averageLatency;
        healthyEndpoints++;
      }
    }

    return {
      endpoints,
      totalRequests,
      totalErrors,
      averageLatency: healthyEndpoints > 0 ? totalLatency / healthyEndpoints : 0,
    };
  }

  /**
   * Force refresh of a specific endpoint (mark as unknown to retry)
   */
  refreshEndpoint(url: string): void {
    const health = this.healthInfo.get(url);
    if (health) {
      health.status = EndpointHealth.UNKNOWN;
      health.consecutiveFailures = 0;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RpcConfig {
    return { ...this.config };
  }
}

/**
 * Create RPC manager from configuration
 */
export function createRpcManager(config: RpcConfig): RpcManager {
  return new RpcManager(config);
}
