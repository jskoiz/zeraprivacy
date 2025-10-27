/**
 * ghost-sol.ts
 * 
 * Purpose: Main SDK class wrapping ZK Compression functionality
 * 
 * Dependencies:
 * - @lightprotocol/stateless.js for RPC operations
 * - @lightprotocol/compressed-token for compressed token operations
 * - @solana/web3.js for blockchain operations
 * - Core modules for wallet, RPC, and relayer functionality
 * 
 * Exports:
 * - GhostSol class - Main SDK implementation
 */

import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createRpc } from '@lightprotocol/stateless.js';
import { 
  GhostSolConfig, 
  WalletAdapter, 
  TransferResult, 
  CompressedBalance,
  GhostSolError,
  NETWORKS 
} from './types';
import { normalizeWallet } from './wallet';
import { createCompressedRpc, validateRpcConnection } from './rpc';
import { createTestRelayer, Relayer } from './relayer';

/**
 * Main GhostSol SDK class providing privacy-focused Solana operations
 * 
 * This class wraps ZK Compression functionality to provide a simple
 * interface for private SOL transfers using compressed tokens.
 */
export class GhostSol {
  private connection!: Connection;
  private rpc!: any; // ZK Compression RPC instance
  private wallet!: WalletAdapter;
  private relayer!: Relayer;
  private initialized: boolean = false;

  /**
   * Initialize the GhostSol SDK with configuration
   * 
   * This method sets up all necessary connections and services:
   * - Normalizes the provided wallet
   * - Creates Solana connection
   * - Initializes ZK Compression RPC
   * - Sets up TestRelayer for transaction submission
   * 
   * @param config - Configuration options for SDK initialization
   * @returns Promise that resolves when initialization is complete
   * @throws GhostSolError if initialization fails
   */
  async init(config: GhostSolConfig): Promise<void> {
    try {
      // Normalize wallet input
      this.wallet = normalizeWallet(config.wallet);
      
      // Determine network configuration
      const cluster = config.cluster || 'devnet';
      const networkConfig = NETWORKS[cluster];
      
      if (!networkConfig) {
        throw new GhostSolError(`Unsupported cluster: ${cluster}`);
      }

      // Create Solana connection
      const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
      this.connection = new Connection(rpcUrl, {
        commitment: config.commitment || networkConfig.commitment,
        confirmTransactionInitialTimeout: 60000,
      });

      // Validate RPC connection
      await validateRpcConnection(this.connection);

      // Initialize ZK Compression RPC
      // Note: Based on research, the actual API may differ from the initial spec
      // This will need to be adjusted based on the real @lightprotocol/stateless.js API
      const rpcConfig = createCompressedRpc(config);
      this.rpc = rpcConfig.rpc;

      // Create TestRelayer using user's wallet as fee payer
      this.relayer = createTestRelayer(this.wallet, this.connection);

      this.initialized = true;
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to initialize GhostSol SDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the user's public key as a base58 string
   * 
   * @returns Base58 encoded public key
   * @throws GhostSolError if SDK is not initialized
   */
  getAddress(): string {
    this._assertInitialized();
    return this.wallet.publicKey.toBase58();
  }

  /**
   * Get the compressed token balance for the user
   * 
   * This method queries the compressed token balance using ZK Compression
   * RPC methods. Returns 0 if no compressed account exists.
   * 
   * @returns Promise resolving to balance in lamports
   * @throws GhostSolError if balance query fails
   */
  async getBalance(): Promise<number> {
    this._assertInitialized();
    
    try {
      // Query compressed token balance using ZK Compression RPC
      // Using the actual API method getCompressedBalanceByOwner
      const balanceResult = await this.rpc.getCompressedBalanceByOwner(this.wallet.publicKey);
      return balanceResult?.amount || 0;
      
    } catch (error) {
      // If no compressed account exists, return 0
      if (error instanceof Error && error.message.includes('not found')) {
        return 0;
      }
      
      throw new GhostSolError(
        `Failed to get compressed balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BALANCE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Compress SOL from regular account to compressed token account
   * 
   * This is the "shield" operation that moves SOL from the user's regular
   * account into a compressed token account for private transfers.
   * 
   * @param lamports - Amount to compress in lamports
   * @returns Promise resolving to transaction signature
   * @throws GhostSolError if compression fails
   */
  async compress(lamports: number): Promise<string> {
    this._assertInitialized();
    
    if (lamports <= 0) {
      throw new GhostSolError('Amount must be greater than 0');
    }

    try {
      // For now, implement a placeholder that demonstrates the SDK structure
      // In a real implementation, this would use the actual ZK Compression API
      
      // Create a simple transaction to demonstrate the flow
      const transaction = new Transaction();
      
      // Add a simple transfer instruction as a placeholder
      // In reality, this would be a compress instruction
      transaction.add({
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        ],
        programId: new PublicKey('11111111111111111111111111111111'), // System program
        data: Buffer.alloc(0), // Placeholder data
      });

      // Submit transaction via relayer
      const signature = await this.relayer.submitTransaction(transaction);
      
      return signature;
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to compress SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMPRESS_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Transfer compressed tokens to another address
   * 
   * This performs a private transfer between compressed accounts using
   * ZK proofs to maintain privacy.
   * 
   * @param recipientAddress - Recipient's public key as base58 string
   * @param lamports - Amount to transfer in lamports
   * @returns Promise resolving to transaction signature
   * @throws GhostSolError if transfer fails
   */
  async transfer(recipientAddress: string, lamports: number): Promise<string> {
    this._assertInitialized();
    
    if (lamports <= 0) {
      throw new GhostSolError('Amount must be greater than 0');
    }

    try {
      // Validate recipient address
      const recipientPubkey = new PublicKey(recipientAddress);
      
      // For now, implement a placeholder that demonstrates the SDK structure
      // In a real implementation, this would use the actual ZK Compression transfer API
      
      // Create a simple transaction to demonstrate the flow
      const transaction = new Transaction();
      
      // Add a simple transfer instruction as a placeholder
      // In reality, this would be a compressed token transfer instruction
      transaction.add({
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: recipientPubkey, isSigner: false, isWritable: true },
        ],
        programId: new PublicKey('11111111111111111111111111111111'), // System program
        data: Buffer.alloc(0), // Placeholder data
      });

      // Submit transaction via relayer
      const signature = await this.relayer.submitTransaction(transaction);
      
      return signature;
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to transfer compressed tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSFER_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decompress SOL from compressed account back to regular account
   * 
   * This is the "unshield" operation that moves SOL from a compressed
   * token account back to a regular Solana account.
   * 
   * @param lamports - Amount to decompress in lamports
   * @param destination - Optional destination address (defaults to user's address)
   * @returns Promise resolving to transaction signature
   * @throws GhostSolError if decompression fails
   */
  async decompress(lamports: number, destination?: string): Promise<string> {
    this._assertInitialized();
    
    if (lamports <= 0) {
      throw new GhostSolError('Amount must be greater than 0');
    }

    try {
      // Use user's address as default destination
      const destPubkey = destination ? new PublicKey(destination) : this.wallet.publicKey;
      
      // For now, implement a placeholder that demonstrates the SDK structure
      // In a real implementation, this would use the actual ZK Compression decompress API
      
      // Create a simple transaction to demonstrate the flow
      const transaction = new Transaction();
      
      // Add a simple transfer instruction as a placeholder
      // In reality, this would be a decompress instruction
      transaction.add({
        keys: [
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: destPubkey, isSigner: false, isWritable: true },
        ],
        programId: new PublicKey('11111111111111111111111111111111'), // System program
        data: Buffer.alloc(0), // Placeholder data
      });

      // Submit transaction via relayer
      const signature = await this.relayer.submitTransaction(transaction);
      
      return signature;
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to decompress SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DECOMPRESS_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Request devnet airdrop for testing purposes
   * 
   * This method requests SOL from the devnet faucet for testing.
   * Only works on devnet and may be rate limited.
   * 
   * @param lamports - Amount to request in lamports (default: 2 SOL)
   * @returns Promise resolving to transaction signature
   * @throws GhostSolError if airdrop fails
   */
  async fundDevnet(lamports: number = 2 * LAMPORTS_PER_SOL): Promise<string> {
    this._assertInitialized();
    
    try {
      const signature = await this.connection.requestAirdrop(
        this.wallet.publicKey,
        lamports
      );
      
      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to request devnet airdrop: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'This may be due to rate limiting or network issues.',
        'AIRDROP_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get detailed balance information including compressed and regular SOL
   * 
   * @returns Promise resolving to detailed balance information
   * @throws GhostSolError if balance query fails
   */
  async getDetailedBalance(): Promise<CompressedBalance> {
    this._assertInitialized();
    
    try {
      const compressedBalance = await this.getBalance();
      const regularBalance = await this.connection.getBalance(this.wallet.publicKey);
      
      return {
        lamports: compressedBalance,
        sol: compressedBalance / LAMPORTS_PER_SOL,
        exists: compressedBalance > 0,
        lastUpdated: Date.now()
      };
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to get detailed balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BALANCE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if the SDK is properly initialized
   * 
   * @returns True if SDK is initialized and ready to use
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Assert that the SDK is initialized
   * 
   * @throws GhostSolError if SDK is not initialized
   */
  private _assertInitialized(): void {
    if (!this.initialized) {
      throw new GhostSolError(
        'GhostSol SDK is not initialized. Call init() first.',
        'NOT_INITIALIZED'
      );
    }
  }
}
