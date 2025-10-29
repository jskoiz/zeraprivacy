/**
 * zk-circuits/interfaces.ts
 *
 * Purpose: Structured interfaces for ZK proof contracts and range-proof APIs.
 */

import type { ZKProof } from '../types';

/**
 * Generic contract for ZK proof generation and verification.
 */
export interface ZKProofContract<PublicInput = Uint8Array[]> {
  /** Short identifier for the circuit (e.g., transfer_v1) */
  readonly circuitId: string;
  /** Proof system used (placeholder today) */
  readonly proofSystem: ZKProof['proofSystem'];

  /** Build a proof for given public/private inputs (shape left abstract). */
  generate(inputs: Record<string, unknown>): Promise<ZKProof>;

  /** Verify a proof against expected public inputs. */
  verify(proof: ZKProof, expectedPublicInputs: PublicInput): Promise<boolean>;
}

/**
 * Range proof specific inputs.
 */
export interface RangeProofInputs {
  /** 64-bit amount as bigint */
  amount: bigint;
  /** Pedersen commitment C to the amount */
  commitment: Uint8Array;
  /** Sender-held randomness used in commitment/encryption */
  randomness?: Uint8Array;
  /** Optional: maximum allowed amount bound 2^k */
  maxBoundBits?: number; // default 64
}

/**
 * Contract for building/validating range proofs.
 */
export interface RangeProofContract extends ZKProofContract<Uint8Array[]> {
  /** Construct a standalone range proof byte array placeholder. */
  buildProofBytes(inputs: RangeProofInputs): Promise<Uint8Array>;
  /** Lightweight validator for placeholder range proofs. */
  verifyProofBytes(proof: Uint8Array, commitment: Uint8Array): Promise<boolean>;
}

/**
 * Minimal metadata carried alongside placeholder proofs for swap-ability.
 */
export interface ProofPlaceholderMetadata {
  /** Marker to indicate placeholder, not production ZK proof. */
  readonly placeholder: true;
  /** Circuit version tag for forward compatibility. */
  readonly circuitVersion: string;
}
