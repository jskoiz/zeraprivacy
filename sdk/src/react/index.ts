/**
 * index.ts
 * 
 * Purpose: Export React components and hooks for Zera SDK
 * 
 * Dependencies:
 * - ZeraProvider component
 * - useZera hook
 * 
 * Exports:
 * - ZeraProvider - React context provider component
 * - useZera - Hook to access Zera context
 */

export { ZeraProvider } from './ZeraProvider';
export { useZera } from './useZera';

// Re-export types for convenience
export type { WalletAdapter, ExtendedWalletAdapter, ZeraConfig, TransferResult, CompressedBalance } from '../core/types';
export { 
  ZeraError, 
  CompressionError, 
  TransferError, 
  DecompressionError,
  ValidationError,
  RpcError 
} from '../core/errors';
