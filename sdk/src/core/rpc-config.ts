/**
 * rpc-config.ts
 * 
 * Purpose: Production-grade RPC configuration system
 * 
 * This module provides:
 * - Environment variable-based RPC configuration
 * - Support for multiple RPC providers
 * - RPC endpoint priority and weighting
 * - Secure API key management
 * - Configuration validation
 * 
 * Security Features:
 * - API keys are loaded from environment variables
 * - No hardcoded credentials
 * - Validation of endpoint URLs
 */

import { Commitment } from '@solana/web3.js';

/**
 * Supported RPC provider types
 */
export type RpcProvider = 'helius' | 'quicknode' | 'alchemy' | 'triton' | 'custom';

/**
 * RPC endpoint configuration
 */
export interface RpcEndpointConfig {
  /** Provider name for identification */
  provider: RpcProvider;
  /** Base URL for the RPC endpoint */
  url: string;
  /** API key (if required by provider) */
  apiKey?: string;
  /** Priority level (lower number = higher priority) */
  priority: number;
  /** Weight for load balancing (higher = more requests) */
  weight: number;
  /** Maximum requests per second (0 = unlimited) */
  maxRps?: number;
  /** Whether this endpoint supports ZK Compression */
  supportsZkCompression: boolean;
  /** Custom headers to include with requests */
  headers?: Record<string, string>;
}

/**
 * RPC configuration for the SDK
 */
export interface RpcConfig {
  /** Primary RPC endpoints */
  endpoints: RpcEndpointConfig[];
  /** Default commitment level */
  commitment: Commitment;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Number of retries per endpoint */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Enable health checking */
  enableHealthCheck: boolean;
  /** Health check interval in milliseconds */
  healthCheckInterval: number;
  /** Enable request rate limiting */
  enableRateLimiting: boolean;
  /** Enable endpoint metrics */
  enableMetrics: boolean;
  /** Cluster type */
  cluster: 'devnet' | 'mainnet-beta';
}

/**
 * Default RPC configuration
 */
export const DEFAULT_RPC_CONFIG: Partial<RpcConfig> = {
  commitment: 'confirmed',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  enableHealthCheck: true,
  healthCheckInterval: 60000, // 1 minute
  enableRateLimiting: true,
  enableMetrics: true,
};

/**
 * Build Helius RPC endpoint URL with API key
 */
function buildHeliusUrl(cluster: 'devnet' | 'mainnet-beta', apiKey: string): string {
  const network = cluster === 'mainnet-beta' ? 'mainnet' : 'devnet';
  return `https://${network}.helius-rpc.com/?api-key=${apiKey}`;
}

/**
 * Build QuickNode RPC endpoint URL
 */
function buildQuickNodeUrl(endpoint: string, apiKey?: string): string {
  if (apiKey) {
    return `${endpoint}/${apiKey}/`;
  }
  return endpoint;
}

/**
 * Build Alchemy RPC endpoint URL
 */
function buildAlchemyUrl(cluster: 'devnet' | 'mainnet-beta', apiKey: string): string {
  const network = cluster === 'mainnet-beta' ? 'mainnet' : 'devnet';
  return `https://solana-${network}.g.alchemy.com/v2/${apiKey}`;
}

/**
 * Build Triton RPC endpoint URL
 */
function buildTritonUrl(endpoint: string, apiKey?: string): string {
  if (apiKey) {
    return `${endpoint}/${apiKey}`;
  }
  return endpoint;
}

/**
 * Load RPC configuration from environment variables
 * 
 * Environment variables:
 * - HELIUS_API_KEY: Helius API key
 * - QUICKNODE_ENDPOINT: QuickNode endpoint URL
 * - QUICKNODE_API_KEY: QuickNode API key (optional)
 * - ALCHEMY_API_KEY: Alchemy API key
 * - TRITON_ENDPOINT: Triton endpoint URL
 * - TRITON_API_KEY: Triton API key (optional)
 * - CUSTOM_RPC_URL: Custom RPC endpoint URL
 * - CUSTOM_RPC_API_KEY: Custom RPC API key (optional)
 * - SOLANA_RPC_URL: Fallback generic RPC URL
 * - RPC_PRIORITY_HELIUS: Priority for Helius (default: 1)
 * - RPC_PRIORITY_QUICKNODE: Priority for QuickNode (default: 2)
 * - RPC_PRIORITY_ALCHEMY: Priority for Alchemy (default: 3)
 * - RPC_ENABLE_HEALTH_CHECK: Enable health checking (default: true)
 * - RPC_ENABLE_RATE_LIMITING: Enable rate limiting (default: true)
 */
export function loadRpcConfig(
  cluster: 'devnet' | 'mainnet-beta' = 'devnet',
  overrides: Partial<RpcConfig> = {}
): RpcConfig {
  const endpoints: RpcEndpointConfig[] = [];

  // Helper to get environment variable
  const getEnv = (key: string): string | undefined => {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  };

  // Helper to get numeric environment variable
  const getEnvNumber = (key: string, defaultValue: number): number => {
    const value = getEnv(key);
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return defaultValue;
  };

  // Helper to get boolean environment variable
  const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
    const value = getEnv(key);
    if (value) {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return defaultValue;
  };

  // Load Helius configuration
  const heliusApiKey = getEnv('HELIUS_API_KEY');
  if (heliusApiKey) {
    endpoints.push({
      provider: 'helius',
      url: buildHeliusUrl(cluster, heliusApiKey),
      apiKey: heliusApiKey,
      priority: getEnvNumber('RPC_PRIORITY_HELIUS', 1),
      weight: 10,
      supportsZkCompression: true,
    });
  }

  // Load QuickNode configuration
  const quickNodeEndpoint = getEnv('QUICKNODE_ENDPOINT');
  const quickNodeApiKey = getEnv('QUICKNODE_API_KEY');
  if (quickNodeEndpoint) {
    endpoints.push({
      provider: 'quicknode',
      url: buildQuickNodeUrl(quickNodeEndpoint, quickNodeApiKey),
      apiKey: quickNodeApiKey,
      priority: getEnvNumber('RPC_PRIORITY_QUICKNODE', 2),
      weight: 8,
      supportsZkCompression: false,
    });
  }

  // Load Alchemy configuration
  const alchemyApiKey = getEnv('ALCHEMY_API_KEY');
  if (alchemyApiKey) {
    endpoints.push({
      provider: 'alchemy',
      url: buildAlchemyUrl(cluster, alchemyApiKey),
      apiKey: alchemyApiKey,
      priority: getEnvNumber('RPC_PRIORITY_ALCHEMY', 3),
      weight: 8,
      supportsZkCompression: false,
    });
  }

  // Load Triton configuration
  const tritonEndpoint = getEnv('TRITON_ENDPOINT');
  const tritonApiKey = getEnv('TRITON_API_KEY');
  if (tritonEndpoint) {
    endpoints.push({
      provider: 'triton',
      url: buildTritonUrl(tritonEndpoint, tritonApiKey),
      apiKey: tritonApiKey,
      priority: getEnvNumber('RPC_PRIORITY_TRITON', 4),
      weight: 8,
      supportsZkCompression: false,
    });
  }

  // Load custom RPC configuration
  const customRpcUrl = getEnv('CUSTOM_RPC_URL');
  const customRpcApiKey = getEnv('CUSTOM_RPC_API_KEY');
  if (customRpcUrl) {
    let url = customRpcUrl;
    if (customRpcApiKey && !url.includes('api-key=')) {
      url = `${url}${url.includes('?') ? '&' : '?'}api-key=${customRpcApiKey}`;
    }
    endpoints.push({
      provider: 'custom',
      url,
      apiKey: customRpcApiKey,
      priority: getEnvNumber('RPC_PRIORITY_CUSTOM', 5),
      weight: 5,
      supportsZkCompression: getEnvBoolean('CUSTOM_RPC_SUPPORTS_ZK', false),
    });
  }

  // Fallback to generic SOLANA_RPC_URL or NEXT_PUBLIC_RPC_URL
  const fallbackRpcUrl = getEnv('SOLANA_RPC_URL') || getEnv('NEXT_PUBLIC_RPC_URL');
  if (endpoints.length === 0 && fallbackRpcUrl) {
    endpoints.push({
      provider: 'custom',
      url: fallbackRpcUrl,
      priority: 10,
      weight: 1,
      supportsZkCompression: false,
    });
  }

  // Default to public Solana RPC if no endpoints configured
  if (endpoints.length === 0) {
    const defaultUrl =
      cluster === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com';
    endpoints.push({
      provider: 'custom',
      url: defaultUrl,
      priority: 100,
      weight: 1,
      supportsZkCompression: false,
    });
  }

  // Sort endpoints by priority (lower number = higher priority)
  endpoints.sort((a, b) => a.priority - b.priority);

  // Build final configuration
  const config: RpcConfig = {
    endpoints,
    cluster,
    commitment: overrides.commitment || DEFAULT_RPC_CONFIG.commitment!,
    timeout: overrides.timeout || DEFAULT_RPC_CONFIG.timeout!,
    maxRetries: overrides.maxRetries || DEFAULT_RPC_CONFIG.maxRetries!,
    retryDelay: overrides.retryDelay || DEFAULT_RPC_CONFIG.retryDelay!,
    enableHealthCheck:
      overrides.enableHealthCheck !== undefined
        ? overrides.enableHealthCheck
        : getEnvBoolean('RPC_ENABLE_HEALTH_CHECK', DEFAULT_RPC_CONFIG.enableHealthCheck!),
    healthCheckInterval:
      overrides.healthCheckInterval || DEFAULT_RPC_CONFIG.healthCheckInterval!,
    enableRateLimiting:
      overrides.enableRateLimiting !== undefined
        ? overrides.enableRateLimiting
        : getEnvBoolean('RPC_ENABLE_RATE_LIMITING', DEFAULT_RPC_CONFIG.enableRateLimiting!),
    enableMetrics:
      overrides.enableMetrics !== undefined
        ? overrides.enableMetrics
        : getEnvBoolean('RPC_ENABLE_METRICS', DEFAULT_RPC_CONFIG.enableMetrics!),
  };

  // Validate configuration
  validateRpcConfig(config);

  return config;
}

/**
 * Validate RPC configuration
 */
export function validateRpcConfig(config: RpcConfig): void {
  if (!config.endpoints || config.endpoints.length === 0) {
    throw new Error(
      'No RPC endpoints configured. Set at least one of: HELIUS_API_KEY, QUICKNODE_ENDPOINT, ' +
        'ALCHEMY_API_KEY, TRITON_ENDPOINT, CUSTOM_RPC_URL, or SOLANA_RPC_URL'
    );
  }

  for (const endpoint of config.endpoints) {
    // Validate URL format
    try {
      const url = new URL(endpoint.url);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error(`Invalid protocol: ${url.protocol}`);
      }
    } catch (error) {
      throw new Error(
        `Invalid RPC endpoint URL for ${endpoint.provider}: ${endpoint.url}. ${
          error instanceof Error ? error.message : ''
        }`
      );
    }

    // Validate priority
    if (endpoint.priority < 0) {
      throw new Error(`Invalid priority for ${endpoint.provider}: ${endpoint.priority}`);
    }

    // Validate weight
    if (endpoint.weight <= 0) {
      throw new Error(`Invalid weight for ${endpoint.provider}: ${endpoint.weight}`);
    }
  }

  // Validate timeout
  if (config.timeout <= 0) {
    throw new Error(`Invalid timeout: ${config.timeout}`);
  }

  // Validate maxRetries
  if (config.maxRetries < 0) {
    throw new Error(`Invalid maxRetries: ${config.maxRetries}`);
  }

  // Validate retryDelay
  if (config.retryDelay < 0) {
    throw new Error(`Invalid retryDelay: ${config.retryDelay}`);
  }
}

/**
 * Get RPC configuration for logging (with masked API keys)
 */
export function getRpcConfigForLogging(config: RpcConfig): Record<string, unknown> {
  return {
    cluster: config.cluster,
    commitment: config.commitment,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
    enableHealthCheck: config.enableHealthCheck,
    enableRateLimiting: config.enableRateLimiting,
    enableMetrics: config.enableMetrics,
    endpoints: config.endpoints.map((endpoint) => ({
      provider: endpoint.provider,
      url: endpoint.url.replace(/api-key=[^&]+/, 'api-key=***'), // Mask API key in URL
      priority: endpoint.priority,
      weight: endpoint.weight,
      supportsZkCompression: endpoint.supportsZkCompression,
      hasApiKey: !!endpoint.apiKey,
    })),
  };
}

/**
 * Create RPC configuration from simple URL
 * 
 * This is a convenience method for creating a basic configuration
 * from a single RPC URL, useful for testing or simple setups.
 */
export function createRpcConfigFromUrl(
  url: string,
  cluster: 'devnet' | 'mainnet-beta' = 'devnet',
  options: Partial<RpcConfig> = {}
): RpcConfig {
  const endpoint: RpcEndpointConfig = {
    provider: 'custom',
    url,
    priority: 1,
    weight: 10,
    supportsZkCompression: false,
  };

  const config: RpcConfig = {
    endpoints: [endpoint],
    cluster,
    commitment: options.commitment || DEFAULT_RPC_CONFIG.commitment!,
    timeout: options.timeout || DEFAULT_RPC_CONFIG.timeout!,
    maxRetries: options.maxRetries || DEFAULT_RPC_CONFIG.maxRetries!,
    retryDelay: options.retryDelay || DEFAULT_RPC_CONFIG.retryDelay!,
    enableHealthCheck: options.enableHealthCheck !== undefined
      ? options.enableHealthCheck
      : DEFAULT_RPC_CONFIG.enableHealthCheck!,
    healthCheckInterval: options.healthCheckInterval || DEFAULT_RPC_CONFIG.healthCheckInterval!,
    enableRateLimiting: options.enableRateLimiting !== undefined
      ? options.enableRateLimiting
      : DEFAULT_RPC_CONFIG.enableRateLimiting!,
    enableMetrics: options.enableMetrics !== undefined
      ? options.enableMetrics
      : DEFAULT_RPC_CONFIG.enableMetrics!,
  };

  validateRpcConfig(config);
  return config;
}

/**
 * Get ZK Compression compatible endpoints from configuration
 */
export function getZkCompressionEndpoints(config: RpcConfig): RpcEndpointConfig[] {
  return config.endpoints.filter((endpoint) => endpoint.supportsZkCompression);
}

/**
 * Check if configuration has ZK Compression support
 */
export function hasZkCompressionSupport(config: RpcConfig): boolean {
  return getZkCompressionEndpoints(config).length > 0;
}
