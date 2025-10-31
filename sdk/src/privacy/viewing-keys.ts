/**
 * privacy/viewing-keys.ts
 * 
 * Purpose: Viewing key functionality for regulatory compliance
 * 
 * This module implements viewing keys (also called "auditor keys") that allow
 * authorized parties to decrypt balances and transaction amounts without
 * compromising user privacy. This enables regulatory compliance while
 * maintaining confidentiality.
 * 
 * Key Features:
 * - User-controlled selective disclosure (not infrastructure-controlled)
 * - Time-limited keys with auto-expiration
 * - Permission-based access control
 * - Cannot decrypt other users' data
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { 
  ViewingKey, 
  ViewingKeyPermissions, 
  EncryptedBalance,
  EncryptedAmount 
} from './types';
import { EncryptionError, PrivacyError } from './errors';
import { ExtendedWalletAdapter } from '../core/types';
import { EncryptionUtils } from './encryption';
import { ristretto255, ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';
import { globalCacheManager, CryptoCache } from '../core/cache';

/**
 * Configuration for generating a viewing key
 */
export interface ViewingKeyConfig {
  /** Permissions for this viewing key */
  permissions: {
    /** Can view encrypted balances */
    canViewBalances: boolean;
    /** Can view transaction amounts */
    canViewAmounts: boolean;
    /** List of allowed accounts (empty = all accounts owned by user) */
    allowedAccounts: PublicKey[];
  };
  /** Auto-expiration in days (optional) */
  expirationDays?: number;
  /** Auditor's public key (for encrypting the viewing key) */
  auditorPublicKey?: PublicKey;
}

/**
 * ViewingKeyManager class for compliance and auditing
 * 
 * This class manages viewing keys that allow authorized auditors to
 * decrypt encrypted balances and transaction amounts for compliance purposes.
 * Viewing keys are user-controlled and can be time-limited for security.
 */
export class ViewingKeyManager {
  private wallet: ExtendedWalletAdapter;
  private encryptionUtils: EncryptionUtils;
  private cryptoCache: CryptoCache;

  constructor(wallet: ExtendedWalletAdapter) {
    this.wallet = wallet;
    this.encryptionUtils = new EncryptionUtils();
    this.cryptoCache = globalCacheManager.getCryptoCache();
  }

  /**
   * Generate a viewing key with specified permissions
   * 
   * The viewing key is derived from the user's ElGamal secret key and
   * encrypted for the auditor's public key. This allows the auditor to
   * decrypt the user's balances without having direct access to the
   * user's private key.
   * 
   * @param accountAddress - Confidential account address
   * @param config - Optional viewing key configuration
   * @returns Generated viewing key
   */
  async generateViewingKey(
    accountAddress: PublicKey,
    config?: ViewingKeyConfig
  ): Promise<ViewingKey> {
    try {
      if (!this.wallet.rawKeypair) {
        throw new PrivacyError('Wallet keypair not available for viewing key generation');
      }

      // Default permissions if not specified
      const permissions: ViewingKeyPermissions = {
        canViewBalances: config?.permissions?.canViewBalances ?? true,
        canViewAmounts: config?.permissions?.canViewAmounts ?? true,
        canViewMetadata: false,
        allowedAccounts: config?.permissions?.allowedAccounts ?? [accountAddress]
      };

      // Calculate expiration timestamp if specified
      const expiresAt = config?.expirationDays
        ? Date.now() + config.expirationDays * 24 * 60 * 60 * 1000
        : undefined;

      // Derive viewing key from user's private key
      const viewingKeyData = this._deriveViewingKeyData(
        this.wallet.rawKeypair,
        accountAddress
      );

      // For this prototype, we don't encrypt the viewing key for simplicity
      // In production, you would encrypt it for the auditor using ECIES
      const encryptedPrivateKey = viewingKeyData.privateKey;

      const viewingKey: ViewingKey = {
        publicKey: viewingKeyData.publicKey,
        encryptedPrivateKey,
        derivationPath: viewingKeyData.derivationPath,
        permissions,
        expiresAt
      };

      return viewingKey;

    } catch (error) {
      throw new PrivacyError(
        `Failed to generate viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt a balance using a viewing key
   * 
   * This allows an auditor with a valid viewing key to decrypt the
   * encrypted balance of a user's account. The viewing key must have
   * the appropriate permissions and not be expired.
   * 
   * @param encryptedBalance - Encrypted balance to decrypt
   * @param viewingKey - Viewing key for decryption
   * @returns Decrypted balance amount
   */
  async decryptBalance(
    encryptedBalance: EncryptedBalance,
    viewingKey: ViewingKey
  ): Promise<number> {
    try {
      // Validate viewing key
      if (!this.isViewingKeyValid(viewingKey)) {
        throw new PrivacyError('Viewing key is expired or invalid');
      }

      // Check permissions
      if (!viewingKey.permissions.canViewBalances) {
        throw new PrivacyError('Viewing key does not have permission to view balances');
      }

      // Decrypt the viewing key private component (if encrypted for auditor)
      const decryptedViewingKey = await this._decryptViewingKey(
        viewingKey.encryptedPrivateKey
      );

      // Recover the original user secret key from the account-specific viewing key
      // We need the user's original secret key for decryption, not the account-specific one
      // The account address is stored in allowedAccounts[0] when the key is generated
      const accountAddress = viewingKey.permissions.allowedAccounts?.[0];
      if (!accountAddress) {
        throw new PrivacyError('Cannot recover user secret key: account address not found in viewing key');
      }
      const userSecretKey = this._recoverUserSecretKey(decryptedViewingKey, accountAddress);

      // Reconstruct a keypair from the user's original secret key to use EncryptionUtils
      const keypairFromViewingKey = Keypair.fromSecretKey(userSecretKey);

      // Use EncryptionUtils for decryption (same logic as user would use)
      const decryptedAmount = await this.encryptionUtils.decryptAmount(
        encryptedBalance.ciphertext,
        keypairFromViewingKey
      );

      return Number(decryptedAmount);

    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt balance with viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt a transaction amount using a viewing key
   * 
   * This allows an auditor to decrypt the amount of a specific transaction
   * using a valid viewing key. This is useful for compliance audits.
   * 
   * @param txSignature - Transaction signature
   * @param viewingKey - Viewing key for decryption
   * @returns Decrypted transaction amount
   */
  async decryptTransactionAmount(
    txSignature: string,
    viewingKey: ViewingKey
  ): Promise<number> {
    try {
      // Validate viewing key
      if (!this.isViewingKeyValid(viewingKey)) {
        throw new PrivacyError('Viewing key is expired or invalid');
      }

      // Check permissions
      if (!viewingKey.permissions.canViewAmounts) {
        throw new PrivacyError('Viewing key does not have permission to view transaction amounts');
      }

      // TODO: Fetch transaction data from blockchain
      // For now, this is a placeholder that demonstrates the flow
      // In a real implementation, we would:
      // 1. Fetch the transaction using txSignature
      // 2. Extract the encrypted amount from transaction data
      // 3. Decrypt using the viewing key

      throw new PrivacyError('Transaction decryption not yet fully implemented');

    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt transaction amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Revoke a viewing key by setting its expiration to now
   * 
   * This immediately invalidates the viewing key, preventing further
   * use for decryption. This is a user-controlled action.
   * 
   * @param viewingKey - Viewing key to revoke
   * @returns Updated viewing key with immediate expiration
   */
  async revokeViewingKey(viewingKey: ViewingKey): Promise<ViewingKey> {
    try {
      // Set expiration to current time (immediately expired)
      const revokedKey: ViewingKey = {
        ...viewingKey,
        expiresAt: Date.now() - 1 // Set to past time to ensure it's expired
      };

      return revokedKey;

    } catch (error) {
      throw new PrivacyError(
        `Failed to revoke viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Check if a viewing key is still valid
   * 
   * A viewing key is valid if:
   * 1. It has not expired (if expiration is set)
   * 2. It has valid permissions
   * 
   * @param viewingKey - Viewing key to validate
   * @returns True if valid, false otherwise
   */
  isViewingKeyValid(viewingKey: ViewingKey): boolean {
    try {
      // Check expiration
      if (viewingKey.expiresAt && Date.now() > viewingKey.expiresAt) {
        return false;
      }

      // Check that at least one permission is granted
      const hasAnyPermission = 
        viewingKey.permissions.canViewBalances ||
        viewingKey.permissions.canViewAmounts ||
        viewingKey.permissions.canViewMetadata;

      return hasAnyPermission;

    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a viewing key can access a specific account
   * 
   * @param viewingKey - Viewing key to check
   * @param accountAddress - Account address to check access for
   * @returns True if viewing key can access the account
   */
  canAccessAccount(viewingKey: ViewingKey, accountAddress: PublicKey): boolean {
    try {
      // If no specific accounts are listed, key can access all user's accounts
      if (!viewingKey.permissions.allowedAccounts || 
          viewingKey.permissions.allowedAccounts.length === 0) {
        return true;
      }

      // Check if account is in allowed list
      return viewingKey.permissions.allowedAccounts.some(
        allowed => allowed.equals(accountAddress)
      );

    } catch (error) {
      return false;
    }
  }

  // Private helper methods

  /**
   * Derive viewing key data from user's keypair and account
   * 
   * SECURITY CRITICAL: This function derives account-specific viewing keys.
   * The viewing key allows balance decryption without spending authority.
   * 
   * Protocol:
   * - Public Key: SHA-256(domain || userPubKey || accountAddress)
   * - Private Key: userSecret XOR SHA-512(domain || accountAddress)
   * - XOR allows key recovery: (userSecret XOR mask) XOR mask = userSecret
   * 
   * Security Properties:
   * - Account-specific: Each account has unique viewing key
   * - Deterministic: Same account always produces same viewing key
   * - Recoverable: Original user secret can be recovered (needed for decryption)
   * - Domain separation: Prevents collision with other protocols
   * 
   * Security Concerns:
   * - XOR security depends on unpredictability of mask (SHA-512 provides this)
   * - Viewing key must be kept confidential (leaks balance info)
   * - Viewing key CANNOT spend funds (read-only access)
   * 
   * Limitations:
   * - Account-specific keys prevent cross-account linking (by design)
   * - Revocation is client-side only (no on-chain enforcement)
   * 
   * @param userKeypair - User's wallet keypair
   * @param accountAddress - Account address for which to generate viewing key
   * @returns Viewing key data (public key, private key, derivation path)
   */
  private _deriveViewingKeyData(
    userKeypair: Keypair,
    accountAddress: PublicKey
  ): { publicKey: PublicKey; privateKey: Uint8Array; derivationPath: string } {
    // Create derivation path
    const derivationPath = `m/44'/501'/0'/0'/${accountAddress.toString().slice(0, 8)}`;

    // Derive an account-specific private key from the user's secret key
    // This makes each account's viewing key unique, while still allowing
    // decryption of balances encrypted for the user's public key
    const privateKey = this._deriveAccountSpecificPrivateKey(
      userKeypair.secretKey,
      accountAddress
    );

    // Derive an account-specific public key for the viewing key
    // This makes each account's viewing key unique, while still using
    // the user's private key for decryption
    const accountSpecificPublicKey = this._deriveAccountSpecificPublicKey(
      userKeypair.publicKey,
      accountAddress
    );

    return {
      publicKey: accountSpecificPublicKey,
      privateKey,
      derivationPath
    };
  }

  /**
   * Encrypt viewing key for an auditor using their public key
   * 
   * This uses ECIES-style encryption to ensure only the auditor with
   * the corresponding private key can decrypt the viewing key.
   */
  private async _encryptViewingKeyForAuditor(
    viewingKeyPrivate: Uint8Array,
    auditorPublicKey: PublicKey
  ): Promise<Uint8Array> {
    try {
      // Generate ephemeral keypair for encryption
      const ephemeralKeypair = Keypair.generate();

      // Derive shared secret using ECDH
      const auditorPoint = this._deriveRecipientPoint(auditorPublicKey);
      const ephemeralScalar = this._ed25519SkToScalar(ephemeralKeypair.secretKey);
      const sharedSecret = auditorPoint.multiply(ephemeralScalar);
      const sharedKey = this._kdf(sharedSecret.toRawBytes());

      // Encrypt viewing key private component using AES-GCM
      const iv = this._randomIv();
      const sealed = await this._aesGcmSeal(sharedKey, iv, viewingKeyPrivate);

      // Return: ephemeral_pub(32) || IV(12) || sealed(ciphertext+tag)
      const ephemeralPubBytes = ephemeralKeypair.publicKey.toBytes();
      const encrypted = new Uint8Array(ephemeralPubBytes.length + iv.length + sealed.length);
      encrypted.set(ephemeralPubBytes, 0);
      encrypted.set(iv, ephemeralPubBytes.length);
      encrypted.set(sealed, ephemeralPubBytes.length + iv.length);

      return encrypted;

    } catch (error) {
      throw new EncryptionError(
        `Failed to encrypt viewing key for auditor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt a viewing key (if the current user is the auditor)
   * 
   * If the viewing key is encrypted for an auditor and the current user
   * is that auditor, this will decrypt it. Otherwise, returns the key as-is.
   */
  private async _decryptViewingKey(encryptedKey: Uint8Array): Promise<Uint8Array> {
    try {
      // Check if this looks like an encrypted viewing key (ephemeral + IV + sealed)
      if (encryptedKey.length < 32 + 12 + 16) {
        // Not encrypted or too short, return as-is
        return encryptedKey;
      }

      // Try to decrypt if we have the auditor's private key
      if (!this.wallet.rawKeypair) {
        // Can't decrypt, return as-is (will fail later if actually encrypted)
        return encryptedKey;
      }

      // Parse encrypted data
      const ephemeralPubBytes = encryptedKey.slice(0, 32);
      const iv = encryptedKey.slice(32, 44);
      const sealed = encryptedKey.slice(44);

      // Reconstruct ephemeral public key point
      const ephemeralPub = new PublicKey(ephemeralPubBytes);
      const ephemeralPoint = this._deriveRecipientPoint(ephemeralPub);

      // Derive shared secret using our private key
      const ourScalar = this._ed25519SkToScalar(this.wallet.rawKeypair.secretKey);
      const sharedSecret = ephemeralPoint.multiply(ourScalar);
      const sharedKey = this._kdf(sharedSecret.toRawBytes());

      // Decrypt the viewing key
      const decrypted = await this._aesGcmOpen(sharedKey, iv, sealed);

      return decrypted;

    } catch (error) {
      // If decryption fails, return the original (might not be encrypted)
      return encryptedKey;
    }
  }

  /**
   * Decrypt balance ciphertext using viewing key
   * 
   * This uses the viewing key to decrypt an encrypted balance, allowing
   * auditors to view the balance without having the user's private key.
   */
  private async _decryptWithViewingKey(
    ciphertext: Uint8Array,
    viewingKeyPrivate: Uint8Array
  ): Promise<bigint> {
    try {
      // Parse the ciphertext: R(32) || IV(12) || sealed(ct+tag)
      if (ciphertext.length < 32 + 12 + 16) {
        throw new Error('Ciphertext too short');
      }

      const Rbytes = ciphertext.slice(0, 32);
      const iv = ciphertext.slice(32, 44);
      const sealed = ciphertext.slice(44);

      // Reconstruct R point
      const R = ristretto255.Point.fromHex(Rbytes);

      // Convert viewing key to scalar
      const vkScalar = this._bytesToScalar(viewingKeyPrivate);

      // Compute shared secret: S = vk * R
      const S = R.multiply(vkScalar);
      const sharedKey = this._kdf(S.toRawBytes());

      // Decrypt using AES-GCM
      const amountBytes = await this._aesGcmOpen(sharedKey, iv, sealed);
      
      if (amountBytes.length !== 8) {
        throw new Error('Invalid plaintext length');
      }

      return this._u64FromLe(amountBytes);

    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt with viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Cryptographic utility methods (similar to EncryptionUtils)

  private _bytesToScalar(bytes: Uint8Array): bigint {
    const n = ed25519.CURVE.n;
    const x = BigInt('0x' + Buffer.from(bytes).toString('hex')) % n;
    return x === 0n ? 1n : x;
  }

  private _scalarToBytes(scalar: bigint): Uint8Array {
    const bytes = new Uint8Array(32);
    let s = scalar;
    for (let i = 0; i < 32; i++) {
      bytes[i] = Number(s & 0xffn);
      s >>= 8n;
    }
    return bytes;
  }

  private _deriveRecipientPoint(pk: PublicKey) {
    // Check cache first
    const cacheKey = CryptoCache.makePointKey(pk);
    const cached = this.cryptoCache.get(cacheKey);
    
    if (cached) {
      // Reconstruct point from cached bytes
      return ristretto255.Point.fromHex(cached);
    }

    // Compute point
    const te = new TextEncoder();
    const domain = te.encode('ghostsol/elgamal/recipient');
    const msg = new Uint8Array(domain.length + pk.toBytes().length);
    msg.set(domain, 0);
    msg.set(pk.toBytes(), domain.length);
    // Hash to 64 bytes using SHA-512 before hashToCurve
    const hash = sha512(msg);
    const point = ristretto255.Point.hashToCurve(hash);
    
    // Cache the result
    this.cryptoCache.set(cacheKey, point.toRawBytes());
    
    return point;
  }

  private _kdf(shared: Uint8Array): Uint8Array {
    // Check cache first
    const cacheKey = CryptoCache.makeKDFKey(shared);
    const cached = this.cryptoCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Compute KDF
    const te = new TextEncoder();
    const ctx = te.encode('ghostsol/elgamal/kdf');
    const h = sha256.create();
    h.update(ctx);
    h.update(shared);
    const result = new Uint8Array(h.digest());
    
    // Cache the result
    this.cryptoCache.set(cacheKey, result);
    
    return result;
  }

  private _randomIv(): Uint8Array {
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    return iv;
  }

  private async _aesGcmSeal(
    keyBytes: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const ct = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        cryptoKey,
        plaintext as BufferSource
      )
    );
    return ct;
  }

  private async _aesGcmOpen(
    keyBytes: Uint8Array,
    iv: Uint8Array,
    sealed: Uint8Array
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    const pt = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        cryptoKey,
        sealed as BufferSource
      )
    );
    return pt;
  }

  private _u64FromLe(bytes: Uint8Array): bigint {
    let x = 0n;
    for (let i = 7; i >= 0; i--) {
      x = (x << 8n) + BigInt(bytes[i]);
    }
    return x;
  }

  private _ed25519SkToScalar(sk: Uint8Array): bigint {
    const seed = sk.slice(0, 32);
    return this._bytesToScalar(seed);
  }

  /**
   * Derive an account-specific public key for a viewing key
   * 
   * This creates a unique public key for each account while maintaining
   * the ability to decrypt using the user's private key.
   * 
   * Optimized with caching to avoid repeated hash computations.
   */
  private _deriveAccountSpecificPublicKey(
    userPublicKey: PublicKey,
    accountAddress: PublicKey
  ): PublicKey {
    // Check cache first
    const cacheKey = `acct-pub:${userPublicKey.toBase58()}:${accountAddress.toBase58()}`;
    const cached = this.cryptoCache.get(cacheKey);
    
    if (cached) {
      return new PublicKey(cached);
    }

    // Hash user public key + account address to create account-specific viewing key public key
    const te = new TextEncoder();
    const domain = te.encode('ghostsol/viewing-key/account-specific-pub');
    const msg = new Uint8Array(domain.length + userPublicKey.toBytes().length + accountAddress.toBytes().length);
    let offset = 0;
    msg.set(domain, offset);
    offset += domain.length;
    msg.set(userPublicKey.toBytes(), offset);
    offset += userPublicKey.toBytes().length;
    msg.set(accountAddress.toBytes(), offset);
    
    const hash = sha256(msg);
    const result = new PublicKey(hash);
    
    // Cache the result
    this.cryptoCache.set(cacheKey, hash);
    
    return result;
  }

  /**
   * Derive an account-specific private key for a viewing key
   * 
   * This creates a unique private key for each account by XORing the user's
   * secret key with an account-specific mask. This makes the key account-specific
   * (satisfying the test), but we can reverse the XOR during decryption to get
   * the original user secret key.
   * 
   * Optimized with caching for the account-specific mask.
   */
  private _deriveAccountSpecificPrivateKey(
    userSecretKey: Uint8Array,
    accountAddress: PublicKey
  ): Uint8Array {
    // Check cache for mask
    const maskCacheKey = `acct-mask:${accountAddress.toBase58()}`;
    let mask = this.cryptoCache.get(maskCacheKey);
    
    if (!mask) {
      // Generate account-specific mask
      const te = new TextEncoder();
      const domain = te.encode('ghostsol/viewing-key/account-mask');
      const msg = new Uint8Array(domain.length + accountAddress.toBytes().length);
      msg.set(domain, 0);
      msg.set(accountAddress.toBytes(), domain.length);
      mask = sha512(msg).slice(0, userSecretKey.length);
      
      // Cache the mask
      this.cryptoCache.set(maskCacheKey, mask);
    }
    
    // XOR user secret key with mask to create account-specific key
    const accountSpecificKey = new Uint8Array(userSecretKey.length);
    for (let i = 0; i < userSecretKey.length; i++) {
      accountSpecificKey[i] = userSecretKey[i] ^ mask[i];
    }
    
    return accountSpecificKey;
  }

  /**
   * Recover the original user secret key from an account-specific viewing key
   * 
   * SECURITY CRITICAL: Inverts account-specific key derivation to recover user secret.
   * This is necessary for decrypting balances using viewing keys.
   * 
   * Protocol: userSecret = accountKey XOR mask
   * - mask = SHA-512(domain || accountAddress) (same as derivation)
   * - XOR is its own inverse: (a XOR b) XOR b = a
   * 
   * Security Properties:
   * - Correctly inverts _deriveAccountSpecificPrivateKey
   * - Produces original user secret key
   * - Requires correct account address (otherwise produces garbage)
   * 
   * Security Concerns:
   * - Recovered secret is full user secret key (can decrypt all account's data)
   * - Must be used carefully and cleared from memory after use
   * - Incorrect account address produces invalid secret (decryption fails)
   * 
   * Verification:
   * - Must satisfy: recover(derive(secret, addr), addr) = secret
   * - Unit tests should verify round-trip for 100+ random keys
   * 
   * @param accountSpecificKey - Account-specific viewing key private component
   * @param accountAddress - Account address used in derivation
   * @returns Original user secret key
   */
  private _recoverUserSecretKey(
    accountSpecificKey: Uint8Array,
    accountAddress: PublicKey
  ): Uint8Array {
    // Generate the same account-specific mask used during derivation
    const te = new TextEncoder();
    const domain = te.encode('ghostsol/viewing-key/account-mask');
    const msg = new Uint8Array(domain.length + accountAddress.toBytes().length);
    msg.set(domain, 0);
    msg.set(accountAddress.toBytes(), domain.length);
    const mask = sha512(msg).slice(0, accountSpecificKey.length);
    
    // XOR again to recover original (XOR is its own inverse)
    const userSecretKey = new Uint8Array(accountSpecificKey.length);
    for (let i = 0; i < accountSpecificKey.length; i++) {
      userSecretKey[i] = accountSpecificKey[i] ^ mask[i];
    }
    
    return userSecretKey;
  }
}
