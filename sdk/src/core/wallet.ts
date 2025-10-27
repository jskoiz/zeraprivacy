/**
 * wallet.ts
 * 
 * Purpose: Normalize different wallet types into a unified interface
 * 
 * Dependencies:
 * - @solana/web3.js for Keypair and PublicKey
 * - @coral-xyz/anchor for wallet utilities
 * 
 * Exports:
 * - normalizeWallet() - Converts different wallet types to unified interface
 */

import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { WalletAdapter } from './types';

/**
 * Normalize different wallet types into a unified WalletAdapter interface
 * 
 * This function handles conversion from:
 * - Keypair (Node.js environments)
 * - Wallet adapter (browser environments) 
 * - Undefined (CLI environments - uses anchor.utils.wallet())
 * 
 * @param wallet - The wallet to normalize (Keypair, wallet adapter, or undefined)
 * @returns Normalized WalletAdapter interface
 * @throws GhostSolError if wallet type is unsupported or invalid
 */
export function normalizeWallet(wallet?: Keypair | WalletAdapter): WalletAdapter {
  // Handle undefined wallet (CLI environment)
  if (!wallet) {
    try {
      // Use anchor's wallet utility for CLI environments
      const anchorWallet = anchor.utils.wallet();
      return {
        publicKey: anchorWallet.publicKey,
        signTransaction: anchorWallet.signTransaction.bind(anchorWallet),
        signAllTransactions: anchorWallet.signAllTransactions.bind(anchorWallet),
        signMessage: anchorWallet.signMessage?.bind(anchorWallet)
      };
    } catch (error) {
      throw new Error(
        'No wallet provided and unable to access CLI wallet. ' +
        'Please provide a Keypair or wallet adapter.'
      );
    }
  }

  // Handle Keypair (Node.js environment)
  if (wallet instanceof Keypair) {
    return {
      publicKey: wallet.publicKey,
      signTransaction: async <T extends Transaction>(tx: T): Promise<T> => {
        tx.sign(wallet);
        return tx;
      },
      signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => {
        txs.forEach(tx => tx.sign(wallet));
        return txs;
      },
      signMessage: async (message: Uint8Array): Promise<Uint8Array> => {
        // Keypair doesn't have signMessage, so we'll implement it using signTransaction
        const fakeTx = new Transaction();
        fakeTx.add({
          keys: [],
          programId: new PublicKey('11111111111111111111111111111111'),
          data: message
        });
        fakeTx.sign(wallet);
        return fakeTx.signature!;
      }
    };
  }

  // Handle wallet adapter (browser environment)
  if (wallet && typeof wallet === 'object' && 'publicKey' in wallet) {
    // Validate that the wallet adapter has required methods
    if (!wallet.publicKey) {
      throw new Error('Wallet adapter missing publicKey property');
    }
    
    if (typeof wallet.signTransaction !== 'function') {
      throw new Error('Wallet adapter missing signTransaction method');
    }
    
    if (typeof wallet.signAllTransactions !== 'function') {
      throw new Error('Wallet adapter missing signAllTransactions method');
    }

    return wallet as WalletAdapter;
  }

  throw new Error(
    'Unsupported wallet type. Expected Keypair, wallet adapter, or undefined for CLI.'
  );
}

/**
 * Check if a wallet is connected and ready to use
 * 
 * @param wallet - The wallet to check
 * @returns True if wallet is connected and ready
 */
export function isWalletConnected(wallet?: WalletAdapter): boolean {
  if (!wallet) return false;
  
  try {
    // Check if publicKey exists and is valid
    return wallet.publicKey instanceof PublicKey && 
           !wallet.publicKey.equals(PublicKey.default);
  } catch {
    return false;
  }
}

/**
 * Get the public key as a base58 string from a wallet
 * 
 * @param wallet - The wallet to get the public key from
 * @returns Base58 encoded public key string
 * @throws Error if wallet is not connected
 */
export function getWalletAddress(wallet?: WalletAdapter): string {
  if (!isWalletConnected(wallet)) {
    throw new Error('Wallet is not connected');
  }
  
  return wallet!.publicKey.toBase58();
}

