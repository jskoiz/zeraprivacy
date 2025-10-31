/**
 * index.ts
 * 
 * Purpose: Main SDK entry point with dual-mode support (Privacy vs Efficiency)
 * 
 * This module provides the main interface for the GhostSol SDK, supporting
 * both privacy mode (true transaction privacy using confidential transfers)
 * and efficiency mode (cost optimization using ZK compression).
 * 
 * The SDK automatically selects the appropriate implementation based on the
 * configuration provided during initialization.
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  GhostSolConfig, 
  ExtendedWalletAdapter, 
  TransferResult, 
  CompressedBalance,
  PrivacySdkConfig 
} from './core/types';
import { GhostSol } from './core/ghost-sol';
import { GhostSolPrivacy } from './privacy/ghost-sol-privacy';
import { normalizeWallet, getWalletAddress } from './core/wallet';
import { GhostSolError, ValidationError } from './core/errors';

// Global SDK instance
let sdkInstance: GhostSol | null = null;
let privacyInstance: GhostSolPrivacy | null = null;
let currentMode: 'privacy' | 'efficiency' = 'efficiency'; // Default to efficiency for backward compatibility

/**
 * Initialize the GhostSol SDK with dual-mode support
 * 
 * @param config - Configuration object supporting both privacy and efficiency modes
 * @returns Promise that resolves when initialization is complete
 * @throws GhostSolError if initialization fails
 * 
 * @example
 * // Efficiency mode (default - ZK Compression for cost savings)
 * await init({
 *   wallet: keypair,
 *   cluster: 'devnet'
 * });
 * 
 * @example
 * // Privacy mode (true transaction privacy with confidential transfers)
 * await init({
 *   wallet: keypair,
 *   cluster: 'devnet',
 *   privacy: {
 *     mode: 'privacy',
 *     enableViewingKeys: true
 *   }
 * });
 */
export async function init(config: GhostSolConfig): Promise<void> {
  try {
    // Determine mode based on configuration
    const mode = config.privacy?.mode || 'efficiency';
    currentMode = mode;
    
    if (mode === 'privacy') {
      // Initialize privacy mode
      if (!config.privacy) {
        throw new ValidationError('Privacy configuration required for privacy mode');
      }
      
      privacyInstance = new GhostSolPrivacy();
      
      // Create connection
      const connection = new Connection(
        config.rpcUrl || (config.cluster === 'mainnet-beta' 
          ? 'https://api.mainnet-beta.solana.com' 
          : 'https://api.devnet.solana.com'),
        config.commitment || 'confirmed'
      );
      
      // Normalize wallet
      const wallet = normalizeWallet(config.wallet);
      
      await privacyInstance.init(connection, wallet, config.privacy);
      
    } else {
      // Initialize efficiency mode (existing functionality)
      sdkInstance = new GhostSol();
      await sdkInstance.init(config);
    }
    
  } catch (error) {
    throw new GhostSolError(
      `Failed to initialize GhostSol SDK in ${currentMode} mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INITIALIZATION_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Get the current wallet address
 * Works in both privacy and efficiency modes
 * 
 * @returns Base58 encoded wallet address
 * @throws GhostSolError if SDK not initialized
 */
export function getAddress(): string {
  _assertInitialized();
  
  if (currentMode === 'privacy') {
    // In privacy mode, this returns the wallet address (not necessarily linked to transactions)
    return (privacyInstance as any).wallet.publicKey.toBase58();
  } else {
    return sdkInstance!.getAddress();
  }
}

/**
 * Get balance information
 * Returns different data based on mode:
 * - Privacy mode: Returns encrypted balance (use decryptBalance to get actual amount)
 * - Efficiency mode: Returns compressed balance information
 */
export async function getBalance(): Promise<CompressedBalance | any> {
  _assertInitialized();
  
  if (currentMode === 'privacy') {
    // Return encrypted balance information
    return await privacyInstance!.getEncryptedBalance();
  } else {
    return await sdkInstance!.getBalance();
  }
}

/**
 * Deposit/Shield operation
 * - Privacy mode: Creates encrypted deposit with true privacy
 * - Efficiency mode: Compresses tokens for cost efficiency
 */
export async function deposit(amount: number): Promise<string> {
  _assertInitialized();
  
  if (currentMode === 'privacy') {
    return await privacyInstance!.encryptedDeposit(amount * LAMPORTS_PER_SOL);
  } else {
    // Map to existing compress function for backward compatibility
    return await sdkInstance!.compress(amount);
  }
}

/**
 * Transfer operation  
 * - Privacy mode: Performs private transfer with unlinkability
 * - Efficiency mode: Performs compressed transfer (visible but cheap)
 */
export async function transfer(recipientAddress: string, amount: number): Promise<TransferResult | any> {
  _assertInitialized();
  
  if (currentMode === 'privacy') {
    return await privacyInstance!.privateTransfer(recipientAddress, amount * LAMPORTS_PER_SOL);
  } else {
    return await sdkInstance!.transfer(recipientAddress, amount);
  }
}

/**
 * Withdraw/Unshield operation
 * - Privacy mode: Encrypted withdrawal maintaining privacy
 * - Efficiency mode: Decompresses tokens to regular form
 */
export async function withdraw(amount: number, destination?: PublicKey): Promise<string> {
  _assertInitialized();
  
  if (currentMode === 'privacy') {
    return await privacyInstance!.encryptedWithdraw(amount * LAMPORTS_PER_SOL, destination);
  } else {
    // Map to existing decompress function for backward compatibility
    return await sdkInstance!.decompress(amount);
  }
}

// Privacy-specific functions (only available in privacy mode)

/**
 * Decrypt balance (privacy mode only)
 * Decrypts the encrypted balance to get the actual amount
 * 
 * @param viewingKey - Optional viewing key for auditor access
 * @returns Decrypted balance in SOL
 * @throws GhostSolError if not in privacy mode
 */
export async function decryptBalance(viewingKey?: any): Promise<number> {
  _assertPrivacyMode();
  
  const balanceInLamports = await privacyInstance!.decryptBalance(viewingKey);
  return balanceInLamports / LAMPORTS_PER_SOL;
}

/**
 * Generate viewing key for compliance (privacy mode only)
 * Creates a viewing key that allows authorized parties to decrypt transactions
 * 
 * @returns Generated viewing key
 * @throws GhostSolError if not in privacy mode or viewing keys not enabled
 */
export async function generateViewingKey(): Promise<any> {
  _assertPrivacyMode();
  
  return await privacyInstance!.generateViewingKey();
}

/**
 * Create confidential account (privacy mode only)
 * Creates a new confidential token account for private operations
 * 
 * @param mint - Optional mint address (creates new mint if not provided)
 * @returns Confidential account address
 */
export async function createConfidentialAccount(mint?: PublicKey): Promise<PublicKey> {
  _assertPrivacyMode();
  
  return await privacyInstance!.createConfidentialAccount(mint);
}

// Stealth Address Functions (privacy mode only)

/**
 * Generate a stealth meta-address (privacy mode only)
 * 
 * Creates a meta-address that can be publicly shared to receive
 * unlinkable payments via stealth addresses.
 * 
 * @param viewKeypair - Optional view keypair (generated if not provided)
 * @param spendKeypair - Optional spend keypair (generated if not provided)
 * @returns Stealth meta-address
 * @throws GhostSolError if not in privacy mode
 */
export function generateStealthMetaAddress(viewKeypair?: any, spendKeypair?: any): any {
  _assertPrivacyMode();
  
  return privacyInstance!.generateStealthMetaAddress(viewKeypair, spendKeypair);
}

/**
 * Generate a unique stealth address for a payment (privacy mode only)
 * 
 * Creates a one-time address for sending a payment that maintains
 * complete on-chain unlinkability.
 * 
 * @param recipientMetaAddress - Recipient's stealth meta-address
 * @param ephemeralKeypair - Optional ephemeral keypair (generated if not provided)
 * @returns Stealth address and ephemeral key
 * @throws GhostSolError if not in privacy mode
 */
export function generateStealthAddress(recipientMetaAddress: any, ephemeralKeypair?: any): any {
  _assertPrivacyMode();
  
  return privacyInstance!.generateStealthAddress(recipientMetaAddress, ephemeralKeypair);
}

/**
 * Scan for payments to stealth addresses (privacy mode only)
 * 
 * Checks the blockchain for payments made to the user's stealth addresses
 * by scanning ephemeral public keys.
 * 
 * @param metaAddress - User's stealth meta-address
 * @param viewPrivateKey - User's view private key
 * @param ephemeralKeys - List of ephemeral keys from blockchain
 * @returns Array of detected stealth payments
 * @throws GhostSolError if not in privacy mode
 */
export async function scanForPayments(
  metaAddress: any,
  viewPrivateKey: Uint8Array,
  ephemeralKeys: any[]
): Promise<any[]> {
  _assertPrivacyMode();
  
  return await privacyInstance!.scanForPayments(metaAddress, viewPrivateKey, ephemeralKeys);
}

/**
 * Derive spending key for a detected stealth payment (privacy mode only)
 * 
 * Computes the private key needed to spend from a detected stealth address.
 * 
 * @param payment - Detected stealth payment
 * @param spendPrivateKey - User's spend private key
 * @returns Private key for spending the stealth payment
 * @throws GhostSolError if not in privacy mode
 */
export function deriveStealthSpendingKey(payment: any, spendPrivateKey: Uint8Array): Uint8Array {
  _assertPrivacyMode();
  
  return privacyInstance!.deriveStealthSpendingKey(payment, spendPrivateKey);
}

/**
 * Verify that a stealth address was correctly generated (privacy mode only)
 * 
 * Performs validation checks to ensure the stealth address is valid and
 * correctly derived from the meta-address and ephemeral public key.
 * 
 * @param stealthAddress - Stealth address to verify
 * @param metaAddress - Original meta-address
 * @param ephemeralPublicKey - Ephemeral public key used
 * @returns true if valid, false otherwise
 * @throws GhostSolError if not in privacy mode
 */
export function verifyStealthAddress(
  stealthAddress: PublicKey,
  metaAddress: any,
  ephemeralPublicKey: PublicKey
): boolean {
  _assertPrivacyMode();
  
  return privacyInstance!.verifyStealthAddress(stealthAddress, metaAddress, ephemeralPublicKey);
}

/**
 * Fetch ephemeral keys from blockchain transactions (privacy mode only)
 * 
 * Scans the blockchain for transactions containing ephemeral keys published
 * alongside stealth address payments. This is useful for discovering payments
 * made to your stealth addresses.
 * 
 * @param startSlot - Optional starting slot for scanning (default: scan recent blocks)
 * @param endSlot - Optional ending slot for scanning (default: current slot)
 * @returns Array of ephemeral keys found on-chain
 * @throws GhostSolError if not in privacy mode
 */
export async function fetchEphemeralKeysFromBlockchain(
  startSlot?: number,
  endSlot?: number
): Promise<any[]> {
  _assertPrivacyMode();
  
  return await privacyInstance!.fetchEphemeralKeysFromBlockchain(startSlot, endSlot);
}

/**
 * Scan blockchain for payments to stealth addresses (privacy mode only)
 * 
 * This is a convenience method that fetches ephemeral keys from the blockchain
 * and scans for payments in one operation. This is the easiest way to discover
 * payments made to your stealth addresses without manually fetching ephemeral keys.
 * 
 * @param metaAddress - User's stealth meta-address
 * @param viewPrivateKey - User's view private key
 * @param startSlot - Optional starting slot for scanning
 * @param endSlot - Optional ending slot for scanning
 * @returns Array of detected stealth payments
 * @throws GhostSolError if not in privacy mode
 */
export async function scanBlockchainForPayments(
  metaAddress: any,
  viewPrivateKey: Uint8Array,
  startSlot?: number,
  endSlot?: number
): Promise<any[]> {
  _assertPrivacyMode();
  
  return await privacyInstance!.scanBlockchainForPayments(
    metaAddress,
    viewPrivateKey,
    startSlot,
    endSlot
  );
}

// Backward compatibility functions (efficiency mode)

/**
 * Compress tokens (efficiency mode - backward compatibility)
 * @deprecated Use deposit() for unified interface
 */
export async function compress(amount: number): Promise<string> {
  return await deposit(amount);
}

/**
 * Decompress tokens (efficiency mode - backward compatibility)  
 * @deprecated Use withdraw() for unified interface
 */
export async function decompress(amount: number): Promise<string> {
  return await withdraw(amount);
}

// Existing efficiency-only functions for backward compatibility

/**
 * Fund devnet account (efficiency mode only)
 * Only available in efficiency mode for testing
 */
export async function fundDevnet(lamports?: number): Promise<string> {
  if (currentMode === 'privacy') {
    throw new GhostSolError(
      'Devnet funding not available in privacy mode. Fund the account manually.',
      'PRIVACY_MODE_ERROR'
    );
  }
  
  _assertEfficiencyMode();
  return await sdkInstance!.fundDevnet(lamports);
}

/**
 * Get detailed balance information (efficiency mode only)
 */
export async function getDetailedBalance(): Promise<any> {
  _assertEfficiencyMode();
  return await sdkInstance!.getDetailedBalance();
}

/**
 * Check if SDK is initialized
 */
export function isInitialized(): boolean {
  return (currentMode === 'privacy' && privacyInstance !== null) || 
         (currentMode === 'efficiency' && sdkInstance !== null);
}

/**
 * Get current SDK mode
 */
export function getCurrentMode(): 'privacy' | 'efficiency' {
  return currentMode;
}

/**
 * Get current SDK instance (for advanced usage)
 * Returns appropriate instance based on current mode
 */
export function getSdkInstance(): GhostSol | GhostSolPrivacy {
  _assertInitialized();
  
  if (currentMode === 'privacy') {
    return privacyInstance!;
  } else {
    return sdkInstance!;
  }
}

// Private helper functions

function _assertInitialized(): void {
  if (!isInitialized()) {
    throw new GhostSolError(
      'GhostSol SDK not initialized. Call init() first.',
      'NOT_INITIALIZED_ERROR'
    );
  }
}

function _assertPrivacyMode(): void {
  _assertInitialized();
  
  if (currentMode !== 'privacy') {
    throw new GhostSolError(
      'This function is only available in privacy mode. Initialize with privacy: { mode: "privacy" }',
      'PRIVACY_MODE_ERROR'  
    );
  }
}

function _assertEfficiencyMode(): void {
  _assertInitialized();
  
  if (currentMode !== 'efficiency') {
    throw new GhostSolError(
      'This function is only available in efficiency mode.',
      'EFFICIENCY_MODE_ERROR'
    );
  }
}

// Export types for external usage
export type { 
  GhostSolConfig, 
  WalletAdapter, 
  ExtendedWalletAdapter, 
  TransferResult, 
  CompressedBalance,
  PrivacySdkConfig
} from './core/types';

// Export privacy-specific types
export type {
  PrivacyConfig,
  EncryptedBalance,
  EncryptedAmount, 
  ViewingKey,
  PrivateTransferResult,
  StealthMetaAddress,
  StealthAddress,
  EphemeralKey,
  StealthPayment
} from './privacy/types';

// Export error classes
export { 
  GhostSolError, 
  ValidationError, 
  CompressionError, 
  TransferError, 
  DecompressionError 
} from './core/errors';

export {
  PrivacyError,
  EncryptionError,
  ProofGenerationError,
  ViewingKeyError,
  StealthAddressError
} from './privacy/errors';

// Export RPC configuration classes and functions
export {
  loadRpcConfig,
  createRpcConfigFromUrl,
  validateRpcConfig,
  getRpcConfigForLogging,
  getZkCompressionEndpoints,
  hasZkCompressionSupport,
  DEFAULT_RPC_CONFIG
} from './core/rpc-config';

export type {
  RpcConfig,
  RpcEndpointConfig,
  RpcProvider
} from './core/rpc-config';

export {
  RpcManager,
  createRpcManager,
  EndpointHealth
} from './core/rpc-manager';

export type {
  EndpointHealthInfo
} from './core/rpc-manager';