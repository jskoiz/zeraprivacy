/**
 * privacy/payment-scanner.ts
 * 
 * Purpose: Background payment scanning service for detecting stealth payments
 * 
 * This service allows users to discover incoming stealth payments by scanning
 * the blockchain for transactions sent to their stealth addresses. It implements
 * optimized scanning strategies to minimize overhead while maintaining good UX.
 * 
 * Key Features:
 * - Scan recent transactions for incoming stealth payments
 * - Background scanning with configurable intervals
 * - Optimized scanning (filter by program, parallel batches)
 * - Memory and CPU efficient
 */

import { 
  Connection, 
  PublicKey, 
  ConfirmedSignatureInfo,
  ParsedTransactionWithMeta,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { StealthMetaAddress, StealthPayment, PaymentScanConfig } from './types';
import { StealthAddressManager } from './stealth-address';
import { PrivacyError } from './errors';

/**
 * Default configuration for payment scanning
 */
const DEFAULT_SCAN_CONFIG: Required<PaymentScanConfig> = {
  scanIntervalMs: 30000, // 30 seconds
  batchSize: 100,
  maxTransactions: 1000,
  programId: SystemProgram.programId, // Scan all system program transactions
};

/**
 * PaymentScanner class for detecting incoming stealth payments
 */
export class PaymentScanner {
  private stealthManager: StealthAddressManager;
  private config: Required<PaymentScanConfig>;
  private backgroundScanInterval?: ReturnType<typeof setInterval>;
  private lastScannedSlot: number = 0;

  constructor(
    private connection: Connection,
    private metaAddress: StealthMetaAddress,
    config?: PaymentScanConfig
  ) {
    this.stealthManager = new StealthAddressManager(connection);
    this.config = { ...DEFAULT_SCAN_CONFIG, ...config };
  }

  /**
   * Scan recent transactions for incoming stealth payments
   * 
   * @param startSlot - Starting slot (optional, defaults to last scanned)
   * @param endSlot - Ending slot (optional, defaults to current)
   * @returns Array of detected stealth payments
   */
  async scanForPayments(
    startSlot?: number,
    endSlot?: number
  ): Promise<StealthPayment[]> {
    try {
      const payments: StealthPayment[] = [];
      const currentSlot = await this.connection.getSlot();

      // Use provided slots or defaults
      const scanStartSlot = startSlot ?? this.lastScannedSlot;
      const scanEndSlot = endSlot ?? currentSlot;

      // Get recent transaction signatures
      const signatures = await this.getRecentSignatures(scanStartSlot, scanEndSlot);

      console.log(`Scanning ${signatures.length} transactions for stealth payments...`);

      // Process transactions in batches for better performance
      const batches = this.chunkArray(signatures, this.config.batchSize);
      
      for (const batch of batches) {
        const batchPayments = await this.scanBatch(batch);
        payments.push(...batchPayments);
      }

      // Update last scanned slot
      this.lastScannedSlot = scanEndSlot;

      console.log(`Found ${payments.length} stealth payment(s)`);

      return payments;
    } catch (error) {
      throw new PrivacyError(
        `Failed to scan for payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Scan a batch of transactions in parallel
   * 
   * @param signatures - Batch of transaction signatures
   * @returns Array of detected stealth payments
   */
  private async scanBatch(
    signatures: ConfirmedSignatureInfo[]
  ): Promise<StealthPayment[]> {
    try {
      // Fetch all transactions in batch
      const txPromises = signatures.map(sig => 
        this.connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      );

      const transactions = await Promise.all(txPromises);

      // Check each transaction for stealth payments
      const paymentPromises = transactions.map((tx, index) => 
        this.checkTransaction(tx, signatures[index])
      );

      const payments = await Promise.all(paymentPromises);

      // Filter out null values (non-stealth transactions)
      return payments.filter((p): p is StealthPayment => p !== null);
    } catch (error) {
      console.error('Error scanning batch:', error);
      return [];
    }
  }

  /**
   * Check if a single transaction is a stealth payment for this recipient
   * 
   * @param tx - Parsed transaction
   * @param sigInfo - Transaction signature info
   * @returns StealthPayment if detected, null otherwise
   */
  private async checkTransaction(
    tx: ParsedTransactionWithMeta | null,
    sigInfo: ConfirmedSignatureInfo
  ): Promise<StealthPayment | null> {
    try {
      if (!tx || !tx.meta) {
        return null;
      }

      // Extract ephemeral public key from transaction memo or account
      const ephemeralKey = this.extractEphemeralKey(tx);
      if (!ephemeralKey) {
        return null;
      }

      // Derive expected stealth address using our viewing key
      const expectedStealthAddress = this.stealthManager.deriveStealthAddressFromEphemeral(
        this.metaAddress,
        ephemeralKey
      );

      // Check if any output matches our stealth address
      const amount = this.checkTransactionOutputs(tx, expectedStealthAddress);
      if (amount === null) {
        return null;
      }

      // Found a stealth payment!
      return {
        signature: sigInfo.signature,
        amount,
        stealthAddress: expectedStealthAddress,
        blockTime: tx.blockTime ?? null,
        ephemeralKey,
        slot: sigInfo.slot,
      };
    } catch (error) {
      // Silently skip transactions that can't be parsed
      return null;
    }
  }

  /**
   * Extract ephemeral public key from transaction
   * 
   * The ephemeral key is typically stored in:
   * 1. Transaction memo field
   * 2. First non-system account
   * 3. Custom instruction data
   * 
   * @param tx - Parsed transaction
   * @returns Ephemeral public key or null if not found
   */
  private extractEphemeralKey(tx: ParsedTransactionWithMeta): PublicKey | null {
    try {
      // Strategy 1: Check memo field
      const memoInstruction = tx.transaction.message.instructions.find(
        (ix: any) => ix.programId?.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
      );

      if (memoInstruction && 'parsed' in memoInstruction && memoInstruction.parsed) {
        // Memo format: "ephemeral:<base58_pubkey>"
        const memo = memoInstruction.parsed as string;
        if (memo.startsWith('ephemeral:')) {
          const keyStr = memo.substring('ephemeral:'.length);
          try {
            return new PublicKey(keyStr);
          } catch {
            // Invalid public key in memo
          }
        }
      }

      // Strategy 2: Check account keys (first writable non-system account)
      const accountKeys = tx.transaction.message.accountKeys;
      for (const account of accountKeys) {
        const pubkey = typeof account === 'string' ? new PublicKey(account) : account.pubkey;
        
        // Skip system accounts
        if (this.isSystemAccount(pubkey)) {
          continue;
        }

        // This could be the ephemeral key
        return pubkey;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check transaction outputs for stealth address match
   * 
   * @param tx - Parsed transaction
   * @param stealthAddress - Expected stealth address
   * @returns Amount received or null if no match
   */
  private checkTransactionOutputs(
    tx: ParsedTransactionWithMeta,
    stealthAddress: PublicKey
  ): number | null {
    try {
      if (!tx.meta) {
        return null;
      }

      const stealthAddressStr = stealthAddress.toString();

      // Check post-transaction balances
      const accountKeys = tx.transaction.message.accountKeys;
      const postBalances = tx.meta.postBalances;
      const preBalances = tx.meta.preBalances;

      for (let i = 0; i < accountKeys.length; i++) {
        const account = accountKeys[i];
        const pubkeyStr = typeof account === 'string' ? account : account.pubkey.toString();

        if (pubkeyStr === stealthAddressStr) {
          // Found a match! Calculate amount received
          const postBalance = postBalances[i] || 0;
          const preBalance = preBalances[i] || 0;
          const amountReceived = postBalance - preBalance;

          if (amountReceived > 0) {
            return amountReceived;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a public key is a system account
   * 
   * @param pubkey - Public key to check
   * @returns True if system account
   */
  private isSystemAccount(pubkey: PublicKey): boolean {
    const systemAccounts = [
      SystemProgram.programId.toString(),
      '11111111111111111111111111111111',
    ];

    return systemAccounts.includes(pubkey.toString());
  }

  /**
   * Get recent transaction signatures within slot range
   * 
   * @param startSlot - Starting slot
   * @param endSlot - Ending slot
   * @returns Array of transaction signatures
   */
  private async getRecentSignatures(
    startSlot: number,
    endSlot: number
  ): Promise<ConfirmedSignatureInfo[]> {
    try {
      const signatures: ConfirmedSignatureInfo[] = [];
      let before: string | undefined;
      let hasMore = true;

      // Fetch signatures in batches until we have enough or reach the limit
      while (hasMore && signatures.length < this.config.maxTransactions) {
        const batch = await this.connection.getSignaturesForAddress(
          this.config.programId,
          {
            limit: 1000,
            before,
          }
        );

        if (batch.length === 0) {
          break;
        }

        // Filter by slot range
        const filtered = batch.filter(sig => {
          const inRange = sig.slot >= startSlot && sig.slot <= endSlot;
          return inRange;
        });

        signatures.push(...filtered);

        // Check if we've reached the start slot
        const oldestSlot = batch[batch.length - 1].slot;
        if (oldestSlot < startSlot) {
          hasMore = false;
        }

        // Set cursor for next batch
        before = batch[batch.length - 1].signature;
      }

      // Limit to max transactions
      return signatures.slice(0, this.config.maxTransactions);
    } catch (error) {
      throw new PrivacyError(
        `Failed to get recent signatures: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Start background scanning with automatic interval
   * 
   * @param onPaymentFound - Callback when payment is found
   * @param intervalMs - Scan interval (optional, defaults to config)
   * @returns Stop function to halt background scanning
   */
  async startBackgroundScan(
    onPaymentFound: (payment: StealthPayment) => void,
    intervalMs?: number
  ): Promise<() => void> {
    try {
      // Initialize last scanned slot
      if (this.lastScannedSlot === 0) {
        this.lastScannedSlot = await this.connection.getSlot();
      }

      const interval = intervalMs ?? this.config.scanIntervalMs;

      console.log(`Starting background payment scanning (interval: ${interval}ms)`);

      // Set up periodic scanning
      this.backgroundScanInterval = setInterval(async () => {
        try {
          const currentSlot = await this.connection.getSlot();
          const payments = await this.scanForPayments(this.lastScannedSlot, currentSlot);

          // Notify for each payment found
          payments.forEach(onPaymentFound);
        } catch (error) {
          console.error('Background scan error:', error);
        }
      }, interval);

      // Return stop function
      return () => this.stopBackgroundScan();
    } catch (error) {
      throw new PrivacyError(
        `Failed to start background scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Stop background scanning
   */
  stopBackgroundScan(): void {
    if (this.backgroundScanInterval) {
      clearInterval(this.backgroundScanInterval);
      this.backgroundScanInterval = undefined;
      console.log('Background payment scanning stopped');
    }
  }

  /**
   * Scan only transactions from a specific program (optimized)
   * 
   * @param programId - Program ID to filter by
   * @param limit - Maximum number of transactions to scan
   * @returns Array of detected stealth payments
   */
  async scanProgramTransactions(
    programId: PublicKey,
    limit: number = 1000
  ): Promise<StealthPayment[]> {
    try {
      const payments: StealthPayment[] = [];

      // Get signatures for specific program
      const signatures = await this.connection.getSignaturesForAddress(
        programId,
        { limit }
      );

      console.log(`Scanning ${signatures.length} program transactions...`);

      // Process in batches
      const batches = this.chunkArray(signatures, this.config.batchSize);
      
      for (const batch of batches) {
        const batchPayments = await this.scanBatch(batch);
        payments.push(...batchPayments);
      }

      console.log(`Found ${payments.length} stealth payment(s) from program`);

      return payments;
    } catch (error) {
      throw new PrivacyError(
        `Failed to scan program transactions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get last scanned slot
   * 
   * @returns Last scanned slot number
   */
  getLastScannedSlot(): number {
    return this.lastScannedSlot;
  }

  /**
   * Set last scanned slot (useful for resuming scans)
   * 
   * @param slot - Slot number
   */
  setLastScannedSlot(slot: number): void {
    this.lastScannedSlot = slot;
  }

  // Helper methods

  /**
   * Split array into chunks
   * 
   * @param array - Array to chunk
   * @param size - Chunk size
   * @returns Array of chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
