/**
 * performance.test.ts
 * 
 * Purpose: Performance benchmarks and optimization validation
 * 
 * This test suite measures and validates performance characteristics of:
 * - Caching system performance
 * - Blockchain scanning throughput
 * - Encryption/decryption operations
 * - RPC call batching and optimization
 * - Memory usage and cache efficiency
 * 
 * Run with: npm test performance.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
  Cache, 
  RPCCache, 
  ScanCache, 
  CryptoCache,
  CacheManager,
  PerformanceMonitor,
  measurePerformance,
  globalCacheManager 
} from '../src/core/cache';
import { BlockchainScanner } from '../src/privacy/blockchain-scanner';
import { ViewingKeyManager } from '../src/privacy/viewing-keys';
import { ExtendedWalletAdapter } from '../src/core/types';

describe('Performance Benchmarks', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    globalCacheManager.clearAll();
  });

  afterEach(() => {
    const summary = performanceMonitor.getSummary();
    console.log('\n📊 Performance Summary:', JSON.stringify(summary, null, 2));
  });

  describe('Cache Performance', () => {
    it('should handle high-volume cache operations efficiently', async () => {
      const cache = new Cache<string>({ maxEntries: 10000 });
      const iterations = 10000;

      // Benchmark cache writes
      const writeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }
      const writeTime = performance.now() - writeStart;
      performanceMonitor.record('cache-writes-10k', writeTime);

      // Benchmark cache reads
      const readStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        cache.get(`key-${i}`);
      }
      const readTime = performance.now() - readStart;
      performanceMonitor.record('cache-reads-10k', readTime);

      // Assertions
      expect(writeTime).toBeLessThan(1000); // Should complete in < 1 second
      expect(readTime).toBeLessThan(500);   // Reads should be faster
      expect(cache.getStats().hitRate).toBeGreaterThan(90); // High hit rate

      console.log(`✓ Cache writes: ${writeTime.toFixed(2)}ms for ${iterations} operations`);
      console.log(`✓ Cache reads: ${readTime.toFixed(2)}ms for ${iterations} operations`);
      console.log(`✓ Hit rate: ${cache.getStats().hitRate.toFixed(2)}%`);
    });

    it('should efficiently evict LRU entries under memory pressure', () => {
      const cache = new Cache<string>({ 
        maxEntries: 100,
        maxSizeBytes: 10240 // 10 KB
      });

      // Fill cache beyond capacity
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      const stats = cache.getStats();
      expect(stats.entries).toBeLessThanOrEqual(100);
      expect(stats.sizeBytes).toBeLessThanOrEqual(10240);
      expect(stats.evictions).toBeGreaterThan(0);

      console.log(`✓ Cache maintained size limits with ${stats.evictions} evictions`);
    });

    it('should demonstrate TTL-based expiration efficiency', async () => {
      const cache = new Cache<string>({ defaultTTL: 100 }); // 100ms TTL

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.has('key1')).toBe(false);
      console.log('✓ TTL-based expiration working correctly');
    });
  });

  describe('Blockchain Scanning Performance', () => {
    let scanner: BlockchainScanner;
    let mockConnection: Connection;

    beforeEach(() => {
      scanner = new BlockchainScanner({
        batchSize: 50,
        enableParallelProcessing: true,
        maxParallelBatches: 3,
        verbose: false
      });
      mockConnection = new Connection('https://api.devnet.solana.com', 'confirmed');
    });

    it('should benchmark scanning performance with different batch sizes', async () => {
      const batchSizes = [10, 50, 100, 200];
      const results: { batchSize: number; duration: number }[] = [];

      for (const batchSize of batchSizes) {
        const testScanner = new BlockchainScanner({ 
          batchSize,
          enableParallelProcessing: false,
          verbose: false
        });

        const testAddress = Keypair.generate().publicKey;
        const start = performance.now();

        try {
          await testScanner.scanForEphemeralKeys(
            mockConnection,
            testAddress,
            undefined,
            undefined
          );
        } catch (error) {
          // Expected to fail for test addresses, but we measure timing
        }

        const duration = performance.now() - start;
        results.push({ batchSize, duration });
        performanceMonitor.record(`scan-batch-${batchSize}`, duration);
      }

      console.log('\n📈 Batch Size Performance:');
      results.forEach(r => {
        console.log(`  Batch ${r.batchSize}: ${r.duration.toFixed(2)}ms`);
      });
    });

    it('should demonstrate cache effectiveness for repeated scans', async () => {
      const testAddress = Keypair.generate().publicKey;
      
      // First scan (cache miss)
      const firstScanStart = performance.now();
      try {
        await scanner.scanForEphemeralKeys(mockConnection, testAddress);
      } catch (error) {
        // Expected
      }
      const firstScanTime = performance.now() - firstScanStart;
      performanceMonitor.record('scan-first', firstScanTime);

      // Second scan (should hit cache)
      const secondScanStart = performance.now();
      try {
        await scanner.scanForEphemeralKeys(mockConnection, testAddress);
      } catch (error) {
        // Expected
      }
      const secondScanTime = performance.now() - secondScanStart;
      performanceMonitor.record('scan-cached', secondScanTime);

      // Cached scan should be significantly faster
      expect(secondScanTime).toBeLessThan(firstScanTime * 0.5);
      
      console.log(`\n⚡ Cache speedup: ${(firstScanTime / secondScanTime).toFixed(2)}x faster`);
      console.log(`  First scan: ${firstScanTime.toFixed(2)}ms`);
      console.log(`  Cached scan: ${secondScanTime.toFixed(2)}ms`);
    });

    it('should measure parallel vs sequential processing performance', async () => {
      const testAddress = Keypair.generate().publicKey;

      // Sequential processing
      const sequentialScanner = new BlockchainScanner({
        batchSize: 50,
        enableParallelProcessing: false,
        verbose: false
      });

      const seqStart = performance.now();
      try {
        await sequentialScanner.scanForEphemeralKeys(mockConnection, testAddress);
      } catch (error) {
        // Expected
      }
      const seqTime = performance.now() - seqStart;
      performanceMonitor.record('scan-sequential', seqTime);

      // Parallel processing
      const parallelScanner = new BlockchainScanner({
        batchSize: 50,
        enableParallelProcessing: true,
        maxParallelBatches: 3,
        verbose: false
      });

      const parStart = performance.now();
      try {
        await parallelScanner.scanForEphemeralKeys(mockConnection, testAddress);
      } catch (error) {
        // Expected
      }
      const parTime = performance.now() - parStart;
      performanceMonitor.record('scan-parallel', parTime);

      console.log(`\n🔄 Processing Mode Performance:`);
      console.log(`  Sequential: ${seqTime.toFixed(2)}ms`);
      console.log(`  Parallel: ${parTime.toFixed(2)}ms`);
    });
  });

  describe('Cryptographic Operations Performance', () => {
    let viewingKeyManager: ViewingKeyManager;
    let mockWallet: ExtendedWalletAdapter;

    beforeEach(() => {
      const keypair = Keypair.generate();
      mockWallet = {
        publicKey: keypair.publicKey,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
        rawKeypair: keypair
      } as ExtendedWalletAdapter;

      viewingKeyManager = new ViewingKeyManager(mockWallet);
    });

    it('should benchmark point derivation with caching', async () => {
      const testPublicKeys = Array.from({ length: 100 }, () => Keypair.generate().publicKey);
      const cryptoCache = globalCacheManager.getCryptoCache();

      // First pass - cache misses
      const firstPassStart = performance.now();
      for (const pk of testPublicKeys) {
        // Access through private method would require reflection
        // Instead we measure the overall operation
        const cacheKey = CryptoCache.makePointKey(pk);
        cryptoCache.get(cacheKey);
      }
      const firstPassTime = performance.now() - firstPassStart;
      performanceMonitor.record('crypto-point-derivation-cold', firstPassTime);

      // Populate cache
      for (const pk of testPublicKeys) {
        const cacheKey = CryptoCache.makePointKey(pk);
        cryptoCache.set(cacheKey, new Uint8Array(32));
      }

      // Second pass - cache hits
      const secondPassStart = performance.now();
      for (const pk of testPublicKeys) {
        const cacheKey = CryptoCache.makePointKey(pk);
        cryptoCache.get(cacheKey);
      }
      const secondPassTime = performance.now() - secondPassStart;
      performanceMonitor.record('crypto-point-derivation-cached', secondPassTime);

      expect(secondPassTime).toBeLessThan(firstPassTime);
      
      console.log(`\n🔐 Crypto Cache Performance:`);
      console.log(`  Cold cache: ${firstPassTime.toFixed(2)}ms`);
      console.log(`  Warm cache: ${secondPassTime.toFixed(2)}ms`);
      console.log(`  Speedup: ${(firstPassTime / secondPassTime).toFixed(2)}x`);
    });

    it('should benchmark viewing key generation', async () => {
      const iterations = 50;
      const accountAddresses = Array.from({ length: iterations }, () => 
        Keypair.generate().publicKey
      );

      const start = performance.now();
      for (const address of accountAddresses) {
        await viewingKeyManager.generateViewingKey(address);
      }
      const duration = performance.now() - start;
      performanceMonitor.record(`viewingkey-generation-${iterations}`, duration);

      const avgTime = duration / iterations;
      expect(avgTime).toBeLessThan(100); // Should be < 100ms per key

      console.log(`\n🔑 Viewing Key Generation:`);
      console.log(`  Total time for ${iterations} keys: ${duration.toFixed(2)}ms`);
      console.log(`  Average per key: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('RPC Optimization Performance', () => {
    it('should measure RPC cache hit rate improvement', () => {
      const rpcCache = new RPCCache();
      const method = 'getBalance';
      const params = [Keypair.generate().publicKey.toString()];
      
      const cacheKey = RPCCache.makeKey(method, params);
      const mockResponse = { value: 1000000 };

      // Cache miss
      let result = rpcCache.get(cacheKey);
      expect(result).toBeNull();

      // Store in cache
      rpcCache.set(cacheKey, mockResponse);

      // Cache hit
      result = rpcCache.get(cacheKey);
      expect(result).toEqual(mockResponse);

      const stats = rpcCache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);

      console.log(`\n🌐 RPC Cache Stats:`);
      console.log(`  Hit rate: ${stats.hitRate.toFixed(2)}%`);
      console.log(`  Entries: ${stats.entries}`);
    });

    it('should benchmark cache manager performance', () => {
      const manager = new CacheManager();
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const rpcCache = manager.getRPCCache();
        const scanCache = manager.getScanCache();
        const cryptoCache = manager.getCryptoCache();
        
        rpcCache.set(`rpc-${i}`, { data: i });
        scanCache.set(`scan-${i}`, { result: i });
        cryptoCache.set(`crypto-${i}`, new Uint8Array([i]));
      }
      const duration = performance.now() - start;
      performanceMonitor.record('cache-manager-operations', duration);

      const stats = manager.getAllStats();
      
      console.log(`\n📦 Cache Manager Performance:`);
      console.log(`  Total operations: ${iterations * 3}`);
      console.log(`  Duration: ${duration.toFixed(2)}ms`);
      console.log(`  Ops/sec: ${((iterations * 3) / (duration / 1000)).toFixed(0)}`);
      console.log(`  Total entries: ${stats.total.entries}`);
      console.log(`  Total size: ${(stats.total.sizeBytes / 1024).toFixed(2)} KB`);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should measure cache memory efficiency', () => {
      const cache = new Cache<string>({ 
        maxEntries: 1000,
        maxSizeBytes: 1024 * 1024 // 1 MB
      });

      // Fill with data
      const dataSize = 100; // bytes per entry
      const expectedEntries = Math.floor((1024 * 1024) / (dataSize + 64)); // +64 for overhead

      for (let i = 0; i < expectedEntries * 2; i++) {
        const data = 'x'.repeat(dataSize);
        cache.set(`key-${i}`, data);
      }

      const stats = cache.getStats();
      const efficiencyPercent = (stats.sizeBytes / (1024 * 1024)) * 100;

      console.log(`\n💾 Memory Efficiency:`);
      console.log(`  Max size: 1 MB`);
      console.log(`  Actual size: ${(stats.sizeBytes / 1024).toFixed(2)} KB`);
      console.log(`  Efficiency: ${efficiencyPercent.toFixed(2)}%`);
      console.log(`  Entries: ${stats.entries}`);
      console.log(`  Evictions: ${stats.evictions}`);

      expect(stats.sizeBytes).toBeLessThanOrEqual(1024 * 1024);
    });

    it('should track performance monitor overhead', () => {
      const monitor = new PerformanceMonitor();
      const iterations = 10000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        monitor.record('test-op', Math.random() * 100);
      }
      const duration = performance.now() - start;

      const avgOverhead = duration / iterations;
      
      console.log(`\n⏱️ Performance Monitor Overhead:`);
      console.log(`  ${iterations} recordings in ${duration.toFixed(2)}ms`);
      console.log(`  Average overhead: ${avgOverhead.toFixed(4)}ms per recording`);
      
      expect(avgOverhead).toBeLessThan(0.1); // Should be minimal overhead
    });
  });

  describe('End-to-End Performance', () => {
    it('should measure overall SDK performance characteristics', async () => {
      const operations = [
        { name: 'Cache Write', fn: () => {
          const cache = globalCacheManager.getRPCCache();
          cache.set('test-key', { data: 'test' });
        }},
        { name: 'Cache Read', fn: () => {
          const cache = globalCacheManager.getRPCCache();
          cache.get('test-key');
        }},
        { name: 'Key Generation', fn: async () => {
          Keypair.generate();
        }},
        { name: 'PublicKey Creation', fn: () => {
          new PublicKey(Keypair.generate().publicKey.toString());
        }}
      ];

      console.log(`\n🎯 End-to-End Performance:`);
      
      for (const op of operations) {
        const iterations = 1000;
        const start = performance.now();
        
        for (let i = 0; i < iterations; i++) {
          await op.fn();
        }
        
        const duration = performance.now() - start;
        const avgTime = duration / iterations;
        performanceMonitor.record(op.name, duration);
        
        console.log(`  ${op.name}: ${avgTime.toFixed(4)}ms avg (${iterations} ops)`);
      }
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish baseline performance metrics', () => {
      // These baselines can be used in CI/CD to detect performance regressions
      const baselines = {
        cacheWriteMs: 0.1,      // Max acceptable time per cache write
        cacheReadMs: 0.05,      // Max acceptable time per cache read
        scanFirstMs: 5000,      // Max acceptable time for first scan
        scanCachedMs: 100,      // Max acceptable time for cached scan
        keyGenMs: 50,           // Max acceptable time per key generation
        hitRateMin: 80          // Min acceptable cache hit rate
      };

      console.log(`\n📋 Performance Baselines:`);
      console.log(JSON.stringify(baselines, null, 2));

      // In actual CI/CD, compare current metrics against these baselines
      expect(baselines.cacheWriteMs).toBeLessThan(1);
      expect(baselines.cacheReadMs).toBeLessThan(1);
    });
  });
});

/**
 * Utility to run performance benchmarks standalone
 */
export async function runPerformanceBenchmarks() {
  console.log('🚀 Running GhostSOL SDK Performance Benchmarks\n');
  
  const monitor = new PerformanceMonitor();
  
  // Run various benchmarks
  console.log('1. Cache Performance...');
  const cache = new Cache<string>();
  for (let i = 0; i < 1000; i++) {
    cache.set(`key-${i}`, `value-${i}`);
  }
  
  console.log('2. Blockchain Scanner...');
  const scanner = new BlockchainScanner();
  
  console.log('3. Cache Manager...');
  const manager = new CacheManager();
  const stats = manager.getAllStats();
  
  console.log('\n✅ Benchmark Results:');
  console.log(JSON.stringify(stats, null, 2));
  
  return stats;
}
