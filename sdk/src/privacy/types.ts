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
 * Stealth meta-address for receiving unlinkable payments
 * 
 * A meta-address is publicly shared information that allows senders
 * to generate unique stealth addresses for payments.
 */
export interface StealthMetaAddress {
  /** View public key (for detecting payments) */
  viewPublicKey: PublicKey;
  /** Spend public key (for spending payments) */
  spendPublicKey: PublicKey;
  /** Derivation path used */
  derivationPath: string;
  /** Version of the stealth address protocol */
  version: number;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Stealth address for a specific payment
 * 
 * Each payment uses a unique stealth address that is unlinkable
 * to other payments or the recipient's identity.
 */
export interface StealthAddress {
  /** The actual stealth address (one-time payment address) */
  address: PublicKey;
  /** Ephemeral public key published with payment */
  ephemeralPublicKey: PublicKey;
  /** Hash of shared secret (for verification) */
  sharedSecretHash: string;
  /** Original meta-address used */
  metaAddress: StealthMetaAddress;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Ephemeral key published alongside stealth payment
 * 
 * The ephemeral public key allows the recipient to compute
 * the shared secret and detect the payment.
 */
export interface EphemeralKey {
  /** Ephemeral public key (published on-chain) */
  publicKey: PublicKey;
  /** Encrypted ephemeral private key (for sender) */
  encryptedPrivateKey: Uint8Array;
  /** Transaction signature where this key was used */
  transactionSignature: string;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Detected stealth payment
 * 
 * Represents a payment that was detected by scanning the blockchain
 * for stealth addresses belonging to the user.
 */
export interface StealthPayment {
  /** Stealth address where payment was received */
  stealthAddress: PublicKey;
  /** Ephemeral public key from the payment */
  ephemeralPublicKey: PublicKey;
  /** Shared secret (computed by recipient) */
  sharedSecret: Buffer;
  /** Transaction signature */
  transactionSignature: string;
  /** Payment amount (in lamports) */
  amount: number;
  /** When the payment was detected */
  detectedAt: number;
  /** Whether the payment has been spent */
  spent: boolean;
}

/**
 * Error type for stealth address operations
 */
export class StealthAddressError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'StealthAddressError';
  }
}
