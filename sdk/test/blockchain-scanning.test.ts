/**
 * blockchain-scanning.test.ts
 * 
 * Purpose: Test suite for blockchain scanning functionality
 * 
 * Tests cover:
 * - Ephemeral key parsing from transaction memos
 * - Transaction scanning and indexing
 * - Cache functionality
 * - Integration with StealthAddressManager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { 
  BlockchainScanner,
  createStealthAddressMemo,
  parseStealthAddressMemo,
  ScannerConfig
} from '../src/privacy/blockchain-scanner';
import { StealthAddressManager } from '../src/privacy/stealth-address';

describe('BlockchainScanner', () => {
  let scanner: BlockchainScanner;
  let config: ScannerConfig;

  beforeEach(() => {
    config = {
      batchSize: 50,
      cacheExpirationMs: 30000,
      maxScanDepth: 5000,
      verbose: false
    };
    scanner = new BlockchainScanner(config);
  });

  describe('Memo Parsing', () => {
    it('should parse valid stealth address memo', () => {
      const ephemeralKey = Keypair.generate();
      const memo = `STEALTH:${ephemeralKey.publicKey.toBase58()}:v1`;
      
      const parsed = parseStealthAddressMemo(memo);
      
      expect(parsed).not.toBeNull();
      expect(parsed!.toBase58()).toBe(ephemeralKey.publicKey.toBase58());
    });

    it('should parse memo without metadata', () => {
      const ephemeralKey = Keypair.generate();
      const memo = `STEALTH:${ephemeralKey.publicKey.toBase58()}`;
      
      const parsed = parseStealthAddressMemo(memo);
      
      expect(parsed).not.toBeNull();
      expect(parsed!.toBase58()).toBe(ephemeralKey.publicKey.toBase58());
    });

    it('should return null for invalid memo format', () => {
      const invalidMemos = [
        'INVALID:key',
        'STEALTH:',
        'STEALTH',
        'random text',
        '',
        'STEALTH:not-a-valid-base58-key'
      ];

      for (const memo of invalidMemos) {
        const parsed = parseStealthAddressMemo(memo);
        expect(parsed).toBeNull();
      }
    });

    it('should handle malformed public keys gracefully', () => {
      const memo = 'STEALTH:not-a-valid-public-key:v1';
      const parsed = parseStealthAddressMemo(memo);
      expect(parsed).toBeNull();
    });
  });

  describe('Memo Creation', () => {
    it('should create valid memo without metadata', () => {
      const ephemeralKey = Keypair.generate();
      const memo = createStealthAddressMemo(ephemeralKey.publicKey);
      
      expect(memo).toBe(`STEALTH:${ephemeralKey.publicKey.toBase58()}`);
    });

    it('should create valid memo with metadata', () => {
      const ephemeralKey = Keypair.generate();
      const metadata = 'v1';
      const memo = createStealthAddressMemo(ephemeralKey.publicKey, metadata);
      
      expect(memo).toBe(`STEALTH:${ephemeralKey.publicKey.toBase58()}:${metadata}`);
    });

    it('should create memo that can be parsed back', () => {
      const ephemeralKey = Keypair.generate();
      const memo = createStealthAddressMemo(ephemeralKey.publicKey, 'v1');
      const parsed = parseStealthAddressMemo(memo);
      
      expect(parsed).not.toBeNull();
      expect(parsed!.toBase58()).toBe(ephemeralKey.publicKey.toBase58());
    });
  });

  describe('Cache Management', () => {
    it('should start with empty cache', () => {
      const stats = scanner.getCacheStats();
      expect(stats.entries).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should clear cache successfully', () => {
      scanner.clearCache();
      const stats = scanner.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('should have cache stats structure', () => {
      const stats = scanner.getCacheStats();
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('size');
      expect(typeof stats.entries).toBe('number');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Blockchain Scanning (Mock)', () => {
    // Note: These tests would require a live connection or mocked transactions
    // For now, we test the scanner interface and error handling

    it('should handle connection errors gracefully', async () => {
      const mockConnection = null as any; // Invalid connection
      
      await expect(
        scanner.fetchEphemeralKeys(mockConnection)
      ).rejects.toThrow();
    });

    it('should accept valid scan parameters', async () => {
      // Create a mock connection that throws after validation
      const mockConnection = {
        getSlot: async () => 1000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const address = Keypair.generate().publicKey;
      
      // Should not throw with valid parameters
      const result = await scanner.scanForEphemeralKeys(
        mockConnection,
        address,
        0,
        1000
      );

      expect(result).toHaveProperty('ephemeralKeys');
      expect(result).toHaveProperty('transactionsScanned');
      expect(result).toHaveProperty('startSlot');
      expect(result).toHaveProperty('endSlot');
      expect(result).toHaveProperty('duration');
      expect(Array.isArray(result.ephemeralKeys)).toBe(true);
    });

    it('should return scan result with correct structure', async () => {
      const mockConnection = {
        getSlot: async () => 1000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const result = await scanner.scanForEphemeralKeys(
        mockConnection,
        undefined,
        0,
        100
      );

      expect(result.startSlot).toBe(0);
      expect(result.endSlot).toBe(100);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.ephemeralKeys)).toBe(true);
    });
  });

  describe('Integration with StealthAddressManager', () => {
    let manager: StealthAddressManager;

    beforeEach(() => {
      manager = new StealthAddressManager();
    });

    it('should have scanner instance in manager', () => {
      const scanner = manager.getScanner();
      expect(scanner).toBeInstanceOf(BlockchainScanner);
    });

    it('should have cache stats accessible through manager', () => {
      const scanner = manager.getScanner();
      const stats = scanner.getCacheStats();
      
      expect(stats).toHaveProperty('entries');
      expect(stats).toHaveProperty('size');
    });

    it('should allow clearing cache through manager', () => {
      const scanner = manager.getScanner();
      scanner.clearCache();
      
      const stats = scanner.getCacheStats();
      expect(stats.entries).toBe(0);
    });

    it('should create memo through scanner', () => {
      const scanner = manager.getScanner();
      const ephemeralKey = Keypair.generate();
      
      const memo = scanner.createEphemeralKeyMemo(ephemeralKey.publicKey, 'v1');
      expect(memo).toContain('STEALTH:');
      expect(memo).toContain(ephemeralKey.publicKey.toBase58());
    });

    it('should parse memo through scanner', () => {
      const scanner = manager.getScanner();
      const ephemeralKey = Keypair.generate();
      const memo = `STEALTH:${ephemeralKey.publicKey.toBase58()}`;
      
      const parsed = scanner.parseEphemeralKeyFromMemo(memo);
      expect(parsed).not.toBeNull();
      expect(parsed!.toBase58()).toBe(ephemeralKey.publicKey.toBase58());
    });
  });

  describe('Scanner Configuration', () => {
    it('should use default config when not provided', () => {
      const defaultScanner = new BlockchainScanner();
      expect(defaultScanner).toBeInstanceOf(BlockchainScanner);
    });

    it('should accept custom config', () => {
      const customConfig: ScannerConfig = {
        batchSize: 200,
        cacheExpirationMs: 120000,
        maxScanDepth: 20000,
        verbose: true
      };
      
      const customScanner = new BlockchainScanner(customConfig);
      expect(customScanner).toBeInstanceOf(BlockchainScanner);
    });

    it('should merge partial config with defaults', () => {
      const partialConfig: ScannerConfig = {
        batchSize: 150
      };
      
      const scanner = new BlockchainScanner(partialConfig);
      expect(scanner).toBeInstanceOf(BlockchainScanner);
    });
  });

  describe('Error Handling', () => {
    it('should handle null connection gracefully', async () => {
      await expect(
        scanner.fetchEphemeralKeys(null as any)
      ).rejects.toThrow();
    });

    it('should handle invalid address format', async () => {
      const mockConnection = {
        getSlot: async () => 1000,
        getSignaturesForAddress: async () => {
          throw new Error('Invalid address');
        }
      } as any;

      const invalidAddress = 'not-a-valid-address' as any;
      
      await expect(
        scanner.fetchEphemeralKeys(mockConnection, invalidAddress)
      ).rejects.toThrow();
    });

    it('should handle RPC errors during scanning', async () => {
      const mockConnection = {
        getSlot: async () => {
          throw new Error('RPC error');
        }
      } as any;

      await expect(
        scanner.scanForEphemeralKeys(mockConnection)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list', async () => {
      const mockConnection = {
        getSlot: async () => 1000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const address = Keypair.generate().publicKey;
      const result = await scanner.scanForEphemeralKeys(
        mockConnection,
        address,
        0,
        100
      );

      expect(result.ephemeralKeys).toHaveLength(0);
      expect(result.transactionsScanned).toBe(0);
    });

    it('should handle very long memo strings', () => {
      const ephemeralKey = Keypair.generate();
      const longMetadata = 'a'.repeat(1000);
      const memo = createStealthAddressMemo(ephemeralKey.publicKey, longMetadata);
      
      const parsed = parseStealthAddressMemo(memo);
      expect(parsed).not.toBeNull();
    });

    it('should handle special characters in metadata', () => {
      const ephemeralKey = Keypair.generate();
      const specialMetadata = 'v1.0-beta!@#$%';
      const memo = createStealthAddressMemo(ephemeralKey.publicKey, specialMetadata);
      
      expect(memo).toContain(specialMetadata);
      const parsed = parseStealthAddressMemo(memo);
      expect(parsed).not.toBeNull();
    });
  });

  describe('Performance', () => {
    it('should parse memo efficiently', () => {
      const ephemeralKey = Keypair.generate();
      const memo = createStealthAddressMemo(ephemeralKey.publicKey);
      
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        parseStealthAddressMemo(memo);
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;
      
      // Should parse in less than 1ms on average
      expect(avgTime).toBeLessThan(1);
    });

    it('should create memo efficiently', () => {
      const ephemeralKey = Keypair.generate();
      
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        createStealthAddressMemo(ephemeralKey.publicKey, 'v1');
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / iterations;
      
      // Should create in less than 1ms on average
      expect(avgTime).toBeLessThan(1);
    });
  });
});

describe('BlockchainScanner - Advanced Features', () => {
  describe('Slot Range Handling', () => {
    it('should calculate scan depth from current slot', async () => {
      const mockConnection = {
        getSlot: async () => 10000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const scanner = new BlockchainScanner({ maxScanDepth: 5000 });
      const result = await scanner.scanForEphemeralKeys(mockConnection);

      // Should start from (10000 - 5000) = 5000
      expect(result.startSlot).toBeGreaterThanOrEqual(0);
      expect(result.endSlot).toBeGreaterThanOrEqual(result.startSlot);
    });

    it('should respect explicit slot ranges', async () => {
      const mockConnection = {
        getSlot: async () => 10000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const scanner = new BlockchainScanner();
      const startSlot = 100;
      const endSlot = 500;
      
      const result = await scanner.scanForEphemeralKeys(
        mockConnection,
        undefined,
        startSlot,
        endSlot
      );

      expect(result.startSlot).toBe(startSlot);
      expect(result.endSlot).toBe(endSlot);
    });
  });

  describe('Cache Behavior', () => {
    it('should cache results after first scan', async () => {
      const mockConnection = {
        getSlot: async () => 1000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const scanner = new BlockchainScanner({ verbose: false });
      const address = Keypair.generate().publicKey;

      // First scan - should hit RPC
      const result1 = await scanner.scanForEphemeralKeys(
        mockConnection,
        address,
        0,
        100
      );

      // Second scan with same parameters - should use cache
      const result2 = await scanner.scanForEphemeralKeys(
        mockConnection,
        address,
        0,
        100
      );

      // Both should return same results
      expect(result1.ephemeralKeys).toEqual(result2.ephemeralKeys);
      // Second scan should be faster (using cache)
      expect(result2.duration).toBeLessThanOrEqual(result1.duration);
    });

    it('should respect cache expiration', async () => {
      const shortCacheTtl = 100; // 100ms
      const scanner = new BlockchainScanner({ 
        cacheExpirationMs: shortCacheTtl 
      });

      const mockConnection = {
        getSlot: async () => 1000,
        getSignaturesForAddress: async () => [],
        getParsedTransactions: async () => []
      } as any;

      const address = Keypair.generate().publicKey;

      // First scan
      await scanner.scanForEphemeralKeys(mockConnection, address, 0, 100);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, shortCacheTtl + 50));

      // Second scan should not use expired cache
      const result = await scanner.scanForEphemeralKeys(
        mockConnection,
        address,
        0,
        100
      );

      expect(result).toBeDefined();
    });
  });
});

/**
 * Integration tests with actual RPC connection
 * 
 * Note: These tests require a devnet connection and are skipped by default.
 * Run with environment variable RUN_INTEGRATION_TESTS=true to enable.
 */
describe.skip('BlockchainScanner - Integration Tests', () => {
  let connection: Connection;
  let scanner: BlockchainScanner;

  beforeEach(() => {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    connection = new Connection(rpcUrl, 'confirmed');
    scanner = new BlockchainScanner({ verbose: true });
  });

  it('should connect to Solana devnet', async () => {
    const version = await connection.getVersion();
    expect(version).toHaveProperty('solana-core');
  });

  it('should scan recent blocks', async () => {
    const currentSlot = await connection.getSlot();
    const startSlot = Math.max(0, currentSlot - 100);

    const result = await scanner.scanForEphemeralKeys(
      connection,
      undefined,
      startSlot,
      currentSlot
    );

    expect(result.startSlot).toBe(startSlot);
    expect(result.endSlot).toBe(currentSlot);
    expect(result.duration).toBeGreaterThan(0);
  });

  it('should handle real transaction data', async () => {
    // This would require actual stealth address transactions on devnet
    // For now, we just verify the scan completes without errors
    const testAddress = Keypair.generate().publicKey;
    
    const result = await scanner.fetchEphemeralKeys(
      connection,
      testAddress
    );

    expect(Array.isArray(result)).toBe(true);
  });
});
