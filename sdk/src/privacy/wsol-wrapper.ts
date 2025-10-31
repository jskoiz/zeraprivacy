/**
 * privacy/wsol-wrapper.ts
 * 
 * Purpose: wSOL wrapper utilities for native SOL privacy
 * 
 * This module provides utilities to wrap/unwrap native SOL to/from wSOL,
 * enabling native SOL to be used with confidential transfers. Users should
 * never see "wSOL" in the UX - this is purely infrastructure.
 * 
 * Key Features:
 * - Wrap native SOL → wSOL (automatic account creation)
 * - Unwrap wSOL → native SOL (automatic cleanup)
 * - Account management (no orphaned accounts)
 * - Balance queries
 */

import { 
  Connection, 
  PublicKey, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import { PrivacyError } from './errors';

/**
 * Wallet adapter interface for wSOL operations
 */
interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}

/**
 * Result of a wSOL wrap operation
 */
export interface WrapResult {
  /** wSOL account address */
  wsolAccount: PublicKey;
  /** Transaction signature */
  signature: string;
  /** Amount wrapped in lamports */
  amount: number;
}

/**
 * Result of a wSOL unwrap operation
 */
export interface UnwrapResult {
  /** Transaction signature */
  signature: string;
  /** Amount unwrapped in lamports */
  amount: number;
}

/**
 * Error thrown when wSOL operations fail
 */
export class WsolWrapperError extends PrivacyError {
  constructor(message: string, cause?: Error) {
    super(`wSOL wrapper error: ${message}`, cause);
    this.name = 'WsolWrapperError';
  }
}

/**
 * WsolWrapper class for managing native SOL wrapping/unwrapping
 * 
 * Enables native SOL privacy by automatically wrapping/unwrapping SOL to/from wSOL.
 * All account management is handled internally - users never see "wSOL" in the UX.
 */
export class WsolWrapper {
  private connection: Connection;
  private wallet: WalletAdapter;

  /**
   * Create a new WsolWrapper instance
   * 
   * @param connection - Solana connection
   * @param wallet - Wallet adapter with signing capabilities
   */
  constructor(connection: Connection, wallet: WalletAdapter) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Wrap native SOL → wSOL
   * 
   * This method:
   * 1. Creates wSOL associated token account (if needed)
   * 2. Transfers SOL to the account
   * 3. Syncs native (converts SOL to wSOL tokens)
   * 
   * @param amountLamports - Amount of SOL to wrap in lamports
   * @returns Wrap result with wSOL account address and transaction signature
   * @throws WsolWrapperError if wrapping fails
   */
  async wrapSol(amountLamports: number): Promise<WrapResult> {
    try {
      if (amountLamports <= 0) {
        throw new WsolWrapperError('Amount must be greater than 0');
      }

      // Get or create wSOL associated token account
      const wsolAccount = await this.getOrCreateWsolAccount();

      // Build transaction
      const transaction = new Transaction();

      // Transfer SOL to wSOL account
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: wsolAccount,
          lamports: amountLamports,
        })
      );

      // Sync native (converts SOL to wSOL)
      transaction.add(
        createSyncNativeInstruction(wsolAccount)
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      // Sign and send transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Confirm transaction
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return {
        wsolAccount,
        signature,
        amount: amountLamports,
      };
    } catch (error) {
      throw new WsolWrapperError(
        `Failed to wrap SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Unwrap wSOL → native SOL
   * 
   * This method closes the wSOL account, which automatically returns the SOL
   * to the wallet. This is the standard way to unwrap wSOL.
   * 
   * @param wsolAccount - wSOL account to unwrap (optional, uses default if not provided)
   * @returns Unwrap result with transaction signature
   * @throws WsolWrapperError if unwrapping fails
   */
  async unwrapSol(wsolAccount?: PublicKey): Promise<UnwrapResult> {
    try {
      // Get wSOL account address
      const accountToClose = wsolAccount || await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      // Get current balance before unwrapping
      const balance = await this.getWsolBalance(accountToClose);

      // Build transaction to close wSOL account
      const transaction = new Transaction().add(
        createCloseAccountInstruction(
          accountToClose,
          this.wallet.publicKey, // Destination for SOL
          this.wallet.publicKey  // Authority
        )
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      // Sign and send transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Confirm transaction
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return {
        signature,
        amount: balance,
      };
    } catch (error) {
      throw new WsolWrapperError(
        `Failed to unwrap SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get or create wSOL associated token account
   * 
   * Returns existing wSOL account or creates a new one if it doesn't exist.
   * Uses associated token account (ATA) for deterministic addresses.
   * 
   * @returns wSOL account public key
   * @throws WsolWrapperError if account creation fails
   */
  async getOrCreateWsolAccount(): Promise<PublicKey> {
    try {
      const wsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      // Check if account exists
      try {
        await getAccount(this.connection, wsolAccount);
        // Account exists, return it
        return wsolAccount;
      } catch (error) {
        // Account doesn't exist, create it
        if (error instanceof TokenAccountNotFoundError) {
          const transaction = new Transaction().add(
            createAssociatedTokenAccountInstruction(
              this.wallet.publicKey,  // Payer
              wsolAccount,             // Associated token account
              this.wallet.publicKey,  // Owner
              NATIVE_MINT             // Mint
            )
          );

          // Get recent blockhash
          const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = this.wallet.publicKey;

          // Sign and send transaction
          const signedTx = await this.wallet.signTransaction(transaction);
          await this.connection.sendRawTransaction(signedTx.serialize());

          // Wait for confirmation
          await this.connection.confirmTransaction({
            signature: await this.connection.sendRawTransaction(signedTx.serialize()),
            blockhash,
            lastValidBlockHeight,
          });

          return wsolAccount;
        }
        throw error;
      }
    } catch (error) {
      throw new WsolWrapperError(
        `Failed to get or create wSOL account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if an account is a wSOL account
   * 
   * @param account - Account public key to check
   * @returns True if account is a wSOL account, false otherwise
   */
  async isWsolAccount(account: PublicKey): Promise<boolean> {
    try {
      const accountInfo = await getAccount(this.connection, account);
      return accountInfo.mint.equals(NATIVE_MINT);
    } catch (error) {
      // Account doesn't exist or is not a token account
      return false;
    }
  }

  /**
   * Get wSOL balance for an account
   * 
   * @param account - wSOL account public key (optional, uses default if not provided)
   * @returns Balance in lamports
   * @throws WsolWrapperError if balance query fails
   */
  async getWsolBalance(account?: PublicKey): Promise<number> {
    try {
      const wsolAccount = account || await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      try {
        const accountInfo = await getAccount(this.connection, wsolAccount);
        return Number(accountInfo.amount);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          return 0;
        }
        throw error;
      }
    } catch (error) {
      throw new WsolWrapperError(
        `Failed to get wSOL balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close empty wSOL accounts
   * 
   * Cleanup utility to close empty wSOL accounts and recover rent.
   * This prevents orphaned accounts and reduces rent costs.
   * 
   * @returns Array of transaction signatures for closed accounts
   * @throws WsolWrapperError if cleanup fails
   */
  async closeEmptyWsolAccounts(): Promise<string[]> {
    try {
      const signatures: string[] = [];
      
      // Get the default wSOL associated token account
      const wsolAccount = await getAssociatedTokenAddress(
        NATIVE_MINT,
        this.wallet.publicKey
      );

      // Check if account exists and is empty
      try {
        const balance = await this.getWsolBalance(wsolAccount);
        
        if (balance === 0) {
          // Close the empty account
          const result = await this.unwrapSol(wsolAccount);
          signatures.push(result.signature);
        }
      } catch (error) {
        // Account doesn't exist, nothing to close
        if (error instanceof TokenAccountNotFoundError) {
          return signatures;
        }
        throw error;
      }

      return signatures;
    } catch (error) {
      throw new WsolWrapperError(
        `Failed to close empty wSOL accounts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the native SOL balance (not wSOL)
   * 
   * Helper method to check native SOL balance before wrapping
   * 
   * @returns Balance in lamports
   */
  async getNativeSolBalance(): Promise<number> {
    return await this.connection.getBalance(this.wallet.publicKey);
  }

  /**
   * Convert lamports to SOL for display
   * 
   * @param lamports - Amount in lamports
   * @returns Amount in SOL
   */
  static lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Convert SOL to lamports
   * 
   * @param sol - Amount in SOL
   * @returns Amount in lamports
   */
  static solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
  }
}
