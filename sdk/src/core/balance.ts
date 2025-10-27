/**
 * balance.ts
 * 
 * Purpose: Balance query and caching module
 * 
 * This module handles compressed balance queries with caching,
 * refresh mechanisms, and support for multiple token types.
 * The cache uses a time-to-live (TTL) strategy to balance
 * between performance and data freshness.
 * 
 * Dependencies:
 * - @solana/web3.js for PublicKey type
 * - Core types for CompressedBalance interface
 * 
 * Exports:
 * - BalanceCache - In-memory balance cache with TTL
 * - BalanceCacheConfig - Cache configuration interface
 * - getCompressedBalance() - Query compressed balance with caching
 */

import { PublicKey } from '@solana/web3.js';
import { CompressedBalance } from './types';

/**
 * Configuration for balance cache
 * 
 * Controls caching behavior including TTL and maximum size.
 */
export interface BalanceCacheConfig {
  /** Time-to-live in milliseconds (default: 30000 = 30 seconds) */
  ttl: number;
  /** Maximum number of cache entries (default: 100) */
  maxSize: number;
}

/**
 * Internal structure for cached balance entries
 * 
 * Stores balance data along with metadata for cache management.
 */
interface CachedBalance {
  /** The balance data */
  balance: CompressedBalance;
  /** Timestamp when cached (milliseconds since epoch) */
  timestamp: number;
  /** Address key for this entry */
  address: string;
}

/**
 * In-memory balance cache with time-to-live support
 * 
 * This class provides efficient caching of compressed balance data
 * with automatic expiration based on TTL. It enforces a maximum
 * cache size using a simple FIFO eviction strategy.
 * 
 * @example
 * const cache = new BalanceCache({ ttl: 30000, maxSize: 100 });
 * const cached = cache.get('address...');
 * if (cached) {
 *   // Use cached data
 * } else {
 *   // Fetch fresh data
 * }
 */
export class BalanceCache {
  private cache: Map<string, CachedBalance>;
  private config: BalanceCacheConfig;

  /**
   * Create a new balance cache
   * 
   * @param config - Cache configuration (partial, will be merged with defaults)
   */
  constructor(config: Partial<BalanceCacheConfig> = {}) {
    this.config = {
      ttl: config.ttl || 30000, // 30 seconds default
      maxSize: config.maxSize || 100 // 100 entries default
    };
    this.cache = new Map();
  }

  /**
   * Get cached balance if valid
   * 
   * Returns the cached balance if it exists and has not expired.
   * Automatically removes expired entries from the cache.
   * 
   * @param address - Address to query (base58 string)
   * @returns Cached balance or null if expired/not found
   */
  get(address: string): CompressedBalance | null {
    const entry = this.cache.get(address);
    
    // No entry found
    if (!entry) {
      return null;
    }
    
    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttl) {
      // Auto-remove expired entry
      this.cache.delete(address);
      return null;
    }
    
    // Return valid cached balance
    return entry.balance;
  }

  /**
   * Set cached balance
   * 
   * Stores the balance in the cache. If the cache has reached
   * maximum size, the oldest entry is removed first (FIFO).
   * 
   * @param address - Address key (base58 string)
   * @param balance - Balance data to cache
   */
  set(address: string, balance: CompressedBalance): void {
    // Enforce max size by removing oldest entry
    if (this.cache.size >= this.config.maxSize) {
      // Get the first (oldest) key and remove it
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    // Store new entry with current timestamp
    this.cache.set(address, {
      balance,
      timestamp: Date.now(),
      address
    });
  }

  /**
   * Clear all cached balances
   * 
   * Removes all entries from the cache. Useful for testing
   * or forcing a complete cache reset.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove specific entry from cache
   * 
   * Invalidates the cached balance for a specific address.
   * This forces the next request for this address to fetch
   * fresh data from the blockchain.
   * 
   * @param address - Address to invalidate (base58 string)
   */
  invalidate(address: string): void {
    this.cache.delete(address);
  }

  /**
   * Get current cache size
   * 
   * Returns the number of entries currently in the cache.
   * Useful for monitoring cache utilization.
   * 
   * @returns Number of cache entries
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Query compressed balance with caching
 * 
 * This function queries the compressed balance from the ZK Compression
 * RPC endpoint. It first checks the cache, and if the data is fresh,
 * returns the cached value. Otherwise, it queries the RPC and updates
 * the cache.
 * 
 * @param rpc - ZK Compression RPC instance
 * @param address - Public key to query
 * @param cache - Optional balance cache for performance
 * @returns Promise resolving to compressed balance
 * 
 * @example
 * const balance = await getCompressedBalance(rpc, wallet.publicKey, cache);
 * console.log(`Balance: ${balance.sol} SOL`);
 */
export async function getCompressedBalance(
  rpc: any,
  address: PublicKey,
  cache?: BalanceCache
): Promise<CompressedBalance> {
  const addressStr = address.toBase58();
  
  // Check cache first if available
  if (cache) {
    const cached = cache.get(addressStr);
    if (cached) {
      // Return fresh cached data
      return cached;
    }
  }
  
  // Query actual balance from RPC
  // Using the actual API method getCompressedBalanceByOwner
  // External function: rpc.getCompressedBalanceByOwner(address)
  // Returns: { amount: number } - The balance in lamports
  const balanceResult = await rpc.getCompressedBalanceByOwner(address);
  
  // Construct balance object
  const balance: CompressedBalance = {
    lamports: balanceResult?.amount || 0,
    sol: (balanceResult?.amount || 0) / 1e9,
    exists: (balanceResult?.amount || 0) > 0,
    lastUpdated: Date.now()
  };
  
  // Update cache if available
  if (cache) {
    cache.set(addressStr, balance);
  }
  
  return balance;
}
