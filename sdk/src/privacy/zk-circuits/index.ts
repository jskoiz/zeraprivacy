/**
 * zk-circuits/index.ts
 *
 * Purpose: Public exports for ZK circuit contracts and range-proof stubs.
 */

export type { ZKProofContract, RangeProofContract, ProofPlaceholderMetadata } from './interfaces';
export { RangeProofBuilder, RangeProofVerifier } from './range-proof';
export { NoopZkContract } from './noop-contract';
