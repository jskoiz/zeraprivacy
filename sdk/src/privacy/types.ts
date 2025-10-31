/**
 * privacy/types.ts
 * 
 * Purpose: TypeScript type definitions for privacy functionality
 * 
 * This module defines all the types needed for implementing true privacy
 * using confidential transfers and zero-knowledge proofs on Solana.
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Privacy configuration options
 */
export interface PrivacyConfig {
  /** Privacy mode selection */
  mode: PrivacyMode;
  /** Enable viewing keys for compliance/auditing */
  enableViewingKeys?: boolean;
  /** Enable audit mode for regulatory compliance */
  auditMode?: boolean;
  /** Custom ZK circuit parameters */
  circuitParams?: ZKCircuitParams;
}

/**
 * Privacy mode selection
 */
export type PrivacyMode = 'privacy' | 'efficiency';

/**
 * Encrypted balance representation
 */
export interface EncryptedBalance {
  /** Encrypted balance ciphertext */
  ciphertext: Uint8Array;
  /** Public commitment to the balance */
  commitment: Uint8Array;
  /** Randomness used in encryption (for owner) */
  randomness?: Uint8Array;
  /** Last update timestamp */
  lastUpdated: number;
  /** Whether the account exists */
  exists: boolean;
}

/**
 * Encrypted amount for private transfers
 */
export interface EncryptedAmount {
  /** Encrypted amount ciphertext */
  ciphertext: Uint8Array;
  /** Commitment to the amount */
  commitment: Uint8Array;
  /** Range proof for amount validity */
  rangeProof: Uint8Array;
  /** Randomness (kept private by sender) */
  randomness?: Uint8Array;
}

/**
 * Viewing key for compliance and auditing
 */
export interface ViewingKey {
  /** Public key component */
  publicKey: PublicKey;
  /** Private key component (encrypted) */
  encryptedPrivateKey: Uint8Array;
  /** Key derivation path */
  derivationPath: string;
  /** Permissions associated with this key */
  permissions: ViewingKeyPermissions;
  /** Expiration timestamp (optional) */
  expiresAt?: number;
}

/**
 * Viewing key permissions
 */
export interface ViewingKeyPermissions {
  /** Can decrypt balances */
  canViewBalances: boolean;
  /** Can decrypt transaction amounts */
  canViewAmounts: boolean;
  /** Can view transaction metadata */
  canViewMetadata: boolean;
  /** Specific accounts accessible (empty = all) */
  allowedAccounts?: PublicKey[];
}

/**
 * Zero-knowledge proof structure
 */
export interface ZKProof {
  /** Proof data */
  proof: Uint8Array;
  /** Public inputs to the circuit */
  publicInputs: Uint8Array[];
  /** Proof system identifier */
  proofSystem: 'groth16' | 'plonk' | 'stark';
  /** Circuit identifier/hash */
  circuitHash: string;
}

/**
 * ZK circuit parameters
 */
export interface ZKCircuitParams {
  /** Maximum transfer amount (for range proofs) */
  maxAmount?: bigint;
  /** Anonymity set size */
  anonymitySetSize?: number;
  /** Proof generation timeout (ms) */
  proofTimeout?: number;
}

/**
 * Confidential mint account
 */
export interface ConfidentialMint {
  /** Mint public key */
  address: PublicKey;
  /** Mint authority */
  authority: PublicKey;
  /** Whether confidential transfers are enabled */
  confidentialTransferEnabled: boolean;
  /** Auditor authority for viewing keys */
  auditorAuthority?: PublicKey;
  /** Maximum supply (if limited) */
  maxSupply?: bigint;
}

/**
 * Confidential token account
 */
export interface ConfidentialAccount {
  /** Account public key */
  address: PublicKey;
  /** Associated mint */
  mint: PublicKey;
  /** Account owner */
  owner: PublicKey;
  /** Encrypted balance */
  encryptedBalance: EncryptedBalance;
  /** Viewing key (if any) */
  viewingKey?: ViewingKey;
  /** Account creation timestamp */
  createdAt: number;
}

/**
 * Private transfer transaction result
 */
export interface PrivateTransferResult {
  /** Transaction signature */
  signature: string;
  /** Encrypted amount transferred */
  encryptedAmount: EncryptedAmount;
  /** ZK proof of validity */
  zkProof: ZKProof;
  /** Block height when confirmed */
  blockHeight?: number;
  /** Gas cost */
  gasCost?: number;
}

/**
 * Configuration for initializing the privacy SDK
 */
export interface PrivacySdkConfig {
  /** Privacy settings */
  privacy: PrivacyConfig;
  /** Solana cluster */
  cluster: 'devnet' | 'mainnet-beta' | 'testnet';
  /** Custom RPC endpoint */
  rpcUrl?: string;
  /** Commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

/**
 * Stealth meta-address for receiving stealth payments
 * Users publish this publicly to allow others to generate stealth addresses
 */
export interface StealthMetaAddress {
  /** Viewing public key (public) */
  viewingPublicKey: PublicKey;
  /** Spending public key (public) */
  spendingPublicKey: PublicKey;
  /** Viewing secret key (private, for scanning) */
  viewingSecretKey: Uint8Array;
  /** Spending secret key (private, for spending) */
  spendingSecretKey: Uint8Array;
}

/**
 * One-time stealth address for receiving payments
 */
export interface StealthAddress {
  /** The one-time stealth address to send payment to */
  address: PublicKey;
  /** Ephemeral public key (included in transaction for recipient to detect) */
  ephemeralPublicKey: PublicKey;
  /** Ephemeral private key (kept by sender, can be discarded after tx) */
  ephemeralPrivateKey?: Uint8Array;
  /** Shared secret (derived via ECDH) */
  sharedSecret?: Uint8Array;
}

/**
 * Detected stealth payment from scanning
 */
export interface StealthPayment {
  /** Transaction signature */
  signature: string;
  /** Amount received (in lamports) */
  amount: number;
  /** The stealth address that received the payment */
  stealthAddress: PublicKey;
  /** Block time when transaction was confirmed */
  blockTime: number | null;
  /** Ephemeral public key from the transaction */
  ephemeralKey: PublicKey;
  /** Slot number */
  slot: number;
}

/**
 * Configuration for payment scanning
 */
export interface PaymentScanConfig {
  /** Interval between background scans (ms) */
  scanIntervalMs?: number;
  /** Number of transactions to scan per batch */
  batchSize?: number;
  /** Maximum number of transactions to scan */
  maxTransactions?: number;
  /** Program ID to filter transactions (for optimization) */
  programId?: PublicKey;
}
