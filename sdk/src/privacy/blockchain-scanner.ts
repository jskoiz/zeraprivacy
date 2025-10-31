/**
 * privacy/blockchain-scanner.ts
 * 
 * Purpose: MVP implementation for scanning blockchain transactions to extract ephemeral keys
 * 
 * This module implements the blockchain scanning logic for stealth address ephemeral keys.
 * The MVP approach uses transaction memos to store ephemeral public keys, which allows
 * recipients to discover payments without requiring a dedicated indexer service.
 * 
 * Ephemeral Key Storage Format (in transaction memo):
 * ```
 * STEALTH:<base58_ephemeral_public_key>:<optional_metadata>
 * ```
 * 
 * Example:
 * ```
 * STEALTH:9WzDXwBbmkg8ZTXIdHqEyqndFNEbEkFqBGrpGHYqw8Ga:v1
 * ```
 * 
 * Future Enhancements:
 * - On-chain program for efficient ephemeral key storage
 * - Dedicated indexer service with RPC API
 * - WebSocket support for real-time scanning
 * - Parallel scanning across multiple RPC nodes
 */

import { Connection, PublicKey, ParsedTransactionWithMeta, ConfirmedSignatureInfo } from '@solana/web3.js';
import { EphemeralKey } from './types';
import { PrivacyError } from './errors';

/**
 * Configuration for blockchain scanning
 */
export interface ScannerConfig {
  /** Maximum number of transactions to scan in one batch */
  batchSize?: number;
  /** Cache expiration time in milliseconds */
  cacheExpirationMs?: number;
  /** Maximum age of transactions to scan (in slots) */
  maxScanDepth?: number;
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Cached scan result
 */
interface CachedScan {
  /** Ephemeral keys found */
  keys: EphemeralKey[];
  /** Timestamp when cached */
  timestamp: number;
  /** Last scanned slot */
  lastSlot: number;
}

/**
 * Transaction scan result
 */
export interface ScanResult {
  /** Ephemeral keys found */
  ephemeralKeys: EphemeralKey[];
  /** Number of transactions scanned */
  transactionsScanned: number;
  /** Start slot of scan */
  startSlot: number;
  /** End slot of scan */
  endSlot: number;
  /** Scan duration in milliseconds */
  duration: number;
}

/**
 * Blockchain Scanner for Stealth Address Ephemeral Keys
 * 
 * This class implements the MVP approach for discovering ephemeral keys
 * by scanning transaction memos on the Solana blockchain.
 */
export class BlockchainScanner {
  private config: Required<ScannerConfig>;
  private cache: Map<string, CachedScan>;
  
  /**
   * Default configuration values
   */
  private static readonly DEFAULT_CONFIG: Required<ScannerConfig> = {
    batchSize: 100,
    cacheExpirationMs: 60000, // 1 minute
    maxScanDepth: 10000, // ~10000 slots = ~1 hour of history
    verbose: false
  };

  constructor(config?: ScannerConfig) {
    this.config = {
      ...BlockchainScanner.DEFAULT_CONFIG,
      ...config
    };
    this.cache = new Map();
  }

  /**
   * Scan blockchain for ephemeral keys in a slot range
   * 
   * @param connection - Solana connection
   * @param stealthAddress - Stealth address to scan for (optional, scans all if not provided)
   * @param startSlot - Starting slot for scan
   * @param endSlot - Ending slot for scan (defaults to current slot)
   * @returns Scan result with found ephemeral keys
   */
  async scanForEphemeralKeys(
    connection: Connection,
    stealthAddress?: PublicKey,
    startSlot?: number,
    endSlot?: number
  ): Promise<ScanResult> {
    const startTime = Date.now();
    
    try {
      // Get current slot if endSlot not provided
      const currentSlot = await connection.getSlot('confirmed');
      const scanEndSlot = endSlot || currentSlot;
      const scanStartSlot = startSlot || Math.max(0, scanEndSlot - this.config.maxScanDepth);

      if (this.config.verbose) {
        console.log(`🔍 Scanning slots ${scanStartSlot} to ${scanEndSlot} for ephemeral keys`);
      }

      // Check cache first
      const cacheKey = this._getCacheKey(stealthAddress, scanStartSlot, scanEndSlot);
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        if (this.config.verbose) {
          console.log(`✓ Using cached scan results (${cached.keys.length} keys)`);
        }
        return {
          ephemeralKeys: cached.keys,
          transactionsScanned: 0,
          startSlot: scanStartSlot,
          endSlot: scanEndSlot,
          duration: Date.now() - startTime
        };
      }

      // Scan transactions
      const ephemeralKeys: EphemeralKey[] = [];
      let transactionsScanned = 0;

      if (stealthAddress) {
        // Scan transactions for specific stealth address
        const signatures = await this._getSignaturesForAddress(
          connection,
          stealthAddress,
          scanStartSlot,
          scanEndSlot
        );

        transactionsScanned = signatures.length;

        if (this.config.verbose) {
          console.log(`Found ${signatures.length} transactions for address ${stealthAddress.toBase58()}`);
        }

        // Process transactions in batches
        for (let i = 0; i < signatures.length; i += this.config.batchSize) {
          const batch = signatures.slice(i, i + this.config.batchSize);
          const batchKeys = await this._processTransactionBatch(connection, batch);
          ephemeralKeys.push(...batchKeys);
        }
      } else {
        // Without a specific address, we can't efficiently scan all transactions
        // This would require an indexer service in production
        if (this.config.verbose) {
          console.warn('⚠️  Scanning without specific address is not supported in MVP');
          console.warn('    Consider using an indexer service for full blockchain scanning');
        }
      }

      // Cache results
      this._saveToCache(cacheKey, {
        keys: ephemeralKeys,
        timestamp: Date.now(),
        lastSlot: scanEndSlot
      });

      const duration = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`✓ Scan complete: ${ephemeralKeys.length} keys found in ${duration}ms`);
      }

      return {
        ephemeralKeys,
        transactionsScanned,
        startSlot: scanStartSlot,
        endSlot: scanEndSlot,
        duration
      };

    } catch (error) {
      throw new PrivacyError(
        `Blockchain scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fetch ephemeral keys from blockchain for a stealth address
   * 
   * This is the main entry point that matches the interface expected by StealthAddressManager.
   * 
   * @param connection - Solana connection
   * @param stealthAddress - Stealth address to scan for (optional)
   * @param startSlot - Starting slot for scan
   * @param endSlot - Ending slot for scan
   * @returns Array of ephemeral keys found
   */
  async fetchEphemeralKeys(
    connection: Connection,
    stealthAddress?: PublicKey,
    startSlot?: number,
    endSlot?: number
  ): Promise<EphemeralKey[]> {
    const result = await this.scanForEphemeralKeys(
      connection,
      stealthAddress,
      startSlot,
      endSlot
    );
    return result.ephemeralKeys;
  }

  /**
   * Parse ephemeral key from transaction memo
   * 
   * Expected format: STEALTH:<base58_public_key>:<optional_metadata>
   * 
   * @param memo - Transaction memo string
   * @returns Ephemeral public key or null if not found
   */
  parseEphemeralKeyFromMemo(memo: string): PublicKey | null {
    try {
      // Check for stealth address marker
      if (!memo.startsWith('STEALTH:')) {
        return null;
      }

      // Extract public key from memo
      // Format: STEALTH:<base58_public_key>:<optional_metadata>
      const parts = memo.split(':');
      if (parts.length < 2) {
        return null;
      }

      const publicKeyBase58 = parts[1];
      
      // Validate and parse public key
      const publicKey = new PublicKey(publicKeyBase58);
      
      // Basic validation - ensure it's a valid 32-byte public key
      if (publicKey.toBuffer().length !== 32) {
        return null;
      }

      return publicKey;

    } catch (error) {
      // Invalid public key format
      if (this.config.verbose) {
        console.warn(`Failed to parse ephemeral key from memo: ${memo}`);
      }
      return null;
    }
  }

  /**
   * Create memo string for ephemeral key
   * 
   * This utility function helps senders create properly formatted memos
   * for stealth address payments.
   * 
   * @param ephemeralPublicKey - Ephemeral public key to encode
   * @param metadata - Optional metadata (e.g., version)
   * @returns Formatted memo string
   */
  createEphemeralKeyMemo(
    ephemeralPublicKey: PublicKey,
    metadata?: string
  ): string {
    const base = `STEALTH:${ephemeralPublicKey.toBase58()}`;
    return metadata ? `${base}:${metadata}` : base;
  }

  /**
   * Clear all cached scan results
   */
  clearCache(): void {
    this.cache.clear();
    if (this.config.verbose) {
      console.log('✓ Scanner cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    let totalKeys = 0;
    const cacheValues = Array.from(this.cache.values());
    for (const cached of cacheValues) {
      totalKeys += cached.keys.length;
    }
    return {
      size: totalKeys,
      entries: this.cache.size
    };
  }

  // Private helper methods

  /**
   * Get transaction signatures for an address within slot range
   */
  private async _getSignaturesForAddress(
    connection: Connection,
    address: PublicKey,
    startSlot: number,
    endSlot: number
  ): Promise<ConfirmedSignatureInfo[]> {
    try {
      const signatures = await connection.getSignaturesForAddress(
        address,
        {
          limit: 1000,
          // Note: Solana RPC doesn't support slot-based filtering directly
          // This is a limitation of the MVP approach
        },
        'confirmed'
      );

      // Filter by slot range
      return signatures.filter(sig => {
        const slot = sig.slot;
        return slot >= startSlot && slot <= endSlot;
      });

    } catch (error) {
      throw new PrivacyError(
        `Failed to fetch signatures for address: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Process a batch of transactions to extract ephemeral keys
   */
  private async _processTransactionBatch(
    connection: Connection,
    signatures: ConfirmedSignatureInfo[]
  ): Promise<EphemeralKey[]> {
    const ephemeralKeys: EphemeralKey[] = [];

    // Fetch full transaction data
    const signatureStrings = signatures.map(sig => sig.signature);
    const transactions = await connection.getParsedTransactions(
      signatureStrings,
      {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      }
    );

    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const signature = signatureStrings[i];

      if (!tx) continue;

      // Extract ephemeral keys from transaction memos
      const keys = this._extractEphemeralKeysFromTransaction(tx, signature);
      ephemeralKeys.push(...keys);
    }

    return ephemeralKeys;
  }

  /**
   * Extract ephemeral keys from a parsed transaction
   */
  private _extractEphemeralKeysFromTransaction(
    transaction: ParsedTransactionWithMeta,
    signature: string
  ): EphemeralKey[] {
    const ephemeralKeys: EphemeralKey[] = [];

    try {
      // Check transaction memos
      const message = transaction.transaction.message;
      const instructions = message.instructions;

      for (const instruction of instructions) {
        // Check if this is a memo instruction
        if ('program' in instruction && instruction.program === 'spl-memo') {
          // Parsed memo instruction
          if ('parsed' in instruction) {
            const memo = instruction.parsed;
            const publicKey = this.parseEphemeralKeyFromMemo(memo);
            
            if (publicKey) {
              ephemeralKeys.push({
                publicKey,
                encryptedPrivateKey: new Uint8Array(0), // Not available when scanning
                transactionSignature: signature,
                createdAt: transaction.blockTime ? transaction.blockTime * 1000 : Date.now()
              });
            }
          }
        }
        
        // Also check raw memo data for backwards compatibility
        if ('data' in instruction && typeof instruction.data === 'string') {
          try {
            // Try to decode as base58
            const decoded = Buffer.from(instruction.data, 'base64').toString('utf8');
            const publicKey = this.parseEphemeralKeyFromMemo(decoded);
            
            if (publicKey) {
              ephemeralKeys.push({
                publicKey,
                encryptedPrivateKey: new Uint8Array(0),
                transactionSignature: signature,
                createdAt: transaction.blockTime ? transaction.blockTime * 1000 : Date.now()
              });
            }
          } catch {
            // Not a valid memo
          }
        }
      }

    } catch (error) {
      if (this.config.verbose) {
        console.warn(`Failed to extract ephemeral keys from transaction ${signature}:`, error);
      }
    }

    return ephemeralKeys;
  }

  /**
   * Generate cache key for scan parameters
   */
  private _getCacheKey(
    address: PublicKey | undefined,
    startSlot: number,
    endSlot: number
  ): string {
    const addrKey = address ? address.toBase58() : 'all';
    return `${addrKey}:${startSlot}:${endSlot}`;
  }

  /**
   * Get cached scan results if valid
   */
  private _getFromCache(key: string): CachedScan | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheExpirationMs) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  /**
   * Save scan results to cache
   */
  private _saveToCache(key: string, scan: CachedScan): void {
    this.cache.set(key, scan);

    // Implement simple LRU-style cache eviction
    // If cache grows too large (>100 entries), remove oldest entries
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20 && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
}

/**
 * Utility function to create a memo instruction for stealth address payments
 * 
 * This helps senders properly format transaction memos with ephemeral keys.
 * 
 * @param ephemeralPublicKey - Ephemeral public key to include
 * @param metadata - Optional metadata
 * @returns Memo string for transaction
 */
export function createStealthAddressMemo(
  ephemeralPublicKey: PublicKey,
  metadata?: string
): string {
  const scanner = new BlockchainScanner();
  return scanner.createEphemeralKeyMemo(ephemeralPublicKey, metadata);
}

/**
 * Parse ephemeral key from a transaction memo
 * 
 * @param memo - Transaction memo string
 * @returns Ephemeral public key or null if not found
 */
export function parseStealthAddressMemo(memo: string): PublicKey | null {
  const scanner = new BlockchainScanner();
  return scanner.parseEphemeralKeyFromMemo(memo);
}
