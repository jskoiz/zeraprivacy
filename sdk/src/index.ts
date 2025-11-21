/**
 * index.ts
 * 
 * Purpose: Main SDK entry point for Zera Privacy
 * 
 * This module provides the main interface for the Zera SDK, focusing exclusively
 * on privacy mode (true transaction privacy using confidential transfers).
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  PrivacyConfig,
  EncryptedBalance,
  PrivateTransferResult,
  ViewingKey,
  StealthMetaAddress,
  StealthAddress,
  EphemeralKey,
  StealthPayment
} from './privacy/types';
import { ZeraPrivacy } from './privacy/zera-privacy';
import { ExtendedWalletAdapter } from './core/types';
import { PrivacyError } from './privacy/errors';

// Global SDK instance
let privacyInstance: ZeraPrivacy | null = null;

/**
 * Initialize the Zera Privacy SDK
 * 
 * @param config - Configuration object
 * @returns Promise that resolves when initialization is complete
 * 
 * @example
 * await init({
 *   wallet: keypair,
 *   cluster: 'devnet',
 *   privacy: {
 *     mode: 'privacy',
 *     enableViewingKeys: true
 *   }
 * });
 */
export async function init(config: any): Promise<void> {
  try {
    // Create connection
    const connection = new Connection(
      config.rpcUrl || (config.cluster === 'mainnet-beta'
        ? 'https://api.mainnet-beta.solana.com'
        : 'https://api.devnet.solana.com'),
      config.commitment || 'confirmed'
    );

    // Normalize wallet (simplified for now)
    const wallet = config.wallet;

    privacyInstance = new ZeraPrivacy();

    // Default privacy config if not provided
    const privacyConfig = config.privacy || { mode: 'privacy' };

    await privacyInstance.init(connection, wallet, privacyConfig);

  } catch (error) {
    throw new PrivacyError(
      `Failed to initialize Zera SDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if SDK is initialized
 */
export function isInitialized(): boolean {
  return privacyInstance !== null;
}

/**
 * Get the current wallet address
 */
export function getAddress(): string {
  _assertInitialized();
  // Accessing private property via any cast - in production we should add a public getter
  return (privacyInstance as any).wallet.publicKey.toBase58();
}

/**
 * Create a new confidential mint (for testing/demo purposes)
 */
export async function createConfidentialMint(decimals: number = 9): Promise<PublicKey> {
  _assertInitialized();
  return await privacyInstance!.createConfidentialMint(decimals);
}

/**
 * Create a confidential token account
 */
export async function createConfidentialAccount(mint: PublicKey, owner?: PublicKey): Promise<PublicKey> {
  _assertInitialized();
  return await privacyInstance!.createConfidentialAccount(mint, owner);
}

/**
 * Deposit (Shield) public tokens into confidential balance
 */
export async function deposit(account: PublicKey, mint: PublicKey, amount: number): Promise<string> {
  _assertInitialized();
  return await privacyInstance!.deposit(account, mint, amount);
}

/**
 * Transfer confidential tokens privately
 */
export async function transfer(
  sourceAccount: PublicKey,
  mint: PublicKey,
  destinationAccount: PublicKey,
  amount: number
): Promise<string> {
  _assertInitialized();
  return await privacyInstance!.transfer(sourceAccount, mint, destinationAccount, amount);
}

/**
 * Withdraw (Unshield) confidential tokens to public balance
 */
export async function withdraw(
  account: PublicKey,
  mint: PublicKey,
  amount: number
): Promise<string> {
  _assertInitialized();
  return await privacyInstance!.withdraw(account, mint, amount);
}

/**
 * Get confidential balance (encrypted)
 */
export async function getBalance(account: PublicKey): Promise<string> {
  _assertInitialized();
  return await privacyInstance!.getBalance(account);
}

// Stealth Address Functions

export function generateStealthMetaAddress(viewKeypair?: Keypair, spendKeypair?: Keypair): StealthMetaAddress {
  _assertInitialized();
  return privacyInstance!.generateStealthMetaAddress(viewKeypair, spendKeypair);
}

export function generateStealthAddress(
  recipientMetaAddress: StealthMetaAddress,
  ephemeralKeypair?: Keypair
): { stealthAddress: StealthAddress; ephemeralKey: EphemeralKey } {
  _assertInitialized();
  return privacyInstance!.generateStealthAddress(recipientMetaAddress, ephemeralKeypair);
}

export async function scanForPayments(
  metaAddress: StealthMetaAddress,
  viewPrivateKey: Uint8Array,
  ephemeralKeys: EphemeralKey[]
): Promise<StealthPayment[]> {
  _assertInitialized();
  return await privacyInstance!.scanForPayments(metaAddress, viewPrivateKey, ephemeralKeys);
}

export function deriveStealthSpendingKey(payment: StealthPayment, spendPrivateKey: Uint8Array): { privateKey: Uint8Array; publicKey: PublicKey } {
  _assertInitialized();
  return privacyInstance!.deriveStealthSpendingKey(payment, spendPrivateKey);
}

export function verifyStealthAddress(
  stealthAddress: PublicKey,
  metaAddress: StealthMetaAddress,
  ephemeralPublicKey: PublicKey
): boolean {
  _assertInitialized();
  return privacyInstance!.verifyStealthAddress(stealthAddress, metaAddress, ephemeralPublicKey);
}

// Private helper functions

function _assertInitialized(): void {
  if (!isInitialized()) {
    throw new PrivacyError('Zera SDK not initialized. Call init() first.');
  }
}

// Export types
export type {
  PrivacyConfig,
  EncryptedBalance,
  PrivateTransferResult,
  ViewingKey,
  StealthMetaAddress,
  StealthAddress,
  EphemeralKey,
  StealthPayment
} from './privacy/types';

export { ZeraPrivacy } from './privacy/zera-privacy';
export { PrivacyError } from './privacy/errors';
