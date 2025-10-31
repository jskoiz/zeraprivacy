/**
 * cache.ts
 * 
 * Purpose: High-performance caching system for SDK operations
 * 
 * This module provides a multi-level caching system to optimize:
 * - RPC call responses
 * - Blockchain scanning results
 * - Cryptographic operations (point derivations, KDF results)
 * - Account state queries
 * - Transaction signatures
 * 
 * Features:
 * - TTL-based expiration
 * - LRU eviction policy
 * - Size-based limits
 * - Memory-efficient storage
 * - Cache statistics and monitoring
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Timestamp when cached (ms) */
  timestamp: number;
  /** Size in bytes (approximate) */
  size: number;
  /** Number of hits */
  hits: number;
  /** TTL in milliseconds */
  ttl: number;
}

/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Maximum number of entries */
  maxEntries?: number;
  /** Maximum cache size in bytes */
  maxSizeBytes?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Enable cache statistics */
  enableStats?: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Current number of entries */
  entries: number;
  /** Current size in bytes */
  sizeBytes: number;
  /** Number of evictions */
  evictions: number;
}

/**
 * Generic cache implementation with LRU eviction
 */
export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private config: Required<CacheConfig>;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };
  private currentSize: number;

  private static readonly DEFAULT_CONFIG: Required<CacheConfig> = {
    maxEntries: 1000,
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    defaultTTL: 60000, // 1 minute
    enableStats: true
  };

  constructor(config?: CacheConfig) {
    this.cache = new Map();
    this.config = { ...Cache.DEFAULT_CONFIG, ...config };
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    this.currentSize = 0;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
      }
      return null;
    }

    // Update access time and hits
    entry.hits++;
    if (this.config.enableStats) {
      this.stats.hits++;
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entryTTL = ttl || this.config.defaultTTL;
    const size = this._estimateSize(value);

    // Check if we need to evict entries
    this._ensureCapacity(size);

    // Store entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      size,
      hits: 0,
      ttl: entryTTL
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      entries: this.cache.size,
      sizeBytes: this.currentSize,
      evictions: this.stats.evictions
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  // Private helper methods

  private _ensureCapacity(newEntrySize: number): void {
    // Check entry count limit
    if (this.cache.size >= this.config.maxEntries) {
      this._evictLRU();
    }

    // Check size limit
    while (this.currentSize + newEntrySize > this.config.maxSizeBytes && this.cache.size > 0) {
      this._evictLRU();
    }
  }

  private _evictLRU(): void {
    // Find least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    let leastHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize by hits first, then timestamp
      if (entry.hits < leastHits || (entry.hits === leastHits && entry.timestamp < oldestTime)) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        leastHits = entry.hits;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private _estimateSize(value: T): number {
    // Rough size estimation
    if (value === null || value === undefined) return 8;
    if (typeof value === 'string') return value.length * 2;
    if (typeof value === 'number') return 8;
    if (typeof value === 'boolean') return 4;
    if (value instanceof Uint8Array) return value.length;
    if (Array.isArray(value)) return value.length * 8 + 32;
    if (typeof value === 'object') return JSON.stringify(value).length * 2;
    return 64; // Default estimate
  }
}

/**
 * Specialized cache for RPC responses
 */
export class RPCCache extends Cache<any> {
  constructor(config?: CacheConfig) {
    super({
      maxEntries: 500,
      maxSizeBytes: 5 * 1024 * 1024, // 5 MB
      defaultTTL: 30000, // 30 seconds
      ...config
    });
  }

  /**
   * Generate cache key for RPC method call
   */
  static makeKey(method: string, params: any[]): string {
    return `rpc:${method}:${JSON.stringify(params)}`;
  }
}

/**
 * Specialized cache for blockchain scanning results
 */
export class ScanCache extends Cache<any> {
  constructor(config?: CacheConfig) {
    super({
      maxEntries: 200,
      maxSizeBytes: 10 * 1024 * 1024, // 10 MB
      defaultTTL: 60000, // 1 minute
      ...config
    });
  }

  /**
   * Generate cache key for scan operation
   */
  static makeKey(
    address: PublicKey | undefined,
    startSlot: number,
    endSlot: number
  ): string {
    const addrKey = address ? address.toBase58() : 'all';
    return `scan:${addrKey}:${startSlot}:${endSlot}`;
  }
}

/**
 * Specialized cache for cryptographic operations
 */
export class CryptoCache extends Cache<Uint8Array> {
  constructor(config?: CacheConfig) {
    super({
      maxEntries: 1000,
      maxSizeBytes: 2 * 1024 * 1024, // 2 MB
      defaultTTL: 300000, // 5 minutes (crypto results don't change)
      ...config
    });
  }

  /**
   * Generate cache key for point derivation
   */
  static makePointKey(publicKey: PublicKey): string {
    return `point:${publicKey.toBase58()}`;
  }

  /**
   * Generate cache key for KDF operation
   */
  static makeKDFKey(input: Uint8Array): string {
    // Use first 16 bytes as key identifier
    const prefix = Buffer.from(input.slice(0, 16)).toString('hex');
    return `kdf:${prefix}`;
  }

  /**
   * Generate cache key for shared secret
   */
  static makeSharedSecretKey(publicKey1: PublicKey, publicKey2: PublicKey): string {
    // Sort keys to ensure consistent cache key regardless of order
    const keys = [publicKey1.toBase58(), publicKey2.toBase58()].sort();
    return `shared:${keys[0]}:${keys[1]}`;
  }
}

/**
 * Global cache manager for SDK
 */
export class CacheManager {
  private rpcCache: RPCCache;
  private scanCache: ScanCache;
  private cryptoCache: CryptoCache;

  constructor() {
    this.rpcCache = new RPCCache();
    this.scanCache = new ScanCache();
    this.cryptoCache = new CryptoCache();
  }

  /**
   * Get RPC cache instance
   */
  getRPCCache(): RPCCache {
    return this.rpcCache;
  }

  /**
   * Get scan cache instance
   */
  getScanCache(): ScanCache {
    return this.scanCache;
  }

  /**
   * Get crypto cache instance
   */
  getCryptoCache(): CryptoCache {
    return this.cryptoCache;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.rpcCache.clear();
    this.scanCache.clear();
    this.cryptoCache.clear();
  }

  /**
   * Get combined statistics
   */
  getAllStats(): {
    rpc: CacheStats;
    scan: CacheStats;
    crypto: CacheStats;
    total: {
      hits: number;
      misses: number;
      hitRate: number;
      entries: number;
      sizeBytes: number;
    };
  } {
    const rpcStats = this.rpcCache.getStats();
    const scanStats = this.scanCache.getStats();
    const cryptoStats = this.cryptoCache.getStats();

    const totalHits = rpcStats.hits + scanStats.hits + cryptoStats.hits;
    const totalMisses = rpcStats.misses + scanStats.misses + cryptoStats.misses;
    const total = totalHits + totalMisses;

    return {
      rpc: rpcStats,
      scan: scanStats,
      crypto: cryptoStats,
      total: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: total > 0 ? (totalHits / total) * 100 : 0,
        entries: rpcStats.entries + scanStats.entries + cryptoStats.entries,
        sizeBytes: rpcStats.sizeBytes + scanStats.sizeBytes + cryptoStats.sizeBytes
      }
    };
  }
}

/**
 * Global cache manager instance
 */
export const globalCacheManager = new CacheManager();

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
  }>;

  constructor() {
    this.metrics = new Map();
  }

  /**
   * Record a performance measurement
   */
  record(operation: string, durationMs: number): void {
    const existing = this.metrics.get(operation);

    if (!existing) {
      this.metrics.set(operation, {
        count: 1,
        totalTime: durationMs,
        minTime: durationMs,
        maxTime: durationMs,
        avgTime: durationMs
      });
    } else {
      existing.count++;
      existing.totalTime += durationMs;
      existing.minTime = Math.min(existing.minTime, durationMs);
      existing.maxTime = Math.max(existing.maxTime, durationMs);
      existing.avgTime = existing.totalTime / existing.count;
    }
  }

  /**
   * Get metrics for an operation
   */
  getMetrics(operation: string) {
    return this.metrics.get(operation);
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    operations: { [key: string]: any };
  } {
    let totalOps = 0;
    const operations: { [key: string]: any } = {};

    for (const [op, metrics] of this.metrics.entries()) {
      totalOps += metrics.count;
      operations[op] = {
        ...metrics,
        avgTime: Math.round(metrics.avgTime * 100) / 100
      };
    }

    return { totalOperations: totalOps, operations };
  }
}

/**
 * Performance measurement decorator/wrapper
 */
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  monitor?: PerformanceMonitor
): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (monitor) {
      monitor.record(operation, duration);
    }
  });
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor();
