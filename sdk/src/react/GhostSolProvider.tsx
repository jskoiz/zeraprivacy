/**
 * GhostSolProvider.tsx
 * 
 * Purpose: React context provider for managing SDK state in React applications
 * 
 * Dependencies:
 * - React for context and hooks
 * - Core GhostSol SDK functions
 * - Wallet adapter types
 * 
 * Exports:
 * - GhostSolProvider - React context provider component
 * - GhostSolContext - React context type
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletAdapter } from '../core/types';
import { init, getAddress, getBalance, compress, transfer, decompress, fundDevnet, isInitialized } from '../index';

/**
 * State interface for GhostSol context
 */
interface GhostSolState {
  /** User's address */
  address: string | null;
  /** Compressed balance in lamports */
  balance: number | null;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Actions interface for GhostSol context
 */
interface GhostSolActions {
  /** Compress SOL (shield) */
  compress: (amount: number) => Promise<string>;
  /** Transfer compressed tokens */
  transfer: (to: string, amount: number) => Promise<string>;
  /** Decompress SOL (unshield) */
  decompress: (amount: number, to?: string) => Promise<string>;
  /** Request devnet airdrop */
  fundDevnet: (amount?: number) => Promise<string>;
  /** Refresh balance and address */
  refresh: () => Promise<void>;
}

/**
 * Complete GhostSol context value
 */
export interface GhostSolContextValue extends GhostSolState, GhostSolActions {}

/**
 * Props for GhostSolProvider component
 */
interface GhostSolProviderProps {
  /** Wallet adapter from @solana/wallet-adapter-react */
  wallet?: WalletAdapter;
  /** Solana cluster */
  cluster?: 'devnet' | 'mainnet-beta';
  /** React children */
  children: ReactNode;
}

/**
 * Create GhostSol context
 */
export const GhostSolContext = createContext<GhostSolContextValue | null>(null);

/**
 * GhostSolProvider component for managing SDK state in React applications
 * 
 * This provider component handles:
 * - SDK initialization when wallet connects
 * - State management for address, balance, loading, and errors
 * - Action functions that automatically refresh state after completion
 * - Wallet disconnection handling
 * 
 * @param props - Component props including wallet, cluster, and children
 * @returns JSX element providing GhostSol context
 */
export function GhostSolProvider({ 
  wallet, 
  cluster = 'devnet', 
  children 
}: GhostSolProviderProps) {
  // State management
  const [state, setState] = useState<GhostSolState>({
    address: null,
    balance: null,
    loading: false,
    error: null,
  });

  /**
   * Initialize SDK when wallet connects
   */
  useEffect(() => {
    async function initializeSDK() {
      if (!wallet || !wallet.publicKey) {
        // Reset state when wallet disconnects
        setState({
          address: null,
          balance: null,
          loading: false,
          error: null,
        });
        return;
      }

      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Initialize SDK with wallet and cluster configuration
        await init({
          wallet,
          cluster,
        });

        // Get initial address and balance
        const address = getAddress();
        const balance = await getBalance();

        setState({
          address,
          balance,
          loading: false,
          error: null,
        });

      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize SDK',
        }));
      }
    }

    initializeSDK();
  }, [wallet, cluster]);

  /**
   * Refresh balance and address
   */
  const refresh = async (): Promise<void> => {
    if (!isInitialized()) {
      return;
    }

    try {
      const address = getAddress();
      const balance = await getBalance();

      setState(prev => ({
        ...prev,
        address,
        balance,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
      }));
    }
  };

  /**
   * Compress SOL with automatic state refresh
   */
  const handleCompress = async (amount: number): Promise<string> => {
    try {
      const signature = await compress(amount);
      await refresh(); // Refresh balance after successful operation
      return signature;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Compress operation failed',
      }));
      throw error;
    }
  };

  /**
   * Transfer compressed tokens with automatic state refresh
   */
  const handleTransfer = async (to: string, amount: number): Promise<string> => {
    try {
      const signature = await transfer(to, amount);
      await refresh(); // Refresh balance after successful operation
      return signature;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Transfer operation failed',
      }));
      throw error;
    }
  };

  /**
   * Decompress SOL with automatic state refresh
   */
  const handleDecompress = async (amount: number, to?: string): Promise<string> => {
    try {
      const signature = await decompress(amount, to);
      await refresh(); // Refresh balance after successful operation
      return signature;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Decompress operation failed',
      }));
      throw error;
    }
  };

  /**
   * Request devnet airdrop with automatic state refresh
   */
  const handleFundDevnet = async (amount: number = 2): Promise<string> => {
    try {
      const signature = await fundDevnet(amount);
      await refresh(); // Refresh balance after successful operation
      return signature;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Airdrop operation failed',
      }));
      throw error;
    }
  };

  // Context value combining state and actions
  const contextValue: GhostSolContextValue = {
    ...state,
    compress: handleCompress,
    transfer: handleTransfer,
    decompress: handleDecompress,
    fundDevnet: handleFundDevnet,
    refresh,
  };

  return (
    <GhostSolContext.Provider value={contextValue}>
      {children}
    </GhostSolContext.Provider>
  );
}

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
