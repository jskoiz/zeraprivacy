/**
 * index.ts
 * 
 * Purpose: Export React components and hooks for GhostSol SDK
 * 
 * Dependencies:
 * - GhostSolProvider component
 * - useGhostSol hook
 * 
 * Exports:
 * - GhostSolProvider - React context provider component
 * - useGhostSol - Hook to access GhostSol context
 */

export { GhostSolProvider } from './GhostSolProvider';
export { useGhostSol } from './useGhostSol';

// Re-export types for convenience
export type { WalletAdapter, GhostSolConfig, TransferResult, CompressedBalance } from '../core/types';
export { GhostSolError } from '../core/types';
