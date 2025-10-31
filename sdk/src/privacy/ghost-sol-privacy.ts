/**
 * privacy/ghost-sol-privacy.ts
 * 
 * Purpose: Main privacy class providing true transaction privacy on Solana
 * 
 * This class implements actual transaction privacy using SPL Token 2022
 * Confidential Transfers, as opposed to ZK Compression which only provides
 * cost optimization. It offers encrypted balances, private transfers, and
 * compliance features via viewing keys.
 * 
 * Key Features:
 * - Encrypted token balances
 * - Private transfers with ZK proofs
 * - Viewing keys for compliance
 * - Integration with existing SDK
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  PrivacyConfig, 
  EncryptedBalance, 
  EncryptedAmount,
  PrivateTransferResult,
  ConfidentialMint,
  ConfidentialAccount,
  ViewingKey,
  ZKProof
} from './types';
import { 
  PrivacyError, 
  EncryptionError, 
  ProofGenerationError,
  PrivacyModeError,
  ConfidentialAccountError
} from './errors';
import { ConfidentialTransferManager } from './confidential-transfer';
import { EncryptionUtils } from './encryption';
import { ViewingKeyManager } from './viewing-keys';
import { ExtendedWalletAdapter } from '../core/types';

/**
 * Main privacy class for true transaction privacy on Solana
 * 
 * Unlike ZK Compression (which only optimizes costs), this class provides
 * actual privacy by encrypting balances and transaction amounts using
 * SPL Token 2022 Confidential Transfers.
 */
export class GhostSolPrivacy {
  private connection!: Connection;
  private wallet!: ExtendedWalletAdapter;
  private config!: PrivacyConfig;
  private confidentialTransferManager!: ConfidentialTransferManager;
  private encryptionUtils!: EncryptionUtils;
  private viewingKeyManager!: ViewingKeyManager;
  private confidentialMint?: ConfidentialMint;
  private confidentialAccount?: ConfidentialAccount;
  private initialized = false;

  /**
   * Initialize the privacy SDK
   * 
   * @param connection - Solana connection
   * @param wallet - Extended wallet adapter with keypair access
   * @param config - Privacy configuration
   */
  async init(
    connection: Connection, 
    wallet: ExtendedWalletAdapter, 
    config: PrivacyConfig
  ): Promise<void> {
    try {
      // Validate privacy mode
      if (config.mode !== 'privacy') {
        throw new PrivacyModeError('initialization');
      }

      this.connection = connection;
      this.wallet = wallet;
      this.config = config;

      // Initialize privacy utilities
      this.encryptionUtils = new EncryptionUtils();
      this.confidentialTransferManager = new ConfidentialTransferManager(
        connection, 
        wallet
      );
      
      if (config.enableViewingKeys) {
        this.viewingKeyManager = new ViewingKeyManager(wallet);
      }

      // Create or find confidential mint
      await this._initializeConfidentialMint();
      
      // Create or find user's confidential account
      await this._initializeConfidentialAccount();

      this.initialized = true;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to initialize privacy SDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new confidential mint (for testing/demo purposes)
   * In production, you'd typically use an existing confidential mint
   */
  async createConfidentialMint(): Promise<PublicKey> {
    this._assertInitialized();
    
    try {
      const mintKeypair = Keypair.generate();
      
      // Create confidential mint using SPL Token 2022
      await this.confidentialTransferManager.createConfidentialMint(
        mintKeypair,
        this.wallet.publicKey, // mint authority
        this.config.enableViewingKeys ? this.wallet.publicKey : undefined // auditor authority
      );
      
      this.confidentialMint = {
        address: mintKeypair.publicKey,
        authority: this.wallet.publicKey,
        confidentialTransferEnabled: true,
        auditorAuthority: this.config.enableViewingKeys ? this.wallet.publicKey : undefined
      };
      
      return mintKeypair.publicKey;
      
    } catch (error) {
      throw new ConfidentialAccountError(
        `Failed to create confidential mint: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a confidential token account for the user
   */
  async createConfidentialAccount(mint?: PublicKey): Promise<PublicKey> {
    this._assertInitialized();
    
    if (!this.confidentialMint && !mint) {
      throw new ConfidentialAccountError('No confidential mint available');
    }
    
    const mintAddress = mint || this.confidentialMint!.address;
    
    try {
      const accountAddress = await this.confidentialTransferManager.createConfidentialAccount(
        mintAddress,
        this.wallet.publicKey
      );
      
      this.confidentialAccount = {
        address: accountAddress,
        mint: mintAddress,
        owner: this.wallet.publicKey,
        encryptedBalance: {
          ciphertext: new Uint8Array(0),
          commitment: new Uint8Array(0),
          lastUpdated: Date.now(),
          exists: true
        },
        createdAt: Date.now()
      };
      
      return accountAddress;
      
    } catch (error) {
      throw new ConfidentialAccountError(
        `Failed to create confidential account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deposit SOL into the privacy pool (encrypted)
   * This is the equivalent of "shield" but with true privacy
   */
  async encryptedDeposit(amount: number): Promise<string> {
    this._assertInitialized();
    this._assertConfidentialAccount();
    
    try {
      // Generate encrypted amount
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        BigInt(amount),
        this.wallet.publicKey
      );
      
      // Generate zero-knowledge proof for deposit validity
      const zkProof = await this._generateDepositProof(amount, encryptedAmount);
      
      // Execute confidential deposit
      const signature = await this.confidentialTransferManager.deposit(
        this.confidentialAccount!.address,
        encryptedAmount,
        zkProof
      );
      
      return signature;
      
    } catch (error) {
      throw new PrivacyError(
        `Encrypted deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Perform a private transfer with full encryption
   * Unlike ZK Compression, this actually hides the amount and recipient linkability
   */
  async privateTransfer(
    recipientAddress: string, 
    amount: number
  ): Promise<PrivateTransferResult> {
    this._assertInitialized();
    this._assertConfidentialAccount();
    
    try {
      const recipient = new PublicKey(recipientAddress);
      
      // Encrypt the transfer amount
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        BigInt(amount),
        recipient
      );
      
      // Generate zero-knowledge proof for transfer validity
      const zkProof = await this._generateTransferProof(
        amount,
        encryptedAmount,
        recipient
      );
      
      // Execute private transfer
      const signature = await this.confidentialTransferManager.transfer(
        this.confidentialAccount!.address,
        recipient,
        encryptedAmount,
        zkProof
      );
      
      return {
        signature,
        encryptedAmount,
        zkProof
      };
      
    } catch (error) {
      throw new PrivacyError(
        `Private transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Withdraw from privacy pool (encrypted withdrawal)
   * This is the equivalent of "unshield" but with true privacy
   */
  async encryptedWithdraw(amount: number, destination?: PublicKey): Promise<string> {
    this._assertInitialized();
    this._assertConfidentialAccount();
    
    try {
      const withdrawalDestination = destination || this.wallet.publicKey;
      
      // Step 1: Get encrypted balance
      const encryptedBalance = await this.getEncryptedBalance();
      
      // Step 2: Decrypt balance to verify sufficient funds
      const decryptedBalance = await this.encryptionUtils.decryptAmount(
        encryptedBalance.ciphertext,
        this.wallet.rawKeypair!
      );
      
      // Step 3: Verify withdraw amount
      const isValid = await this._verifyWithdrawAmount(
        BigInt(amount),
        encryptedBalance,
        decryptedBalance
      );
      
      if (!isValid) {
        throw new PrivacyError(
          `Insufficient encrypted balance. Available: ${decryptedBalance}, Requested: ${amount}`
        );
      }
      
      // Step 4: Generate encrypted amount for withdrawal
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        BigInt(amount),
        withdrawalDestination
      );
      
      // Step 5: Generate zero-knowledge proof for withdrawal validity  
      const zkProof = await this._generateWithdrawProof(
        BigInt(amount),
        encryptedAmount,
        encryptedBalance
      );
      
      // Step 6: Execute confidential withdrawal (moves from encrypted → regular balance)
      const signature = await this.confidentialTransferManager.withdraw(
        this.confidentialAccount!.address,
        withdrawalDestination,
        encryptedAmount,
        zkProof
      );
      
      // Optional: Check if balance is zero and close account if needed
      const remainingBalance = decryptedBalance - BigInt(amount);
      if (remainingBalance === 0n && this.config.auditMode !== true) {
        // Account cleanup could happen here (not implemented in prototype)
        // await this._closeConfidentialAccount();
      }
      
      return signature;
      
    } catch (error) {
      throw new PrivacyError(
        `Encrypted withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get encrypted balance (only owner can decrypt)
   * Returns encrypted data - true privacy unlike ZK Compression
   */
  async getEncryptedBalance(): Promise<EncryptedBalance> {
    this._assertInitialized();
    this._assertConfidentialAccount();
    
    try {
      const encryptedBalance = await this.confidentialTransferManager.getEncryptedBalance(
        this.confidentialAccount!.address
      );
      
      return encryptedBalance;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to get encrypted balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt balance (only for account owner or viewing key holders)
   */
  async decryptBalance(viewingKey?: ViewingKey): Promise<number> {
    this._assertInitialized();
    
    try {
      const encryptedBalance = await this.getEncryptedBalance();
      
      if (viewingKey && this.viewingKeyManager) {
        return await this.viewingKeyManager.decryptBalance(encryptedBalance, viewingKey);
      }
      
      // Decrypt using owner's private key
      const decryptedAmount = await this.encryptionUtils.decryptAmount(
        encryptedBalance.ciphertext,
        this.wallet.rawKeypair!
      );
      
      return Number(decryptedAmount);
      
    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate viewing key for compliance/auditing
   */
  async generateViewingKey(): Promise<ViewingKey> {
    this._assertInitialized();
    
    if (!this.config.enableViewingKeys || !this.viewingKeyManager) {
      throw new PrivacyError('Viewing keys not enabled');
    }
    
    try {
      return await this.viewingKeyManager.generateViewingKey(
        this.confidentialAccount!.address
      );
    } catch (error) {
      throw new PrivacyError(
        `Failed to generate viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Private helper methods
  
  private async _initializeConfidentialMint(): Promise<void> {
    // In a real implementation, you'd either create a new mint
    // or connect to an existing confidential mint
    // For now, we'll create one for testing
    await this.createConfidentialMint();
  }
  
  private async _initializeConfidentialAccount(): Promise<void> {
    // Create confidential account for the user
    await this.createConfidentialAccount();
  }
  
  private async _generateDepositProof(amount: number, encryptedAmount: EncryptedAmount): Promise<ZKProof> {
    // TODO: Implement actual ZK proof generation for deposits
    // This would use Solana's ZK syscalls (Poseidon, alt_bn128)
    throw new ProofGenerationError('ZK proof generation not yet implemented');
  }
  
  private async _generateTransferProof(
    amount: number, 
    encryptedAmount: EncryptedAmount, 
    recipient: PublicKey
  ): Promise<ZKProof> {
    // TODO: Implement actual ZK proof generation for transfers
    throw new ProofGenerationError('ZK proof generation not yet implemented');
  }
  
  /**
   * Generate zero-knowledge proof for withdrawal
   * Proves that: balance >= amount AND amount is valid
   */
  private async _generateWithdrawProof(
    amount: bigint,
    encryptedAmount: EncryptedAmount,
    encryptedBalance: EncryptedBalance
  ): Promise<ZKProof> {
    try {
      const startTime = Date.now();
      
      // Generate withdrawal proof using encryption utils
      const zkProof = await this.encryptionUtils.generateAmountProof(
        amount,
        encryptedAmount,
        'withdrawal'
      );
      
      const duration = Date.now() - startTime;
      
      // Ensure proof generation is under 5 seconds (requirement)
      if (duration > 5000) {
        console.warn(`Withdrawal proof generation took ${duration}ms (exceeds 5s target)`);
      }
      
      return zkProof;
      
    } catch (error) {
      throw new ProofGenerationError(
        `Failed to generate withdrawal proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Verify that the withdrawal amount is valid and sufficient balance exists
   */
  private async _verifyWithdrawAmount(
    amount: bigint,
    encryptedBalance: EncryptedBalance,
    decryptedBalance: bigint
  ): Promise<boolean> {
    try {
      // Check 1: Amount must be positive
      if (amount <= 0n) {
        throw new PrivacyError('Withdrawal amount must be positive');
      }
      
      // Check 2: Must have sufficient balance
      if (decryptedBalance < amount) {
        return false;
      }
      
      // Check 3: Verify encrypted balance exists and is not stale
      if (!encryptedBalance.exists) {
        throw new PrivacyError('Confidential account has no encrypted balance');
      }
      
      // Check 4: Check balance freshness (optional safety check)
      const balanceAge = Date.now() - encryptedBalance.lastUpdated;
      const maxAgeMs = 60 * 60 * 1000; // 1 hour
      if (balanceAge > maxAgeMs) {
        console.warn(`Encrypted balance is ${Math.floor(balanceAge / 1000 / 60)} minutes old`);
      }
      
      return true;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to verify withdrawal amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  private _assertInitialized(): void {
    if (!this.initialized) {
      throw new PrivacyError('Privacy SDK not initialized. Call init() first.');
    }
  }
  
  private _assertConfidentialAccount(): void {
    if (!this.confidentialAccount) {
      throw new ConfidentialAccountError('No confidential account available');
    }
  }
}
