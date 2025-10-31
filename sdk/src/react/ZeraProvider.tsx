/**
 * ZeraProvider.tsx
 * 
 * Purpose: React context provider for managing SDK state in React applications
 * 
 * Dependencies:
 * - React for context and hooks
 * - Core Zera SDK functions
 * - Wallet adapter types
 * 
 * Exports:
 * - ZeraProvider - React context provider component
 * - ZeraContext - React context type
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletAdapter } from '../core/types';
// Use a browser-only lightweight API that avoids importing privacy crypto
async function loadSdk() {
  return await import('./browserApi');
}

/**
 * State interface for Zera context
 */
interface ZeraState {
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
 * Actions interface for Zera context
 */
interface ZeraActions {
  /** Compress SOL (shield) */
  compress: (amount: number) => Promise<string>;
  /** Transfer compressed tokens */
  transfer: (to: string, amount: number) => Promise<string>;
  /** Decompress SOL (unshield) */
  decompress: (amount: number) => Promise<string>;
  /** Request devnet airdrop */
  fundDevnet: (amount?: number) => Promise<string>;
  /** Refresh balance and address */
  refresh: () => Promise<void>;
}

/**
 * Complete Zera context value
 */
export interface ZeraContextValue extends ZeraState, ZeraActions {}

/**
 * Props for ZeraProvider component
 */
interface ZeraProviderProps {
  /** Wallet adapter from @solana/wallet-adapter-react */
  wallet?: WalletAdapter;
  /** Solana cluster */
  cluster?: 'devnet' | 'mainnet-beta';
  /** React children */
  children: ReactNode;
}

/**
 * Create Zera context
 */
export const ZeraContext = createContext<ZeraContextValue | null>(null);

/**
 * ZeraProvider component for managing SDK state in React applications
 * 
 * This provider component handles:
 * - SDK initialization when wallet connects
 * - State management for address, balance, loading, and errors
 * - Action functions that automatically refresh state after completion
 * - Wallet disconnection handling
 * 
 * @param props - Component props including wallet, cluster, and children
 * @returns JSX element providing Zera context
 */
export function ZeraProvider({ 
  wallet, 
  cluster = 'devnet', 
  children 
}: ZeraProviderProps) {
  // State management
  const [state, setState] = useState<ZeraState>({
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
        const { init } = await loadSdk();
        await init({
          wallet,
          cluster,
        });

        // Get initial address and balance
        const { getAddress, getBalance } = await loadSdk();
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
    const { isInitialized } = await loadSdk();
    if (!isInitialized()) {
      return;
    }

    try {
      const { getAddress, getBalance } = await loadSdk();
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
      const { compress } = await loadSdk();
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
      const { transfer } = await loadSdk();
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
  const handleDecompress = async (amount: number): Promise<string> => {
    try {
      const { decompress } = await loadSdk();
      const signature = await decompress(amount);
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
      const { fundDevnet } = await loadSdk();
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
  const contextValue: ZeraContextValue = {
    ...state,
    compress: handleCompress,
    transfer: handleTransfer,
    decompress: handleDecompress,
    fundDevnet: handleFundDevnet,
    refresh,
  };

  return (
    <ZeraContext.Provider value={contextValue}>
      {children}
    </ZeraContext.Provider>
  );
}

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
