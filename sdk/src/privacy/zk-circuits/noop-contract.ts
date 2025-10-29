/**
 * zk-circuits/noop-contract.ts
 *
 * Purpose: No-op ZK contract stub to serve as a drop-in for future circuits.
 */

import type { ZKProof } from '../types';
import type { ZKProofContract } from './interfaces';

export class NoopZkContract implements ZKProofContract<Uint8Array[]> {
  readonly circuitId: string;
  readonly proofSystem: ZKProof['proofSystem'] = 'groth16';

  constructor(circuitId = 'noop_circuit') {
    this.circuitId = circuitId;
  }

  async generate(_inputs: Record<string, unknown>): Promise<ZKProof> {
    return {
      proof: new Uint8Array(0),
      publicInputs: [],
      proofSystem: this.proofSystem,
      circuitHash: this.circuitId,
    };
  }

  async verify(_proof: ZKProof, _expectedPublicInputs: Uint8Array[]): Promise<boolean> {
    return true;
  }
}
