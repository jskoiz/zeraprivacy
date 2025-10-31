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
  ExtendedWalletAdapter, 
  TransferResult, 
  CompressedBalance,
  NETWORKS 
} from './types';
import { normalizeWallet } from './wallet';
import { createCompressedRpc, validateRpcConnection } from './rpc';
import { createTestRelayer, Relayer } from './relayer';
import { 
  GhostSolError, 
  CompressionError, 
  TransferError, 
  DecompressionError,
  ValidationError 
} from './errors';
import { BalanceCache, getCompressedBalance } from './balance';
import { 
  CompressionConfig,
  compressTokens,
  transferCompressedTokens,
  decompressTokens 
} from './compression';
import { loadAndValidateConfig, validateNoSensitiveExposure, EnvConfigError } from './env-config';
import { loadRpcConfig, createRpcConfigFromUrl } from './rpc-config';
import { RpcManager, createRpcManager } from './rpc-manager';

/**
 * Main GhostSol SDK class providing privacy-focused Solana operations
 * 
 * This class wraps ZK Compression functionality to provide a simple
 * interface for private SOL transfers using compressed tokens.
 */
export class GhostSol {
  private connection!: Connection;
  private rpc!: any; // ZK Compression RPC instance
  private wallet!: ExtendedWalletAdapter;
  private relayer!: Relayer;
  private balanceCache!: BalanceCache;
  private rpcManager?: RpcManager;
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
      // Validate environment configuration for security
      try {
        validateNoSensitiveExposure();
      } catch (error) {
        // Log warning but don't fail initialization if in development
        if (error instanceof EnvConfigError) {
          console.warn('[GhostSol] Security warning:', error.message);
        }
      }
      
      // Load and validate environment configuration
      // This validates env vars but doesn't override explicit config
      let envConfig;
      try {
        envConfig = loadAndValidateConfig({
          cluster: config.cluster,
          rpcUrl: config.rpcUrl,
        });
      } catch (error) {
        // If env config fails but explicit config is provided, use explicit config
        // This allows SDK to work without env vars if all config is provided explicitly
        if (!config.rpcUrl && !config.cluster && !config.rpcConfig) {
          throw new GhostSolError(
            `Environment configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'CONFIG_ERROR',
            error instanceof Error ? error : undefined
          );
        }
        // If explicit config is provided, continue with explicit config
      }
      
      // Normalize wallet input
      this.wallet = normalizeWallet(config.wallet);
      
      // Determine network configuration
      // Prefer explicit config, then env config, then defaults
      const cluster = config.cluster || envConfig?.cluster || 'devnet';
      const networkConfig = NETWORKS[cluster];
      
      if (!networkConfig) {
        throw new GhostSolError(`Unsupported cluster: ${cluster}`, 'CONFIG_ERROR');
      }

      // Initialize RPC manager if advanced config is provided
      if (config.rpcConfig) {
        this.rpcManager = createRpcManager(config.rpcConfig);
        this.connection = await this.rpcManager.getConnection();
        this.rpc = await this.rpcManager.getZkRpc();
      } else if (config.rpcUrl) {
        // Simple URL-based configuration with basic fallback
        const rpcConfig = createRpcConfigFromUrl(config.rpcUrl, cluster, {
          commitment: config.commitment,
        });
        this.rpcManager = createRpcManager(rpcConfig);
        this.connection = await this.rpcManager.getConnection();
        this.rpc = await this.rpcManager.getZkRpc();
      } else {
        // Load RPC configuration from environment variables
        try {
          const rpcConfig = loadRpcConfig(cluster, {
            commitment: config.commitment,
          });
          this.rpcManager = createRpcManager(rpcConfig);
          this.connection = await this.rpcManager.getConnection();
          
          // Try to get ZK RPC if available
          try {
            this.rpc = await this.rpcManager.getZkRpc();
          } catch (zkError) {
            console.warn('[GhostSol] ZK Compression RPC not available, using fallback');
            // Fall back to regular connection-based RPC
            const rpcConfigLegacy = createCompressedRpc({ ...config, cluster });
            this.rpc = rpcConfigLegacy.rpc;
          }
        } catch (rpcConfigError) {
          // Fallback to legacy configuration method
          const rpcUrl = envConfig?.rpcUrl || networkConfig.rpcUrl;
          
          // Validate RPC URL format
          try {
            new URL(rpcUrl);
          } catch {
            throw new GhostSolError(
              `Invalid RPC URL format: ${rpcUrl}. Must be a valid HTTP or HTTPS URL.`,
              'CONFIG_ERROR'
            );
          }
          
          this.connection = new Connection(rpcUrl, {
            commitment: config.commitment || networkConfig.commitment,
            confirmTransactionInitialTimeout: 60000,
          });

          // Validate RPC connection
          await validateRpcConnection(this.connection);

          // Initialize ZK Compression RPC using legacy method
          const rpcConfigLegacy = createCompressedRpc({ ...config, cluster });
          this.rpc = rpcConfigLegacy.rpc;
        }
      }

      // Create TestRelayer using user's wallet as fee payer
      this.relayer = createTestRelayer(this.wallet, this.connection);

      // Initialize balance cache with 30 second TTL
      this.balanceCache = new BalanceCache({ ttl: 30000 });

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
      // Use balance cache for performance
      const detailedBalance = await getCompressedBalance(
        this.rpc,
        this.wallet.publicKey,
        this.balanceCache
      );
      
      return detailedBalance.lamports;
      
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
    
    // Validate input
    if (lamports <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }

    try {
      // Build compression configuration
      const config: CompressionConfig = {
        rpc: this.rpc,
        wallet: this.wallet,
        connection: this.connection
      };
      
      // Call compression module
      const result = await compressTokens(config, lamports);
      
      // Invalidate balance cache after successful compression
      this.balanceCache.invalidate(this.wallet.publicKey.toBase58());
      
      return result.signature;
      
    } catch (error) {
      // Re-throw specialized errors as-is, wrap others
      if (error instanceof CompressionError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new CompressionError(
        `Failed to compress SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    
    // Validate input
    if (lamports <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }

    try {
      // Validate recipient address
      const recipientPubkey = new PublicKey(recipientAddress);
      
      // Build compression configuration
      const config: CompressionConfig = {
        rpc: this.rpc,
        wallet: this.wallet,
        connection: this.connection
      };
      
      // Call transfer module
      const result = await transferCompressedTokens(config, recipientPubkey, lamports);
      
      // Invalidate balance cache after successful transfer
      this.balanceCache.invalidate(this.wallet.publicKey.toBase58());
      
      return result.signature;
      
    } catch (error) {
      // Re-throw specialized errors as-is, wrap others
      if (error instanceof TransferError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new TransferError(
        `Failed to transfer compressed tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    
    // Validate input
    if (lamports <= 0) {
      throw new ValidationError('Amount must be greater than 0');
    }

    try {
      // Use user's address as default destination
      const destPubkey = destination ? new PublicKey(destination) : this.wallet.publicKey;
      
      // Build compression configuration
      const config: CompressionConfig = {
        rpc: this.rpc,
        wallet: this.wallet,
        connection: this.connection
      };
      
      // Call decompress module
      const result = await decompressTokens(config, lamports, destPubkey);
      
      // Invalidate balance cache after successful decompression
      this.balanceCache.invalidate(this.wallet.publicKey.toBase58());
      
      return result.signature;
      
    } catch (error) {
      // Re-throw specialized errors as-is, wrap others
      if (error instanceof DecompressionError || error instanceof ValidationError) {
        throw error;
      }
      
      throw new DecompressionError(
        `Failed to decompress SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Request devnet airdrop for testing purposes
   * 
   * This method requests SOL from the devnet faucet for testing.
   * Only works on devnet and may be rate limited.
   * Includes timeout to prevent hanging on rate-limited requests.
   * 
   * @param lamports - Amount to request in lamports (default: 2 SOL)
   * @returns Promise resolving to transaction signature
   * @throws GhostSolError if airdrop fails or times out
   */
  async fundDevnet(lamports: number = 2 * LAMPORTS_PER_SOL): Promise<string> {
    this._assertInitialized();
    
    try {
      // Create timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Airdrop request timed out after 30 seconds. This is likely due to rate limiting on devnet.'));
        }, 30000);
      });
      
      // Race between airdrop request and timeout
      const signature = await Promise.race([
        this.connection.requestAirdrop(
          this.wallet.publicKey,
          lamports
        ),
        timeoutPromise
      ]);
      
      // Wait for confirmation with shorter timeout
      const confirmTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Transaction confirmation timed out'));
        }, 15000);
      });
      
      await Promise.race([
        this.connection.confirmTransaction(signature, 'confirmed'),
        confirmTimeout
      ]);
      
      return signature;
      
    } catch (error) {
      throw new GhostSolError(
        `Failed to request devnet airdrop: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'This may be due to rate limiting or network issues. Try using https://faucet.solana.com manually.',
        'AIRDROP_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Force refresh balance cache for current user
   * 
   * This method invalidates the cached balance and fetches fresh data
   * from the blockchain. Useful after transactions to get updated balances.
   * 
   * @returns Promise resolving when refresh is complete
   */
  async refreshBalance(): Promise<void> {
    this._assertInitialized();
    this.balanceCache.invalidate(this.wallet.publicKey.toBase58());
    // Fetch fresh balance to populate cache
    await this.getBalance();
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
   * Get RPC metrics for monitoring
   * 
   * @returns RPC metrics including health status and performance data
   */
  getRpcMetrics(): any {
    if (this.rpcManager) {
      return this.rpcManager.getMetrics();
    }
    return null;
  }

  /**
   * Get RPC health status
   * 
   * @returns Map of endpoint URLs to health information
   */
  getRpcHealth(): Map<string, any> | null {
    if (this.rpcManager) {
      return this.rpcManager.getHealthStatus();
    }
    return null;
  }

  /**
   * Cleanup resources when done
   */
  dispose(): void {
    if (this.rpcManager) {
      this.rpcManager.stop();
    }
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
