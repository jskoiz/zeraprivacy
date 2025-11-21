/**
 * privacy/zera-privacy.ts
 * 
 * Purpose: Main privacy class providing Confidential Transfers on Solana
 * 
 * This class implements privacy using SPL Token 2022 Confidential Transfers.
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  PrivacyConfig,
  StealthMetaAddress,
  StealthAddress,
  EphemeralKey,
  StealthPayment
} from './types';
import {
  PrivacyError
} from './errors';
import { StealthAddressManager } from './stealth-address';
import { ConfidentialTransferManager } from './confidential-transfer';
import { ExtendedWalletAdapter } from '../core/types';

/**
 * Main privacy class for Zera SDK
 */
export class ZeraPrivacy {
  private connection!: Connection;
  private wallet!: ExtendedWalletAdapter;
  private config!: PrivacyConfig;

  private stealthAddressManager!: StealthAddressManager;
  private confidentialManager!: ConfidentialTransferManager;

  private initialized = false;

  /**
   * Initialize the privacy SDK
   */
  async init(
    connection: Connection,
    wallet: ExtendedWalletAdapter,
    config: PrivacyConfig
  ): Promise<void> {
    try {
      this.connection = connection;
      this.wallet = wallet;
      this.config = config;

      this.stealthAddressManager = new StealthAddressManager();
      this.confidentialManager = new ConfidentialTransferManager(connection, wallet);

      this.initialized = true;

    } catch (error) {
      throw new PrivacyError(
        `Failed to initialize privacy SDK: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Create a new confidential mint
   */
  async createConfidentialMint(decimals: number = 9): Promise<PublicKey> {
    this._assertInitialized();

    const mintKeypair = Keypair.generate();

    await this.confidentialManager.createConfidentialMint(
      mintKeypair,
      decimals,
      this.wallet.publicKey
    );

    return mintKeypair.publicKey;
  }

  /**
   * Create a confidential token account
   */
  async createConfidentialAccount(mint: PublicKey, owner?: PublicKey): Promise<PublicKey> {
    this._assertInitialized();
    return await this.confidentialManager.createConfidentialAccount(
      mint,
      owner || this.wallet.publicKey
    );
  }

  /**
   * Deposit (Shield) public tokens into confidential balance
   */
  async deposit(
    account: PublicKey,
    mint: PublicKey,
    amount: number
  ): Promise<string> {
    this._assertInitialized();
    return await this.confidentialManager.deposit(account, mint, amount);
  }

  /**
   * Transfer confidential tokens privately
   */
  async transfer(
    sourceAccount: PublicKey,
    mint: PublicKey,
    destinationAccount: PublicKey,
    amount: number
  ): Promise<string> {
    this._assertInitialized();
    return await this.confidentialManager.transfer(sourceAccount, mint, destinationAccount, amount);
  }

  /**
   * Withdraw (Unshield) confidential tokens to public balance
   */
  async withdraw(
    account: PublicKey,
    mint: PublicKey,
    amount: number
  ): Promise<string> {
    this._assertInitialized();
    return await this.confidentialManager.withdraw(account, mint, amount);
  }

  /**
   * Get balance
   */
  async getBalance(account: PublicKey): Promise<string> {
    this._assertInitialized();
    // TODO: Implement getAccount info parsing for confidential balance
    return "Encrypted Balance (Hidden)";
  }

  // Stealth Address Proxy Methods (Unchanged)

  generateStealthMetaAddress(viewKeypair?: Keypair, spendKeypair?: Keypair): StealthMetaAddress {
    this._assertInitialized();
    return this.stealthAddressManager.generateStealthMetaAddress(viewKeypair, spendKeypair);
  }

  generateStealthAddress(
    recipientMetaAddress: StealthMetaAddress,
    ephemeralKeypair?: Keypair
  ): { stealthAddress: StealthAddress; ephemeralKey: EphemeralKey } {
    this._assertInitialized();
    return this.stealthAddressManager.generateStealthAddress(recipientMetaAddress, ephemeralKeypair);
  }

  async scanForPayments(
    metaAddress: StealthMetaAddress,
    viewPrivateKey: Uint8Array,
    ephemeralKeys: EphemeralKey[]
  ): Promise<StealthPayment[]> {
    this._assertInitialized();
    return await this.stealthAddressManager.scanForPayments(metaAddress, viewPrivateKey, ephemeralKeys);
  }

  deriveStealthSpendingKey(payment: StealthPayment, spendPrivateKey: Uint8Array): { privateKey: Uint8Array; publicKey: PublicKey } {
    this._assertInitialized();
    return this.stealthAddressManager.deriveStealthSpendingKeyWithPrivate(payment.sharedSecret!, spendPrivateKey);
  }

  verifyStealthAddress(
    stealthAddress: PublicKey,
    metaAddress: StealthMetaAddress,
    ephemeralPublicKey: PublicKey
  ): boolean {
    this._assertInitialized();
    return true;
  }

  // Private helpers

  private _assertInitialized(): void {
    if (!this.initialized) {
      throw new PrivacyError('Zera SDK not initialized');
    }
  }
}
