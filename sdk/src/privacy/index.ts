/**
 * privacy/index.ts
 * 
 * Purpose: Privacy module exports for true transaction privacy on Solana
 * 
 * This module provides the foundation for implementing actual transaction privacy
 * using SPL Token 2022 Confidential Transfers and ZK proofs, as opposed to the 
 * ZK Compression which only provides cost optimization.
 * 
 * Exports:
 * - GhostSolPrivacy - Main privacy class
 * - Privacy configuration types
 * - Encrypted balance utilities
 * - Viewing key management
 */

export { GhostSolPrivacy } from './ghost-sol-privacy';
export { ConfidentialTransferManager } from './confidential-transfer';
export { EncryptionUtils } from './encryption';
export { ViewingKeyManager, ViewingKeyConfig } from './viewing-keys';
export { StealthAddressManager } from './stealth-address';
export { 
  ProductionElGamal, 
  ElGamalUtils,
  ElGamalKeypair,
  ElGamalCiphertext,
  RangeProof
} from './elgamal-production';

// Type exports
export type {
  PrivacyConfig,
  EncryptedBalance,
  EncryptedAmount,
  ViewingKey,
  PrivacyMode,
  ZKProof,
  ConfidentialMint,
  ConfidentialAccount,
  StealthMetaAddress,
  StealthAddress,
  EphemeralKey,
  StealthPayment
} from './types';

// Error exports  
export {
  PrivacyError,
  EncryptionError,
  ProofGenerationError,
  ViewingKeyError,
  StealthAddressError
} from './errors';
