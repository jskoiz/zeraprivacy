/**
 * env-config.ts
 * 
 * Purpose: Secure, centralized environment configuration management
 * 
 * This module provides:
 * - Type-safe access to environment variables
 * - Validation of required vs optional variables
 * - Security features (masking sensitive values, preventing exposure)
 * - Clear error messages for configuration issues
 * 
 * Security Features:
 * - Sensitive values (private keys, API keys) are never logged
 * - Client-side code cannot access server-only variables
 * - Validation prevents invalid configurations at startup
 */

/**
 * Environment detection
 */
export type Environment = 'development' | 'test' | 'staging' | 'production';

/**
 * Environment configuration interface
 */
export interface GhostSolEnvConfig {
  /** Solana network cluster */
  cluster: 'devnet' | 'mainnet-beta';
  /** Primary RPC endpoint URL */
  rpcUrl: string;
  /** Fallback RPC endpoint URL (optional) */
  rpcUrlFallback?: string;
  /** Helius API key (optional) */
  heliusApiKey?: string;
  /** Client-side RPC URL for Next.js (optional, public) */
  nextPublicRpcUrl?: string;
  /** Client-side cluster for Next.js (optional, public) */
  nextPublicCluster?: 'devnet' | 'mainnet-beta';
  /** Current environment */
  environment: Environment;
  /** Whether we're running in browser (client-side) */
  isBrowser: boolean;
}

/**
 * Sensitive configuration values that should never be logged
 */
const SENSITIVE_VARS = [
  'PRIVATE_KEY',
  'AUDITOR_KEY',
  'ENCRYPTION_KEY',
  'HELIUS_API_KEY',
  'SOLANA_PRIVATE_KEY',
] as const;

/**
 * Mask sensitive value for logging
 */
function maskSensitiveValue(value: string | undefined): string {
  if (!value || value.length === 0) return '[empty]';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate HTTPS URL (required in production)
 */
function isValidHttpsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Detect current environment
 */
function detectEnvironment(): Environment {
  if (typeof process === 'undefined' || !process.env) {
    return 'development';
  }
  
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';
  if (nodeEnv === 'staging') return 'staging';
  return 'development';
}

/**
 * Check if running in browser
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Get environment variable with optional validation
 */
function getEnvVar(
  name: string,
  options: {
    required?: boolean;
    defaultValue?: string;
    validate?: (value: string) => boolean;
    errorMessage?: string;
  } = {}
): string | undefined {
  const { required = false, defaultValue, validate, errorMessage } = options;
  
  let value: string | undefined;
  
  if (isBrowserEnvironment()) {
    // In browser, only access NEXT_PUBLIC_ variables
    if (name.startsWith('NEXT_PUBLIC_')) {
      // Try Next.js env first, then process.env fallback
      const windowEnv = typeof window !== 'undefined' ? (window as any).__NEXT_DATA__?.env : undefined;
      const processEnv = typeof process !== 'undefined' && process.env ? process.env : undefined;
      value = windowEnv?.[name] || processEnv?.[name];
    } else {
      // Server-only variables should not be accessible in browser
      if (required) {
        throw new Error(
          `Environment variable ${name} is server-only and cannot be accessed in browser. ` +
          `Use a public variable (NEXT_PUBLIC_*) or ensure this code runs server-side.`
        );
      }
      return defaultValue;
    }
  } else {
    // Node.js environment
    value = typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
  }
  
  if (!value && defaultValue) {
    value = defaultValue;
  }
  
  if (required && !value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Please set it in your .env file or environment.`
    );
  }
  
  if (value && validate && !validate(value)) {
    throw new Error(
      errorMessage || 
      `Invalid value for environment variable ${name}: ${value}`
    );
  }
  
  return value;
}

/**
 * Load and validate environment configuration
 * 
 * @param options - Configuration options
 * @returns Validated environment configuration
 * @throws Error if required variables are missing or invalid
 */
export function loadAndValidateConfig(options: {
  /** Override cluster (takes precedence over env vars) */
  cluster?: 'devnet' | 'mainnet-beta';
  /** Override RPC URL (takes precedence over env vars) */
  rpcUrl?: string;
  /** Environment detection override */
  environment?: Environment;
} = {}): GhostSolEnvConfig {
  const environment = options.environment || detectEnvironment();
  const isBrowser = isBrowserEnvironment();
  
  // Determine cluster
  let cluster: 'devnet' | 'mainnet-beta' = 'devnet';
  if (options.cluster) {
    cluster = options.cluster;
  } else {
    const clusterEnv = getEnvVar('SOLANA_CLUSTER') || 
                       getEnvVar('NEXT_PUBLIC_CLUSTER') ||
                       (isBrowser ? undefined : 'devnet');
    if (clusterEnv === 'devnet' || clusterEnv === 'mainnet-beta') {
      cluster = clusterEnv;
    }
  }
  
  // Determine RPC URL
  let rpcUrl: string;
  if (options.rpcUrl) {
    rpcUrl = options.rpcUrl;
  } else {
    const envRpcUrl = getEnvVar('SOLANA_RPC_URL') || 
                      getEnvVar('NEXT_PUBLIC_RPC_URL') ||
                      (cluster === 'mainnet-beta' 
                        ? 'https://api.mainnet-beta.solana.com'
                        : 'https://api.devnet.solana.com');
    
    if (!envRpcUrl) {
      throw new Error(
        'RPC URL is required. Set SOLANA_RPC_URL or NEXT_PUBLIC_RPC_URL in your environment.'
      );
    }
    rpcUrl = envRpcUrl;
  }
  
  // Validate RPC URL
  if (!isValidUrl(rpcUrl)) {
    throw new Error(
      `Invalid RPC URL format: ${rpcUrl}. Must be a valid HTTP or HTTPS URL.`
    );
  }
  
  // Require HTTPS in production
  if (environment === 'production' && !isValidHttpsUrl(rpcUrl)) {
    throw new Error(
      `Production requires HTTPS RPC URL. Got: ${rpcUrl}`
    );
  }
  
  // Optional fallback RPC URL
  const rpcUrlFallback = getEnvVar('SOLANA_RPC_URL_FALLBACK', {
    validate: isValidUrl,
    errorMessage: 'SOLANA_RPC_URL_FALLBACK must be a valid URL if provided'
  });
  
  // Optional Helius API key
  const heliusApiKey = getEnvVar('HELIUS_API_KEY');
  
  // Client-side public variables (Next.js)
  const nextPublicRpcUrl = getEnvVar('NEXT_PUBLIC_RPC_URL');
  const nextPublicClusterEnv = getEnvVar('NEXT_PUBLIC_CLUSTER');
  const nextPublicCluster = nextPublicClusterEnv === 'devnet' || nextPublicClusterEnv === 'mainnet-beta'
    ? nextPublicClusterEnv
    : undefined;
  
  return {
    cluster,
    rpcUrl,
    rpcUrlFallback,
    heliusApiKey,
    nextPublicRpcUrl,
    nextPublicCluster,
    environment,
    isBrowser,
  };
}

/**
 * Get configuration with masked sensitive values for logging
 */
export function getConfigForLogging(config: GhostSolEnvConfig): Record<string, unknown> {
  const logged: Record<string, unknown> = {
    cluster: config.cluster,
    rpcUrl: config.rpcUrl,
    environment: config.environment,
    isBrowser: config.isBrowser,
  };
  
  if (config.rpcUrlFallback) {
    logged.rpcUrlFallback = config.rpcUrlFallback;
  }
  
  if (config.heliusApiKey) {
    logged.heliusApiKey = maskSensitiveValue(config.heliusApiKey);
  }
  
  if (config.nextPublicRpcUrl) {
    logged.nextPublicRpcUrl = config.nextPublicRpcUrl;
  }
  
  if (config.nextPublicCluster) {
    logged.nextPublicCluster = config.nextPublicCluster;
  }
  
  return logged;
}

/**
 * Validate that sensitive environment variables are not accidentally exposed
 */
export function validateNoSensitiveExposure(): void {
  if (!isBrowserEnvironment()) {
    return; // Only check in browser
  }
  
  const errors: string[] = [];
  
  for (const varName of SENSITIVE_VARS) {
    // Check if sensitive variable is accessible in browser
    let value: string | undefined;
    
    if (typeof window !== 'undefined') {
      value = (window as any).__NEXT_DATA__?.env?.[varName];
    }
    
    if (!value && typeof process !== 'undefined' && process.env) {
      value = process.env[varName];
    }
    
    if (value) {
      errors.push(
        `SECURITY WARNING: Sensitive variable ${varName} is accessible in browser context. ` +
        `This is a security risk. Ensure this variable is only set server-side and never ` +
        `prefixed with NEXT_PUBLIC_.`
      );
    }
  }
  
  if (errors.length > 0) {
    console.error('Environment Configuration Security Errors:', errors);
    throw new Error(
      'Sensitive environment variables detected in browser context. ' +
      'Review your Next.js configuration and ensure sensitive variables are server-only.'
    );
  }
}

/**
 * Configuration error class for better error handling
 */
export class EnvConfigError extends Error {
  constructor(
    message: string,
    public readonly variableName?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EnvConfigError';
    Object.setPrototypeOf(this, EnvConfigError.prototype);
  }
}

