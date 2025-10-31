/**
 * privacy/errors.ts
 * 
 * Purpose: Error classes for privacy functionality
 * 
 * This module defines specialized error classes for privacy operations,
 * providing clear error messages and debugging information for issues
 * related to encryption, zero-knowledge proofs, and viewing keys.
 */

import { GhostSolError } from '../core/errors';

/**
 * Base error class for all privacy-related errors
 */
export class PrivacyError extends GhostSolError {
  constructor(message: string, cause?: Error) {
    super(message, 'PRIVACY_ERROR', cause);
    this.name = 'PrivacyError';
  }
}

/**
 * Error thrown when encryption/decryption operations fail
 */
export class EncryptionError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Encryption failed: ${message}`, cause);
    this.name = 'EncryptionError';
  }
}

/**
 * Error thrown when zero-knowledge proof generation fails
 */
export class ProofGenerationError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Proof generation failed: ${message}`, cause);
    this.name = 'ProofGenerationError';
  }
}

/**
 * Error thrown when proof verification fails
 */
export class ProofVerificationError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Proof verification failed: ${message}`, cause);
    this.name = 'ProofVerificationError';
  }
}

/**
 * Error thrown when viewing key operations fail
 */
export class ViewingKeyError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Viewing key error: ${message}`, cause);
    this.name = 'ViewingKeyError';
  }
}

/**
 * Error thrown when confidential transfer operations fail
 */
export class ConfidentialTransferError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Confidential transfer failed: ${message}`, cause);
    this.name = 'ConfidentialTransferError';
  }
}

/**
 * Error thrown when attempting to use privacy features in efficiency mode
 */
export class PrivacyModeError extends PrivacyError {
  constructor(operation: string) {
    super(
      `Cannot perform ${operation} in efficiency mode. ` +
      'Initialize SDK with privacy mode enabled to use confidential transfers.'
    );
    this.name = 'PrivacyModeError';
  }
}

/**
 * Error thrown when confidential accounts are not properly configured
 */
export class ConfidentialAccountError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Confidential account error: ${message}`, cause);
    this.name = 'ConfidentialAccountError';
  }
}

/**
 * Error thrown when compliance/auditing features fail
 */
export class ComplianceError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Compliance error: ${message}`, cause);
    this.name = 'ComplianceError';
  }
}

/**
 * Error thrown when stealth address operations fail
 */
export class StealthAddressError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`Stealth address error: ${message}`, cause);
    this.name = 'StealthAddressError';
  }
}
