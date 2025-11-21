/**
 * rpc-config.ts
 * 
 * Purpose: Configuration definitions for RPC management
 */

export interface RpcEndpointConfig {
    url: string;
    provider: string;
    weight: number;
    maxRps?: number;
    headers?: Record<string, string>;
    supportsZkCompression?: boolean;
}

export interface RpcConfig {
    endpoints: RpcEndpointConfig[];
    enableRateLimiting: boolean;
    enableHealthCheck: boolean;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    healthCheckInterval: number;
}

/**
 * Get endpoints that support ZK Compression
 */
export function getZkCompressionEndpoints(config: RpcConfig): RpcEndpointConfig[] {
    return config.endpoints.filter(e => e.supportsZkCompression);
}

/**
 * Default configuration for Devnet
 */
export const DEFAULT_RPC_CONFIG_DEVNET: RpcConfig = {
    endpoints: [
        {
            url: 'https://api.devnet.solana.com',
            provider: 'Solana Foundation',
            weight: 1,
            maxRps: 10,
            supportsZkCompression: false
        },
        // Add Helius or other providers here if needed
    ],
    enableRateLimiting: true,
    enableHealthCheck: true,
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    healthCheckInterval: 60000
};
