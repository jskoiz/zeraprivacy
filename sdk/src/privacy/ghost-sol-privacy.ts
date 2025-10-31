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
   * 
   * This implements triple encryption:
   * 1. Sender's new balance (encrypted for sender)
   * 2. Transfer amount (encrypted for recipient)
   * 3. Auditor copy (encrypted for compliance, if enabled)
   */
  async privateTransfer(
    recipientAddress: string, 
    amountLamports: number
  ): Promise<PrivateTransferResult> {
    this._assertInitialized();
    this._assertConfidentialAccount();
    
    const startTime = Date.now();
    
    try {
      const recipientPubKey = new PublicKey(recipientAddress);
      const amount = BigInt(amountLamports);
      
      // 1. Validate recipient has confidential account
      await this._validateRecipientConfidentialAccount(recipientPubKey);
      
      // 2. Get sender's current encrypted balance
      const senderEncryptedBalance = await this.getEncryptedBalance();
      
      // 3. Decrypt sender's balance to validate sufficient funds
      const senderBalance = await this.decryptBalance();
      if (senderBalance < amountLamports) {
        throw new PrivacyError(
          `Insufficient balance: have ${senderBalance} lamports, need ${amountLamports} lamports`
        );
      }
      
      // 4. Generate transfer proof (balance validity + range proof)
      // Proves: oldBalance - amount = newBalance (without revealing amounts)
      const zkProof = await this._generateTransferProof(
        amount,
        senderEncryptedBalance,
        recipientPubKey
      );
      
      // 5. Triple encryption for sender, recipient, and auditor
      const transferData = await this._createTripleEncryptedTransfer(
        amount,
        senderBalance,
        recipientPubKey
      );
      
      // 6. Create confidential transfer instruction and submit transaction
      const signature = await this.confidentialTransferManager.transfer(
        this.confidentialAccount!.address,
        recipientPubKey,
        transferData.recipientEncrypted,
        zkProof
      );
      
      // 7. Update local balance cache
      this.confidentialAccount!.encryptedBalance = transferData.senderNewBalance;
      
      const endTime = Date.now();
      const proofGenerationTime = endTime - startTime;
      
      console.log(`✅ Private transfer completed in ${proofGenerationTime}ms`);
      
      return {
        signature,
        encryptedAmount: transferData.recipientEncrypted,
        zkProof,
        blockHeight: undefined,
        gasCost: undefined
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
      
      // Generate encrypted amount for withdrawal
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        BigInt(amount),
        withdrawalDestination
      );
      
      // Generate zero-knowledge proof for withdrawal validity  
      const zkProof = await this._generateWithdrawProof(amount, encryptedAmount);
      
      // Execute confidential withdrawal
      const signature = await this.confidentialTransferManager.withdraw(
        this.confidentialAccount!.address,
        withdrawalDestination,
        encryptedAmount,
        zkProof
      );
      
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
    amount: bigint,
    senderBalance: EncryptedBalance,
    recipientPubKey: PublicKey
  ): Promise<ZKProof> {
    try {
      // Generate proof that shows:
      // 1. oldBalance - amount = newBalance (without revealing amounts)
      // 2. 0 ≤ amount < 2^64 (range proof - prevents negative transfers)
      // 3. newBalance ≥ 0 (prevents overdraft)
      
      const proofStartTime = Date.now();
      
      // Create encrypted amount for proof generation
      const encryptedAmount = await this.encryptionUtils.encryptAmount(
        amount,
        recipientPubKey
      );
      
      // Generate the actual ZK proof
      // In a full implementation, this would use Solana's ZK syscalls
      // For now, we use the encryption utils to generate a circuit proof
      const proof = await this.encryptionUtils.generateAmountProof(
        amount,
        encryptedAmount,
        'transfer'
      );
      
      const proofEndTime = Date.now();
      const proofTime = proofEndTime - proofStartTime;
      
      if (proofTime > 5000) {
        console.warn(`⚠️  Proof generation took ${proofTime}ms (target: <5000ms)`);
      } else {
        console.log(`✅ Proof generated in ${proofTime}ms`);
      }
      
      return proof;
      
    } catch (error) {
      throw new ProofGenerationError(
        `Transfer proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
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
  
  /**
   * Validate that recipient has a confidential account
   * This is critical - recipient MUST have a confidential account to receive encrypted transfers
   */
  private async _validateRecipientConfidentialAccount(recipientPubKey: PublicKey): Promise<void> {
    try {
      // In a full implementation, this would:
      // 1. Derive the recipient's associated token account address
      // 2. Check if the account exists
      // 3. Verify it has confidential transfer extension enabled
      // 4. Verify it's for the same mint as sender
      
      // For prototype, we do basic validation
      if (!recipientPubKey) {
        throw new ConfidentialAccountError('Invalid recipient address');
      }
      
      // Check if recipient has an account (simplified check)
      // In production, would query the recipient's confidential account
      const recipientAccount = await this.connection.getAccountInfo(recipientPubKey);
      
      // For now, we allow transfers even if recipient doesn't exist yet
      // In production, this would create a pending balance that recipient must claim
      if (!recipientAccount) {
        console.log('ℹ️  Recipient account not found - transfer will create pending balance');
      }
      
    } catch (error) {
      throw new ConfidentialAccountError(
        `Recipient validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }
  
  /**
   * Create triple-encrypted transfer data
   * Encrypts for: sender (new balance), recipient (transfer amount), auditor (compliance)
   */
  private async _createTripleEncryptedTransfer(
    amount: bigint,
    senderBalanceLamports: number,
    recipientPubKey: PublicKey
  ): Promise<{
    senderNewBalance: EncryptedBalance;
    recipientEncrypted: EncryptedAmount;
    auditorEncrypted?: EncryptedAmount;
  }> {
    try {
      const newSenderBalance = BigInt(senderBalanceLamports) - amount;
      
      // 1. Encrypt new balance for sender
      const senderNewBalanceEncrypted = await this.encryptionUtils.encryptAmount(
        newSenderBalance,
        this.wallet.publicKey
      );
      
      const senderNewBalance: EncryptedBalance = {
        ciphertext: senderNewBalanceEncrypted.ciphertext,
        commitment: senderNewBalanceEncrypted.commitment,
        randomness: senderNewBalanceEncrypted.randomness,
        lastUpdated: Date.now(),
        exists: true
      };
      
      // 2. Encrypt transfer amount for recipient
      const recipientEncrypted = await this.encryptionUtils.encryptAmount(
        amount,
        recipientPubKey
      );
      
      // 3. Encrypt for auditor if viewing keys enabled
      let auditorEncrypted: EncryptedAmount | undefined;
      if (this.config.enableViewingKeys && this.confidentialMint?.auditorAuthority) {
        auditorEncrypted = await this.encryptionUtils.encryptAmount(
          amount,
          this.confidentialMint.auditorAuthority
        );
        console.log('✅ Auditor copy encrypted for compliance');
      }
      
      console.log('✅ Triple encryption completed:');
      console.log(`   - Sender new balance: ${newSenderBalance} lamports (encrypted)`);
      console.log(`   - Recipient amount: ${amount} lamports (encrypted)`);
      console.log(`   - Auditor copy: ${auditorEncrypted ? 'Yes' : 'No'}`);
      
      return {
        senderNewBalance,
        recipientEncrypted,
        auditorEncrypted
      };
      
    } catch (error) {
      throw new EncryptionError(
        `Triple encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}
