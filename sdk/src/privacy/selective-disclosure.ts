/**
 * privacy/selective-disclosure.ts
 *
 * Purpose: Utilities for selective disclosure of private data based on viewing key permissions.
 */

import { ViewingKeyPermissions, EncryptedBalance, EncryptedAmount } from './types';

export type DisclosurePolicy = {
  discloseCommitment?: boolean;
  discloseTimestamps?: boolean;
  discloseExistsFlag?: boolean;
};

/**
 * Redact encrypted balance fields based on policy (no decryption here).
 */
export function discloseEncryptedBalance(
  bal: EncryptedBalance,
  policy: DisclosurePolicy = { discloseCommitment: true, discloseTimestamps: true, discloseExistsFlag: true }
): Partial<EncryptedBalance> {
  return {
    commitment: policy.discloseCommitment ? bal.commitment : undefined,
    lastUpdated: policy.discloseTimestamps ? bal.lastUpdated : undefined,
    exists: policy.discloseExistsFlag ? bal.exists : undefined,
  };
}

/**
 * Filter what can be shared about an encrypted amount without revealing ciphertext.
 */
export function discloseEncryptedAmount(
  amt: EncryptedAmount,
  options: { includeCommitment?: boolean; includeRangeProof?: boolean } = { includeCommitment: true }
): Partial<EncryptedAmount> {
  return {
    commitment: options.includeCommitment ? amt.commitment : undefined,
    rangeProof: options.includeRangeProof ? amt.rangeProof : undefined,
  };
}

/**
 * Check if a given viewing key permissions object allows disclosure of a category.
 */
export function canDisclose(
  perms: ViewingKeyPermissions,
  category: 'balances' | 'amounts' | 'metadata'
): boolean {
  if (category === 'balances') return !!perms.canViewBalances;
  if (category === 'amounts') return !!perms.canViewAmounts;
  return !!perms.canViewMetadata;
}
