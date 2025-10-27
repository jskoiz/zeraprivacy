/**
 * compression.ts
 * 
 * Purpose: Core module for ZK Compression operations
 * 
 * This module provides the low-level functions for interacting with
 * ZK Compression APIs, handling the actual compress/transfer/decompress
 * operations with proper error handling and retry logic.
 * 
 * Dependencies:
 * - @solana/web3.js for PublicKey and Connection types
 * - Core types for WalletAdapter interface
 * - Core errors module for specific error types
 * 
 * Exports:
 * - CompressionConfig - Configuration for compression operations
 * - CompressionResult - Result of compression operations
 * - compressTokens() - Compress SOL to compressed token account
 * - transferCompressedTokens() - Transfer compressed tokens privately
 * - decompressTokens() - Decompress tokens back to regular account
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { compress, transfer, decompress, Rpc } from '@lightprotocol/stateless.js';
import { WalletAdapter } from './types';
import { CompressionError, TransferError, DecompressionError } from './errors';

/**
 * Configuration for compression operations
 * 
 * This interface encapsulates all the dependencies needed for
 * compression operations, including RPC connection, wallet, and
 * Solana connection.
 */
export interface CompressionConfig {
  /** ZK Compression RPC instance for compressed operations */
  rpc: Rpc;
  /** Wallet adapter for signing transactions */
  wallet: WalletAdapter;
  /** Solana connection for blockchain operations */
  connection: Connection;
}

/**
 * Result of a compression operation
 * 
 * Contains all relevant information about the compression
 * operation, including signature and execution details.
 */
export interface CompressionResult {
  /** Transaction signature */
  signature: string;
  /** Amount compressed in lamports */
  amount: number;
  /** Public key of the compressed account (if applicable) */
  compressedAccount?: PublicKey;
  /** Block height when transaction was confirmed */
  blockHeight?: number;
}

/**
 * Compress SOL into compressed token account
 * 
 * This function performs the actual compression operation using
 * ZK Compression APIs. It handles state tree selection, lookup table
 * management, and poseidon hasher initialization.
 * 
 * Implementation Note: This is currently a skeleton implementation.
 * Research is needed on the actual @lightprotocol/compressed-token API
 * to determine the correct function signatures and parameters.
 * 
 * @param config - Compression configuration with RPC, wallet, connection
 * @param lamports - Amount to compress in lamports
 * @returns Promise resolving to compression result with signature
 * @throws CompressionError if compression fails
 * 
 * @example
 * const result = await compressTokens(config, 1000000000); // 1 SOL
 * console.log('Compression signature:', result.signature);
 */
export async function compressTokens(
  config: CompressionConfig,
  lamports: number
): Promise<CompressionResult> {
  try {
    // Use stateless.js compress() function for SOL compression
    // The payer and recipient are both the user's wallet
    // StateTreeInfo is optional and will be auto-selected if not provided
    const signature = await compress(
      config.rpc,
      config.wallet,
      lamports,
      config.wallet.publicKey
      // outputStateTreeInfo is optional - auto-selected if not provided
      // confirmOptions uses defaults
    );
    
    return {
      signature,
      amount: lamports,
      compressedAccount: config.wallet.publicKey,
      // blockHeight will be set by the confirmation process
    };
    
  } catch (error) {
    throw new CompressionError(
      `Failed to compress ${lamports} lamports: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Transfer compressed tokens between accounts
 * 
 * This function handles private transfers using ZK proofs to maintain
 * transaction privacy while ensuring validity.
 * 
 * Implementation Note: This is currently a skeleton implementation.
 * Research is needed on the actual transfer API to determine the
 * correct function signatures and parameters.
 * 
 * @param config - Compression configuration
 * @param recipient - Recipient's public key
 * @param lamports - Amount to transfer in lamports
 * @returns Promise resolving to transfer result with signature
 * @throws TransferError if transfer fails
 * 
 * @example
 * const recipient = new PublicKey('...');
 * const result = await transferCompressedTokens(config, recipient, 500000000); // 0.5 SOL
 * console.log('Transfer signature:', result.signature);
 */
export async function transferCompressedTokens(
  config: CompressionConfig,
  recipient: PublicKey,
  lamports: number
): Promise<CompressionResult> {
  try {
    // Use stateless.js transfer() function for private transfers
    // Owner and payer are both the user's wallet
    // StateTreeInfo is optional and will be auto-selected if not provided
    const signature = await transfer(
      config.rpc,
      config.wallet, // payer
      lamports,
      config.wallet, // owner
      recipient
      // outputStateTreeInfo is optional - auto-selected if not provided
      // confirmOptions uses defaults
    );
    
    return {
      signature,
      amount: lamports,
      compressedAccount: recipient,
      // blockHeight will be set by the confirmation process
    };
    
  } catch (error) {
    throw new TransferError(
      `Failed to transfer ${lamports} lamports to ${recipient.toBase58()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress tokens from compressed account to regular account
 * 
 * This function handles the unshield operation, moving tokens from
 * the compressed token account back to a regular Solana account.
 * 
 * Implementation Note: This is currently a skeleton implementation.
 * Research is needed on the actual decompress API to determine the
 * correct function signatures and parameters.
 * 
 * @param config - Compression configuration
 * @param lamports - Amount to decompress in lamports
 * @param destination - Optional destination public key (defaults to wallet)
 * @returns Promise resolving to decompression result with signature
 * @throws DecompressionError if decompression fails
 * 
 * @example
 * const result = await decompressTokens(config, 1000000000); // Decompress 1 SOL
 * console.log('Decompression signature:', result.signature);
 * 
 * // Decompress to specific address
 * const destPubkey = new PublicKey('...');
 * const result2 = await decompressTokens(config, 1000000000, destPubkey);
 */
export async function decompressTokens(
  config: CompressionConfig,
  lamports: number,
  destination?: PublicKey
): Promise<CompressionResult> {
  try {
    // Use stateless.js decompress() function to move SOL back to regular account
    // Use provided destination or default to user's wallet
    const destPubkey = destination || config.wallet.publicKey;
    
    const signature = await decompress(
      config.rpc,
      config.wallet, // payer
      lamports,
      destPubkey // recipient
      // confirmOptions uses defaults
    );
    
    return {
      signature,
      amount: lamports,
      compressedAccount: destPubkey,
      // blockHeight will be set by the confirmation process
    };
    
  } catch (error) {
    throw new DecompressionError(
      `Failed to decompress ${lamports} lamports to ${(destination || config.wallet.publicKey).toBase58()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}
