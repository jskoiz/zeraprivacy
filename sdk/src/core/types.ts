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
 * Light Protocol ZK Compression RPC endpoints
 * These are required for ZK Compression operations
 */
export const LIGHT_PROTOCOL_RPC_ENDPOINTS = {
  devnet: 'https://devnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf',
  mainnet: 'https://mainnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf'
};
