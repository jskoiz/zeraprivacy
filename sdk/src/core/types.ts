/**
 * types.ts
 * 
 * Purpose: Define TypeScript interfaces and types for the GhostSol SDK
 * 
 * Dependencies:
 * - @solana/web3.js for PublicKey and Connection types
 * 
 * Exports:
 * - GhostSolConfig - SDK initialization configuration
 * - WalletAdapter - Unified wallet interface
 * - TransferResult - Transaction result metadata
 * - CompressedBalance - Balance information for compressed accounts
 */

import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { Rpc } from '@lightprotocol/stateless.js';

/**
 * Configuration options for initializing the GhostSol SDK
 */
export interface GhostSolConfig {
  /** Wallet instance - can be Keypair, wallet adapter, or undefined for CLI */
  wallet?: Keypair | WalletAdapter;
  /** Solana RPC endpoint URL */
  rpcUrl?: string;
  /** Solana cluster - devnet or mainnet-beta */
  cluster?: 'devnet' | 'mainnet-beta';
  /** Commitment level for transaction confirmation */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** Privacy configuration - enables true privacy vs efficiency mode */
  privacy?: PrivacySdkConfig;
}

/**
 * Privacy configuration for the SDK
 */
export interface PrivacySdkConfig {
  /** Mode selection: 'privacy' for true privacy, 'efficiency' for ZK Compression */
  mode: 'privacy' | 'efficiency';
  /** Enable viewing keys for compliance/auditing */
  enableViewingKeys?: boolean;
  /** Enable audit mode for regulatory compliance */
  auditMode?: boolean;
}

/**
 * Unified wallet interface supporting different wallet types
 * 
 * This interface abstracts over Keypair (Node.js) and wallet adapters (browser)
 * to provide a consistent API for signing transactions
 */
export interface WalletAdapter {
  /** Public key of the wallet */
  publicKey: PublicKey;
  /** Sign transaction method */
  signTransaction<T>(tx: T): Promise<T>;
  /** Sign all transactions method */
  signAllTransactions<T>(txs: T[]): Promise<T[]>;
  /** Optional: Sign message method for additional functionality */
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * Extended wallet interface that includes raw Keypair for signing operations
 * This is used internally to bridge between our WalletAdapter interface and
 * the raw Keypair required by @lightprotocol/stateless.js
 */
export interface ExtendedWalletAdapter extends WalletAdapter {
  /** Original raw Keypair for signing operations (if available) */
  rawKeypair?: Keypair;
}

/**
 * Result of a transfer operation containing transaction metadata
 */
export interface TransferResult {
  /** Transaction signature */
  signature: string;
  /** Block height when transaction was confirmed */
  blockHeight?: number;
  /** Confirmation status */
  status: 'confirmed' | 'finalized' | 'failed';
  /** Error message if transaction failed */
  error?: string;
}

/**
 * Balance information for compressed token accounts
 */
export interface CompressedBalance {
  /** Balance in lamports */
  lamports: number;
  /** Balance in SOL (lamports / 1e9) */
  sol: number;
  /** Whether the compressed account exists */
  exists: boolean;
  /** Last updated block height */
  lastUpdated?: number;
}

/**
 * Network configuration for different Solana clusters
 */
export interface NetworkConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Cluster identifier */
  cluster: 'devnet' | 'mainnet-beta';
  /** Default commitment level */
  commitment: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Predefined network configurations
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  devnet: {
    rpcUrl: 'https://api.devnet.solana.com',
    cluster: 'devnet',
    commitment: 'confirmed'
  },
  mainnet: {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    cluster: 'mainnet-beta',
    commitment: 'confirmed'
  }
};

/**
 * RPC Provider configuration for failover support
 */
export interface RpcProvider {
  /** Provider name for logging */
  name: string;
  /** RPC endpoint URL */
  url: string;
  /** Priority (lower = higher priority, 1 = primary) */
  priority: number;
}

/**
 * Get Helius RPC URL with API key from environment variable
 * 
 * @param cluster - The Solana cluster (devnet or mainnet-beta)
 * @returns Helius RPC URL with API key if available, or undefined
 */
function getHeliusRpcUrl(cluster: 'devnet' | 'mainnet-beta'): string | undefined {
  // Try to get API key from environment variable
  const apiKey = typeof process !== 'undefined' ? process.env.HELIUS_API_KEY : undefined;
  
  if (!apiKey) {
    console.warn('HELIUS_API_KEY not set - Helius RPC will be skipped in failover');
    return undefined;
  }
  
  const subdomain = cluster === 'mainnet-beta' ? 'mainnet' : 'devnet';
  return `https://${subdomain}.helius-rpc.com/?api-key=${apiKey}`;
}

/**
 * Get RPC providers with proper API key configuration
 * 
 * This function dynamically builds the provider list, including or excluding
 * providers based on whether required API keys are available.
 * 
 * @param cluster - The Solana cluster
 * @returns Array of RPC providers sorted by priority
 */
export function getRpcProviders(cluster: 'devnet' | 'mainnet-beta'): RpcProvider[] {
  const providers: RpcProvider[] = [
    {
      name: 'GhostSOL Primary',
      url: `https://rpc.ghostsol.io/${cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'}`,
      priority: 1
    },
    {
      name: 'Light Protocol',
      url: `https://photon.${cluster === 'mainnet-beta' ? 'mainnet' : 'devnet'}.light.so`,
      priority: 3
    }
  ];

  // Add Helius if API key is available
  const heliusUrl = getHeliusRpcUrl(cluster);
  if (heliusUrl) {
    providers.push({
      name: 'Helius',
      url: heliusUrl,
      priority: 2
    });
  }

  // Add Solana public RPC for devnet
  if (cluster === 'devnet') {
    providers.push({
      name: 'Solana Public',
      url: 'https://api.devnet.solana.com',
      priority: 4
    });
  }

  // Sort by priority
  return providers.sort((a, b) => a.priority - b.priority);
}

/**
 * Static RPC provider configuration (for backward compatibility)
 * 
 * Note: This does not include Helius URLs to avoid hardcoded secrets.
 * Use getRpcProviders() function instead for full provider list with API key support.
 * 
 * @deprecated Use getRpcProviders() instead
 */
export const RPC_PROVIDERS: Record<'devnet' | 'mainnet-beta', RpcProvider[]> = {
  devnet: [
    {
      name: 'GhostSOL Primary',
      url: 'https://rpc.ghostsol.io/devnet',
      priority: 1
    },
    {
      name: 'Light Protocol',
      url: 'https://photon.devnet.light.so',
      priority: 3
    },
    {
      name: 'Solana Public',
      url: 'https://api.devnet.solana.com',
      priority: 4
    }
  ],
  'mainnet-beta': [
    {
      name: 'GhostSOL Primary',
      url: 'https://rpc.ghostsol.io/mainnet',
      priority: 1
    },
    {
      name: 'Light Protocol',
      url: 'https://photon.mainnet.light.so',
      priority: 3
    }
  ]
};

/**
 * Light Protocol ZK Compression RPC endpoints
 * These are required for ZK Compression operations
 * 
 * Note: To use Helius RPC, set HELIUS_API_KEY environment variable
 * 
 * @deprecated Use getRpcProviders() instead for automatic failover
 */
export const LIGHT_PROTOCOL_RPC_ENDPOINTS: Record<string, string> = {
  devnet: getHeliusRpcUrl('devnet') || 'https://api.devnet.solana.com',
  mainnet: getHeliusRpcUrl('mainnet-beta') || 'https://api.mainnet-beta.solana.com'
};
