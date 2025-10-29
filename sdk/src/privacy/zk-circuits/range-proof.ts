/**
 * zk-circuits/range-proof.ts
 *
 * Purpose: Range proof builder/validator stubs returning structured placeholders.
 */

import { sha256 } from '@noble/hashes/sha256';
import type { ZKProof } from '../types';
import type { ProofPlaceholderMetadata, RangeProofContract, RangeProofInputs } from './interfaces';

const PLACEHOLDER_VERSION = 'range_v1_placeholder';

/**
 * Deterministic placeholder bytes derived from the commitment, with a bind check.
 * This ensures consistency with simple verifiers and predictability in tests.
 */
function derivePlaceholderBytes(commitment: Uint8Array, size = 128): Uint8Array {
  const out = new Uint8Array(size);
  // Bind to commitment via first-byte check used by the verifier
  const digest = sha256(commitment);
  // Fill with pseudo-random expansion seeded by digest
  for (let i = 0; i < out.length; i++) {
    out[i] = digest[i % digest.length] ^ ((i * 31) & 0xff);
  }
  // Preserve the binding property: first byte equals digest[0]
  out[0] = digest[0];
  return out;
}

export class RangeProofBuilder implements RangeProofContract {
  readonly circuitId = 'range64';
  readonly proofSystem: ZKProof['proofSystem'] = 'groth16';

  async generate(inputs: Record<string, unknown>): Promise<ZKProof> {
    const { commitment } = inputs as unknown as RangeProofInputs;
    const proofBytes = derivePlaceholderBytes(commitment);
    const publicInputs = [commitment];
    return {
      proof: proofBytes,
      publicInputs,
      proofSystem: this.proofSystem,
      circuitHash: this.circuitId,
    };
  }

  async verify(proof: ZKProof, expectedPublicInputs: Uint8Array[]): Promise<boolean> {
    const commitment = expectedPublicInputs[0];
    return this.verifyProofBytes(proof.proof, commitment);
  }

  async buildProofBytes(inputs: RangeProofInputs): Promise<Uint8Array> {
    return derivePlaceholderBytes(inputs.commitment);
  }

  async verifyProofBytes(proof: Uint8Array, commitment: Uint8Array): Promise<boolean> {
    const digest = sha256(commitment);
    return proof.length >= 32 && proof[0] === digest[0];
  }
}

/**
 * Placeholder metadata helper for downstream callers.
 */
export function rangeProofPlaceholderMetadata(): ProofPlaceholderMetadata {
  return { placeholder: true, circuitVersion: PLACEHOLDER_VERSION } as const;
}
