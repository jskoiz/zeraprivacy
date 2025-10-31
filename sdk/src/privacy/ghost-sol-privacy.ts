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

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
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
import { WsolWrapper } from '../core/wsol-wrapper';

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
  private wsolWrapper!: WsolWrapper;
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
      this.wsolWrapper = new WsolWrapper(connection, wallet);
      
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
   * 
   * Users interact with native SOL, but under the hood:
   * 1. Native SOL is wrapped to wSOL
   * 2. wSOL is deposited to confidential account
   * 3. Users see: "Preparing SOL for private transfer..."
   * 
   * @param amountLamports - Amount of SOL to deposit in lamports
   * @returns Transaction signature
   */
  async encryptedDeposit(amountLamports: number): Promise<string> {
    this._assertInitialized();
    
    try {
      // Step 1: Wrap SOL → wSOL automatically (users don't see this)
      console.log('Preparing SOL for private transfer...');
      const wsolAccount = await this.wsolWrapper.wrapSol(amountLamports);
      
      // Step 2: Get or create confidential wSOL account (not native SOL)
      // Use NATIVE_MINT which represents wSOL
      const confidentialAccount = await this.getOrCreateConfidentialAccount(NATIVE_MINT);
      
      // Step 3: Deposit wSOL to confidential account
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        BigInt(amountLamports),
        this.wallet.publicKey
      );
      
      // Generate zero-knowledge proof for deposit validity
      const zkProof = await this._generateDepositProof(amountLamports, encryptedAmount);
      
      // Execute confidential deposit using wSOL account
      const signature = await this.confidentialTransferManager.deposit(
        confidentialAccount,
        encryptedAmount,
        zkProof
      );
      
      // Step 4: User-facing message
      console.log(`SOL now private (${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);
      
      return signature;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to deposit SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * 
   * Users interact with native SOL, but under the hood:
   * 1. Withdraw wSOL from confidential account
   * 2. wSOL is unwrapped to native SOL
   * 3. Users see: "Withdrawing SOL..."
   * 
   * @param amountLamports - Amount of SOL to withdraw in lamports
   * @param destination - Optional destination address (defaults to wallet)
   * @returns Transaction signature
   */
  async encryptedWithdraw(amountLamports: number, destination?: PublicKey): Promise<string> {
    this._assertInitialized();
    this._assertConfidentialAccount();
    
    try {
      const withdrawalDestination = destination || this.wallet.publicKey;
      
      console.log('Withdrawing SOL from private balance...');
      
      // Step 1: Withdraw from confidential wSOL account
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        BigInt(amountLamports),
        withdrawalDestination
      );
      
      // Generate zero-knowledge proof for withdrawal validity  
      const zkProof = await this._generateWithdrawProof(amountLamports, encryptedAmount);
      
      // Execute confidential withdrawal (this gives us wSOL)
      const withdrawSignature = await this.confidentialTransferManager.withdraw(
        this.confidentialAccount!.address,
        withdrawalDestination,
        encryptedAmount,
        zkProof
      );
      
      // Step 2: Unwrap wSOL → SOL automatically (users don't see this)
      const unwrapSignature = await this.wsolWrapper.unwrapSol();
      
      console.log(`SOL withdrawn (${(amountLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);
      
      // Return the unwrap signature (final transaction)
      return unwrapSignature;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to withdraw SOL: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  /**
   * Get or create a confidential account for a specific mint
   * This is used internally to manage wSOL confidential accounts
   * 
   * @param mint - The mint address (e.g., NATIVE_MINT for wSOL)
   * @returns The confidential account address
   */
  async getOrCreateConfidentialAccount(mint: PublicKey): Promise<PublicKey> {
    this._assertInitialized();
    
    try {
      // Check if we already have a confidential account for this mint
      if (this.confidentialAccount && this.confidentialAccount.mint.equals(mint)) {
        return this.confidentialAccount.address;
      }
      
      // Create new confidential account for this mint
      return await this.createConfidentialAccount(mint);
      
    } catch (error) {
      throw new ConfidentialAccountError(
        `Failed to get or create confidential account: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Optimized deposit that tries to batch wrap + deposit in a single transaction
   * Falls back to two transactions if batching fails
   * 
   * @param amountLamports - Amount of SOL to deposit in lamports
   * @returns Transaction signature
   */
  async optimizedDeposit(amountLamports: number): Promise<string> {
    this._assertInitialized();
    
    try {
      // Try to batch wrap + deposit in a single transaction
      // This saves time and transaction fees
      console.log('Preparing SOL for private transfer (optimized)...');
      
      // TODO: Implement batched transaction
      // For now, fall back to regular deposit
      // In the future, this could combine wrap + deposit instructions
      return await this.encryptedDeposit(amountLamports);
      
    } catch (error) {
      throw new PrivacyError(
        `Optimized deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Clean up any orphaned wSOL accounts to prevent dust
   * Should be called after withdraw operations
   * 
   * @returns Transaction signature if cleanup was performed, null if nothing to clean
   */
  async cleanupWsolAccounts(): Promise<string | null> {
    this._assertInitialized();
    
    try {
      return await this.wsolWrapper.cleanupWsolAccounts();
    } catch (error) {
      // Non-critical error, just log it
      console.warn('Failed to cleanup wSOL accounts:', error);
      return null;
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
  
  private async _generateWithdrawProof(amount: number, encryptedAmount: EncryptedAmount): Promise<ZKProof> {
    // TODO: Implement actual ZK proof generation for withdrawals
    throw new ProofGenerationError('ZK proof generation not yet implemented');
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
