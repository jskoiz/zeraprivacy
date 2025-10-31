/**
 * useZera.ts
 * 
 * Purpose: Hook to access Zera context
 * 
 * Dependencies:
 * - React for useContext hook
 * - ZeraProvider for context access
 * 
 * Exports:
 * - useZera - Hook to access Zera context
 */

import { useContext } from 'react';
import { ZeraContext, ZeraContextValue } from './ZeraProvider';

/**
 * Hook to access Zera context
 * 
 * This hook provides access to the Zera context value including
 * state (address, balance, loading, error) and actions (compress, transfer, etc.).
 * 
 * @returns Zera context value
 * @throws Error if used outside ZeraProvider
 */
export function useZera(): ZeraContextValue {
  const context = useContext(ZeraContext);
  
  if (!context) {
    throw new Error(
      'useZera must be used within a ZeraProvider. ' +
      'Make sure to wrap your component tree with <ZeraProvider>.'
    );
  }
  
  return context;
}
