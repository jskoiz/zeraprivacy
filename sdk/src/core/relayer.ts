/**
 * relayer.ts
 * 
 * Purpose: Implement TestRelayer for fee payment using user's wallet
 * 
 * Dependencies:
 * - @solana/web3.js for Transaction and Connection
 * - WalletAdapter for signing transactions
 * 
 * Exports:
 * - createTestRelayer() - Creates TestRelayer using user's wallet as fee payer
 */

import { Transaction, TransactionSignature, Connection } from '@solana/web3.js';
import { WalletAdapter } from './types';

/**
 * TestRelayer interface for handling transaction submission
 * 
 * This interface abstracts the relayer functionality, allowing for easy
 * swapping between test relayers and production relayers
 */
export interface Relayer {
  /** Submit a transaction and return the signature */
  submitTransaction(tx: Transaction): Promise<TransactionSignature>;
  /** Get the relayer's public key for fee payment */
  getPublicKey(): string;
  /** Check if relayer is ready */
  isReady(): boolean;
}

/**
 * TestRelayer implementation that uses the user's wallet as fee payer
 * 
 * This is suitable for demonstration purposes but offers less privacy
 * than external relayers since the user pays their own fees.
 * 
 * For production use, this should be replaced with an external relayer service.
 */
export class TestRelayer implements Relayer {
  private wallet: WalletAdapter;
  private connection: Connection;
  private feeLamports: number;

  constructor(wallet: WalletAdapter, connection: Connection, feeLamports: number = 100000) {
    this.wallet = wallet;
    this.connection = connection;
    this.feeLamports = feeLamports;
  }

  /**
   * Submit a transaction using the user's wallet as fee payer
   * 
   * This method signs and sends the transaction, with the user's wallet
   * paying the transaction fees. This is suitable for testing but reduces
   * privacy since the user's address is visible on-chain.
   * 
   * @param tx - The transaction to submit
   * @returns Promise resolving to transaction signature
   * @throws Error if transaction submission fails
   */
  async submitTransaction(tx: Transaction): Promise<TransactionSignature> {
    try {
      // Set recent blockhash for transaction
      const { blockhash } = await this.connection.getRecentBlockhash();
      tx.recentBlockhash = blockhash;
      
      // Set fee payer to user's wallet
      tx.feePayer = this.wallet.publicKey;
      
      // Sign the transaction with user's wallet
      const signedTx = await this.wallet.signTransaction(tx);
      
      // Send the transaction
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        }
      );
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      return signature;
      
    } catch (error) {
      throw new Error(
        `Failed to submit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get the relayer's public key (user's wallet in this case)
   * 
   * @returns Base58 encoded public key string
   */
  getPublicKey(): string {
    return this.wallet.publicKey.toBase58();
  }

  /**
   * Check if the relayer is ready to submit transactions
   * 
   * @returns True if relayer is ready
   */
  isReady(): boolean {
    return this.wallet.publicKey !== null;
  }

  /**
   * Get the fee amount in lamports
   * 
   * @returns Fee amount in lamports
   */
  getFeeAmount(): number {
    return this.feeLamports;
  }
}

/**
 * Create a TestRelayer instance using the user's wallet as fee payer
 * 
 * This function creates a TestRelayer that uses the provided wallet
 * to pay transaction fees. This is suitable for demonstration and
 * testing purposes.
 * 
 * @param wallet - The wallet to use as fee payer
 * @param connection - Solana connection for transaction submission
 * @param feeLamports - Fee amount in lamports (default: 100,000)
 * @returns Configured TestRelayer instance
 * @throws Error if wallet or connection is invalid
 */
export function createTestRelayer(
  wallet: WalletAdapter,
  connection: Connection,
  feeLamports: number = 100000
): TestRelayer {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet is required for TestRelayer');
  }
  
  if (!connection) {
    throw new Error('Connection is required for TestRelayer');
  }
  
  if (feeLamports < 0) {
    throw new Error('Fee amount must be non-negative');
  }
  
  return new TestRelayer(wallet, connection, feeLamports);
}

/**
 * Refresh blockhash in the background to maintain transaction validity
 * 
 * This function should be called periodically to ensure transactions
 * don't expire due to stale blockhashes.
 * 
 * @param connection - Solana connection
 * @returns Promise resolving to recent blockhash
 */
export async function refreshBlockhash(connection: Connection): Promise<string> {
  try {
    const { blockhash } = await connection.getRecentBlockhash();
    return blockhash;
  } catch (error) {
    throw new Error(
      `Failed to refresh blockhash: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

