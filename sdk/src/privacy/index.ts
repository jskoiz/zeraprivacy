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
export { ViewingKeyManager } from './viewing-keys';

// Type exports
export type {
  PrivacyConfig,
  EncryptedBalance,
  EncryptedAmount,
  ViewingKey,
  PrivacyMode,
  ZKProof,
  ConfidentialMint,
  ConfidentialAccount
} from './types';

// Error exports  
export {
  PrivacyError,
  EncryptionError,
  ProofGenerationError,
  ViewingKeyError
} from './errors';
