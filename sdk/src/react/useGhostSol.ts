/**
 * useGhostSol.ts
 * 
 * Purpose: Hook to access GhostSol context
 * 
 * Dependencies:
 * - React for useContext hook
 * - GhostSolProvider for context access
 * 
 * Exports:
 * - useGhostSol - Hook to access GhostSol context
 */

import { useContext } from 'react';
import { GhostSolContext, GhostSolContextValue } from './GhostSolProvider';

/**
 * Hook to access GhostSol context
 * 
 * This hook provides access to the GhostSol context value including
 * state (address, balance, loading, error) and actions (compress, transfer, etc.).
 * 
 * @returns GhostSol context value
 * @throws Error if used outside GhostSolProvider
 */
export function useGhostSol(): GhostSolContextValue {
  const context = useContext(GhostSolContext);
  
  if (!context) {
    throw new Error(
      'useGhostSol must be used within a GhostSolProvider. ' +
      'Make sure to wrap your component tree with <GhostSolProvider>.'
    );
  }
  
  return context;
}
