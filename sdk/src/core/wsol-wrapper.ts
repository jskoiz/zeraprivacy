/**
 * wsol-wrapper.ts
 * 
 * Purpose: Handle wrapping/unwrapping of native SOL to/from wSOL (Wrapped SOL)
 * 
 * This class provides a transparent abstraction for converting native SOL to wSOL
 * and back, which is necessary for using native SOL with SPL Token 2022 
 * Confidential Transfers (which only support SPL tokens, not native SOL).
 * 
 * Key Features:
 * - Wrap native SOL → wSOL for privacy operations
 * - Unwrap wSOL → native SOL after withdrawals
 * - Automatic cleanup of wSOL accounts (no orphans)
 * - Transaction batching for efficiency
 */

import { 
  Connection, 
  PublicKey, 
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createInitializeAccountInstruction,
  createCloseAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { ExtendedWalletAdapter } from './types';
import { GhostSolError } from './errors';

/**
 * WsolWrapper handles all wSOL operations transparently
 * Users interact with "SOL" while the SDK handles wSOL behind the scenes
 */
export class WsolWrapper {
  private connection: Connection;
  private wallet: ExtendedWalletAdapter;

  constructor(connection: Connection, wallet: ExtendedWalletAdapter) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Wrap native SOL into wSOL
   * 
   * @param amountLamports - Amount of SOL to wrap in lamports
   * @returns PublicKey of the wSOL account
   */
  async wrapSol(amountLamports: number): Promise<PublicKey> {
    try {
      // Get or create associated token account for wSOL
      const wsolAccount = await this.getOrCreateWsolAccount();

      // Create transaction to wrap SOL
      const transaction = new Transaction();

      // Transfer SOL to the wSOL account
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: wsolAccount,
          lamports: amountLamports
        })
      );

      // Sync native (this converts the SOL to wSOL tokens)
      transaction.add(
        createSyncNativeInstruction(wsolAccount)
      );

      // Send and confirm transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.wallet.rawKeypair!],
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      return wsolAccount;

    } catch (error) {
      throw new GhostSolError(
        `Failed to wrap SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WSOL_WRAP_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Unwrap wSOL back to native SOL
   * 
   * @param wsolAccount - The wSOL account to unwrap (optional, uses default if not provided)
   * @returns Transaction signature
   */
  async unwrapSol(wsolAccount?: PublicKey): Promise<string> {
    try {
      const accountToClose = wsolAccount || await this.getOrCreateWsolAccount();

      // Create transaction to unwrap (close account returns SOL)
      const transaction = new Transaction();

      // Close the wSOL account, which returns the SOL to the owner
      transaction.add(
        createCloseAccountInstruction(
          accountToClose,
          this.wallet.publicKey,
          this.wallet.publicKey
        )
      );

      // Send and confirm transaction
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.wallet.rawKeypair!],
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;

    } catch (error) {
      throw new GhostSolError(
        `Failed to unwrap SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WSOL_UNWRAP_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get or create the wSOL associated token account
   * 
   * @returns PublicKey of the wSOL account
   */
  async getOrCreateWsolAccount(): Promise<PublicKey> {
    try {
      // Calculate the associated token address for wSOL
      const wsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      // Check if account exists
      try {
        await getAccount(this.connection, wsolAccount);
        // Account exists, return it
        return wsolAccount;
      } catch {
        // Account doesn't exist, create it
        const transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            this.wallet.publicKey,
            wsolAccount,
            this.wallet.publicKey,
            NATIVE_MINT
          )
        );

        const signature = await this.connection.sendTransaction(
          transaction,
          [this.wallet.rawKeypair!],
          { skipPreflight: false }
        );

        await this.connection.confirmTransaction(signature, 'confirmed');

        return wsolAccount;
      }

    } catch (error) {
      throw new GhostSolError(
        `Failed to get or create wSOL account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WSOL_ACCOUNT_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the wSOL balance for the user
   * 
   * @returns Balance in lamports
   */
  async getWsolBalance(): Promise<number> {
    try {
      const wsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      try {
        const account = await getAccount(this.connection, wsolAccount);
        return Number(account.amount);
      } catch {
        // Account doesn't exist, balance is 0
        return 0;
      }

    } catch (error) {
      throw new GhostSolError(
        `Failed to get wSOL balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WSOL_BALANCE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if wSOL account exists
   * 
   * @returns True if wSOL account exists
   */
  async wsolAccountExists(): Promise<boolean> {
    try {
      const wsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      try {
        await getAccount(this.connection, wsolAccount);
        return true;
      } catch {
        return false;
      }

    } catch {
      return false;
    }
  }

  /**
   * Clean up any orphaned wSOL accounts
   * This should be called after operations to ensure no wSOL is left behind
   * 
   * @returns Transaction signature if cleanup was performed, null if nothing to clean
   */
  async cleanupWsolAccounts(): Promise<string | null> {
    try {
      const wsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      try {
        const account = await getAccount(this.connection, wsolAccount);
        
        // If account has a balance, close it to return SOL to user
        if (account.amount > 0n) {
          return await this.unwrapSol(wsolAccount);
        }
        
        // If account exists but is empty, close it anyway
        const transaction = new Transaction().add(
          createCloseAccountInstruction(
            wsolAccount,
            this.wallet.publicKey,
            this.wallet.publicKey
          )
        );

        const signature = await this.connection.sendTransaction(
          transaction,
          [this.wallet.rawKeypair!],
          { skipPreflight: false }
        );

        await this.connection.confirmTransaction(signature, 'confirmed');
        
        return signature;

      } catch {
        // No account to clean up
        return null;
      }

    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to cleanup wSOL accounts:', error);
      return null;
    }
  }

  /**
   * Batch wrap + another operation in a single transaction
   * This is an optimization to reduce transaction count and fees
   * 
   * @param amountLamports - Amount to wrap
   * @param additionalInstructions - Additional instructions to include in transaction
   * @returns Transaction signature
   */
  async wrapSolBatched(
    amountLamports: number,
    additionalInstructions: Transaction[]
  ): Promise<string> {
    try {
      const wsolAccount = await this.getOrCreateWsolAccount();

      const transaction = new Transaction();

      // Add wrap instructions
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: wsolAccount,
          lamports: amountLamports
        })
      );

      transaction.add(
        createSyncNativeInstruction(wsolAccount)
      );

      // Add additional instructions
      additionalInstructions.forEach(tx => {
        tx.instructions.forEach(ix => transaction.add(ix));
      });

      // Send and confirm
      const signature = await this.connection.sendTransaction(
        transaction,
        [this.wallet.rawKeypair!],
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;

    } catch (error) {
      throw new GhostSolError(
        `Failed to batch wrap SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WSOL_BATCH_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}
