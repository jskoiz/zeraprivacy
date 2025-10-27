/**
 * index.ts
 * 
 * Purpose: Provide simple function-based API using singleton pattern
 * 
 * Dependencies:
 * - Core GhostSol class and types
 * - GlobalThis for singleton storage
 * 
 * Exports:
 * - init() - Initialize SDK singleton
 * - getAddress() - Get user's address
 * - getBalance() - Get compressed balance
 * - compress() - Compress SOL (shield)
 * - transfer() - Private transfer
 * - decompress() - Decompress SOL (unshield)
 * - fundDevnet() - Devnet airdrop helper
 */

import { PublicKey } from '@solana/web3.js';
import { GhostSol } from './core/ghost-sol';
import { GhostSolConfig, WalletAdapter } from './core/types';

// Global singleton instance storage
declare global {
  var __ghostSol__: GhostSol | undefined;
}

/**
 * Initialize the GhostSol SDK singleton with configuration
 * 
 * This function creates and configures the global GhostSol instance.
 * Must be called before using any other SDK functions.
 * 
 * @param config - Configuration options for SDK initialization
 * @returns Promise that resolves when initialization is complete
 * @throws Error if initialization fails
 */
export async function init(config: GhostSolConfig): Promise<void> {
  const instance = new GhostSol();
  await instance.init(config);
  globalThis.__ghostSol__ = instance;
}

/**
 * Get the user's public key as a base58 string
 * 
 * @returns Base58 encoded public key
 * @throws Error if SDK is not initialized
 */
export function getAddress(): string {
  const instance = _getInstance();
  return instance.getAddress();
}

/**
 * Get the compressed token balance for the user
 * 
 * @returns Promise resolving to balance in lamports
 * @throws Error if balance query fails
 */
export async function getBalance(): Promise<number> {
  const instance = _getInstance();
  return await instance.getBalance();
}

/**
 * Compress SOL from regular account to compressed token account
 * 
 * This is the "shield" operation that moves SOL from the user's regular
 * account into a compressed token account for private transfers.
 * 
 * @param amount - Amount to compress in SOL (will be converted to lamports)
 * @returns Promise resolving to transaction signature
 * @throws Error if compression fails
 */
export async function compress(amount: number): Promise<string> {
  const instance = _getInstance();
  const lamports = Math.floor(amount * 1e9); // Convert SOL to lamports
  return await instance.compress(lamports);
}

/**
 * Transfer compressed tokens to another address
 * 
 * This performs a private transfer between compressed accounts using
 * ZK proofs to maintain privacy.
 * 
 * @param to - Recipient's public key as base58 string
 * @param amount - Amount to transfer in SOL (will be converted to lamports)
 * @returns Promise resolving to transaction signature
 * @throws Error if transfer fails
 */
export async function transfer(to: string, amount: number): Promise<string> {
  const instance = _getInstance();
  const lamports = Math.floor(amount * 1e9); // Convert SOL to lamports
  return await instance.transfer(to, lamports);
}

/**
 * Decompress SOL from compressed account back to regular account
 * 
 * This is the "unshield" operation that moves SOL from a compressed
 * token account back to a regular Solana account.
 * 
 * @param amount - Amount to decompress in SOL (will be converted to lamports)
 * @param to - Optional destination address (defaults to user's address)
 * @returns Promise resolving to transaction signature
 * @throws Error if decompression fails
 */
export async function decompress(amount: number, to?: string): Promise<string> {
  const instance = _getInstance();
  const lamports = Math.floor(amount * 1e9); // Convert SOL to lamports
  
  // Handle PublicKey conversion for string addresses
  let destination: string | undefined = to;
  if (to) {
    try {
      // Validate that the address is a valid PublicKey
      new PublicKey(to);
      destination = to;
    } catch {
      throw new Error(`Invalid destination address: ${to}`);
    }
  }
  
  return await instance.decompress(lamports, destination);
}

/**
 * Request devnet airdrop for testing purposes
 * 
 * This method requests SOL from the devnet faucet for testing.
 * Only works on devnet and may be rate limited.
 * 
 * @param amount - Amount to request in SOL (default: 2 SOL)
 * @returns Promise resolving to transaction signature
 * @throws Error if airdrop fails
 */
export async function fundDevnet(amount: number = 2): Promise<string> {
  const instance = _getInstance();
  const lamports = Math.floor(amount * 1e9); // Convert SOL to lamports
  return await instance.fundDevnet(lamports);
}

/**
 * Get detailed balance information including compressed and regular SOL
 * 
 * @returns Promise resolving to detailed balance information
 * @throws Error if balance query fails
 */
export async function getDetailedBalance() {
  const instance = _getInstance();
  return await instance.getDetailedBalance();
}

/**
 * Check if the SDK is properly initialized
 * 
 * @returns True if SDK is initialized and ready to use
 */
export function isInitialized(): boolean {
  return globalThis.__ghostSol__?.isInitialized() ?? false;
}

/**
 * Get the singleton GhostSol instance
 * 
 * @returns GhostSol instance
 * @throws Error if SDK is not initialized
 */
function _getInstance(): GhostSol {
  const instance = globalThis.__ghostSol__;
  if (!instance || !instance.isInitialized()) {
    throw new Error(
      'GhostSol SDK is not initialized. Call init() first with your wallet configuration.'
    );
  }
  return instance;
}

// Re-export types for convenience
export type { GhostSolConfig, WalletAdapter, TransferResult, CompressedBalance } from './core/types';
export { GhostSolError } from './core/types';
export { GhostSol } from './core/ghost-sol';
