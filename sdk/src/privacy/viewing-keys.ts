/**
 * privacy/viewing-keys.ts
 * 
 * Purpose: Viewing key management for compliance and auditing
 * 
 * This module provides viewing key functionality that allows authorized
 * parties (like auditors or regulators) to decrypt confidential transfer
 * data while maintaining privacy for other users.
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { 
  ViewingKey, 
  ViewingKeyPermissions, 
  EncryptedBalance 
} from './types';
import { 
  ViewingKeyError, 
  ComplianceError, 
  EncryptionError 
} from './errors';
import { ExtendedWalletAdapter } from '../core/types';
import { ristretto255 } from '@noble/curves/ristretto255';
import { sha256 } from '@noble/hashes/sha256';

/**
 * Manager class for viewing keys and compliance features
 * 
 * This class handles the generation, management, and use of viewing keys
 * that allow authorized parties to decrypt confidential transfer data
 * for compliance and auditing purposes.
 */
export class ViewingKeyManager {
  private wallet: ExtendedWalletAdapter;
  private viewingKeys: Map<string, ViewingKey> = new Map();

  constructor(wallet: ExtendedWalletAdapter) {
    this.wallet = wallet;
  }

  /**
   * Generate a new viewing key for a confidential account
   * 
   * @param accountAddress - Confidential account to create viewing key for
   * @param permissions - Permissions to grant to the viewing key
   * @param expirationDays - Optional expiration in days
   * @returns Generated viewing key
   */
  async generateViewingKey(
    accountAddress: PublicKey,
    permissions?: ViewingKeyPermissions,
    expirationDays?: number
  ): Promise<ViewingKey> {
    try {
      // Generate a new keypair for the viewing key
      const viewingKeyKeypair = Keypair.generate();
      
      // Default permissions if not provided
      const defaultPermissions: ViewingKeyPermissions = {
        canViewBalances: true,
        canViewAmounts: true,
        canViewMetadata: false,
        allowedAccounts: [accountAddress]
      };
      
      const keyPermissions = permissions || defaultPermissions;
      
      // Encrypt the private key using the account owner's public key
      const encryptedPrivateKey = await this._encryptPrivateKey(
        viewingKeyKeypair.secretKey,
        this.wallet.publicKey
      );
      
      // Calculate expiration if provided
      const expiresAt = expirationDays 
        ? Date.now() + (expirationDays * 24 * 60 * 60 * 1000)
        : undefined;
      
      const viewingKey: ViewingKey = {
        publicKey: viewingKeyKeypair.publicKey,
        encryptedPrivateKey,
        derivationPath: this._generateDerivationPath(accountAddress),
        permissions: keyPermissions,
        expiresAt
      };
      
      // Store the viewing key
      const keyId = this._getKeyId(accountAddress, viewingKeyKeypair.publicKey);
      this.viewingKeys.set(keyId, viewingKey);
      
      return viewingKey;
      
    } catch (error) {
      throw new ViewingKeyError(
        `Failed to generate viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt a balance using a viewing key
   * 
   * @param encryptedBalance - Encrypted balance to decrypt
   * @param viewingKey - Viewing key with decryption permissions
   * @returns Decrypted balance amount
   */
  async decryptBalance(
    encryptedBalance: EncryptedBalance,
    viewingKey: ViewingKey
  ): Promise<number> {
    try {
      // Validate viewing key permissions
      if (!viewingKey.permissions.canViewBalances) {
        throw new ComplianceError('Viewing key does not have balance viewing permissions');
      }
      
      // Check expiration
      if (viewingKey.expiresAt && Date.now() > viewingKey.expiresAt) {
        throw new ComplianceError('Viewing key has expired');
      }
      
      // Decrypt the viewing key's private key
      const viewingKeyPrivateKey = await this._decryptPrivateKey(
        viewingKey.encryptedPrivateKey,
        this.wallet.rawKeypair!
      );
      
      // Use the viewing key to decrypt the balance
      const decryptedAmount = await this._decryptBalanceWithKey(
        encryptedBalance,
        viewingKeyPrivateKey
      );
      
      return Number(decryptedAmount);
      
    } catch (error) {
      throw new ViewingKeyError(
        `Failed to decrypt balance with viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt a transaction amount using a viewing key
   * 
   * @param encryptedAmount - Encrypted amount from transaction
   * @param viewingKey - Viewing key with amount viewing permissions
   * @returns Decrypted amount
   */
  async decryptAmount(
    encryptedAmount: Uint8Array,
    viewingKey: ViewingKey
  ): Promise<number> {
    try {
      // Validate viewing key permissions
      if (!viewingKey.permissions.canViewAmounts) {
        throw new ComplianceError('Viewing key does not have amount viewing permissions');
      }
      
      // Check expiration
      if (viewingKey.expiresAt && Date.now() > viewingKey.expiresAt) {
        throw new ComplianceError('Viewing key has expired');
      }
      
      // Decrypt the viewing key's private key
      const viewingKeyPrivateKey = await this._decryptPrivateKey(
        viewingKey.encryptedPrivateKey,
        this.wallet.rawKeypair!
      );
      
      // Use the viewing key to decrypt the amount
      const decryptedAmount = await this._decryptAmountWithKey(
        encryptedAmount,
        viewingKeyPrivateKey
      );
      
      return Number(decryptedAmount);
      
    } catch (error) {
      throw new ViewingKeyError(
        `Failed to decrypt amount with viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Revoke a viewing key
   * 
   * @param accountAddress - Account the viewing key is for
   * @param viewingKeyPublicKey - Public key of the viewing key to revoke
   */
  async revokeViewingKey(
    accountAddress: PublicKey,
    viewingKeyPublicKey: PublicKey
  ): Promise<void> {
    try {
      const keyId = this._getKeyId(accountAddress, viewingKeyPublicKey);
      
      if (!this.viewingKeys.has(keyId)) {
        throw new ViewingKeyError('Viewing key not found');
      }
      
      this.viewingKeys.delete(keyId);
      
      // TODO: In a full implementation, this would also update the on-chain
      // revocation list to prevent future use of the viewing key
      
    } catch (error) {
      throw new ViewingKeyError(
        `Failed to revoke viewing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * List all viewing keys for an account
   * 
   * @param accountAddress - Account to list viewing keys for
   * @returns Array of viewing keys
   */
  getViewingKeys(accountAddress: PublicKey): ViewingKey[] {
    const accountKeys: ViewingKey[] = [];
    
    for (const [keyId, viewingKey] of this.viewingKeys.entries()) {
      if (keyId.startsWith(accountAddress.toBase58())) {
        accountKeys.push(viewingKey);
      }
    }
    
    return accountKeys;
  }

  /**
   * Check if a viewing key is valid and has required permissions
   * 
   * @param viewingKey - Viewing key to validate
   * @param requiredPermissions - Required permissions
   * @returns True if valid, false otherwise
   */
  validateViewingKey(
    viewingKey: ViewingKey,
    requiredPermissions: Partial<ViewingKeyPermissions>
  ): boolean {
    // Check expiration
    if (viewingKey.expiresAt && Date.now() > viewingKey.expiresAt) {
      return false;
    }
    
    // Check permissions
    const permissions = viewingKey.permissions;
    
    if (requiredPermissions.canViewBalances && !permissions.canViewBalances) {
      return false;
    }
    
    if (requiredPermissions.canViewAmounts && !permissions.canViewAmounts) {
      return false;
    }
    
    if (requiredPermissions.canViewMetadata && !permissions.canViewMetadata) {
      return false;
    }
    
    return true;
  }

  // Private helper methods

  private async _encryptPrivateKey(
    privateKey: Uint8Array,
    recipientPublicKey: PublicKey
  ): Promise<Uint8Array> {
    // ECIES-style: R = rG, S = r*PK, K = KDF(S), CT = AES-GCM_K(IV, privateKey)
    const rBytes = new Uint8Array(32);
    crypto.getRandomValues(rBytes);
    const r = this._bytesToScalar(rBytes);

    const recipientPoint = this._deriveRecipientPoint(recipientPublicKey);
    const R = ristretto255.RistrettoPoint.BASE.multiply(r);
    const S = recipientPoint.multiply(r);
    const K = this._kdf(S.toRawBytes());

    const iv = this._randomIv();
    const sealed = await this._aesGcmSeal(K, iv, privateKey);

    const out = new Uint8Array(32 + 12 + sealed.length);
    out.set(R.toRawBytes(), 0);
    out.set(iv, 32);
    out.set(sealed, 44);
    return out;
  }

  private async _decryptPrivateKey(
    encryptedPrivateKey: Uint8Array,
    ownerKeypair: Keypair
  ): Promise<Uint8Array> {
    if (encryptedPrivateKey.length < 32 + 12 + 16) {
      throw new EncryptionError('Invalid encrypted viewing key');
    }
    const Rbytes = encryptedPrivateKey.slice(0, 32);
    const iv = encryptedPrivateKey.slice(32, 44);
    const sealed = encryptedPrivateKey.slice(44);

    const R = ristretto255.RistrettoPoint.fromHex(Rbytes);
    const skScalar = this._ed25519SkToScalar(ownerKeypair.secretKey);
    const S = R.multiply(skScalar);
    const K = this._kdf(S.toRawBytes());

    const pt = await this._aesGcmOpen(K, iv, sealed);
    return pt;
  }

  private async _decryptBalanceWithKey(
    encryptedBalance: EncryptedBalance,
    viewingKeyPrivateKey: Uint8Array
  ): Promise<bigint> {
    // TODO: Implement actual balance decryption using viewing key
    // This would use the viewing key to decrypt the ElGamal encrypted balance
    
    // Placeholder implementation
    return BigInt(0);
  }

  private async _decryptAmountWithKey(
    encryptedAmount: Uint8Array,
    viewingKeyPrivateKey: Uint8Array
  ): Promise<bigint> {
    // TODO: Implement actual amount decryption using viewing key
    // This would use the viewing key to decrypt the ElGamal encrypted amount
    
    // Placeholder implementation
    return BigInt(0);
  }

  private _generateDerivationPath(accountAddress: PublicKey): string {
    // Generate a deterministic derivation path for the viewing key
    return `m/44'/501'/${accountAddress.toBase58().slice(0, 8)}'`;
  }

  private _getKeyId(accountAddress: PublicKey, viewingKeyPublicKey: PublicKey): string {
    return `${accountAddress.toBase58()}_${viewingKeyPublicKey.toBase58()}`;
  }
}

// Helper methods for ECIES-like sealing
export interface _VKHelpers {}

export interface ViewingKeyManager {
  _bytesToScalar(bytes: Uint8Array): bigint;
  _deriveRecipientPoint(pk: PublicKey): ristretto255.RistrettoPoint;
  _kdf(shared: Uint8Array): Uint8Array;
  _randomIv(): Uint8Array;
  _aesGcmSeal(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
  _aesGcmOpen(key: Uint8Array, iv: Uint8Array, sealed: Uint8Array): Promise<Uint8Array>;
  _ed25519SkToScalar(sk: Uint8Array): bigint;
}

ViewingKeyManager.prototype._bytesToScalar = function (bytes: Uint8Array): bigint {
  const n = ristretto255.CURVE.n;
  const x = BigInt('0x' + Buffer.from(bytes).toString('hex')) % n;
  return x === 0n ? 1n : x;
};

ViewingKeyManager.prototype._deriveRecipientPoint = function (pk: PublicKey) {
  const te = new TextEncoder();
  const domain = te.encode('ghostsol/viewing-key/recipient');
  const msg = new Uint8Array(domain.length + pk.toBytes().length);
  msg.set(domain, 0);
  msg.set(pk.toBytes(), domain.length);
  return ristretto255.hashToCurve(msg);
};

ViewingKeyManager.prototype._kdf = function (shared: Uint8Array): Uint8Array {
  const te = new TextEncoder();
  const h = sha256.create();
  h.update(te.encode('ghostsol/viewing-key/kdf'));
  h.update(shared);
  return new Uint8Array(h.digest());
};

ViewingKeyManager.prototype._randomIv = function (): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
};

ViewingKeyManager.prototype._aesGcmSeal = async function (
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
  return new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext));
};

ViewingKeyManager.prototype._aesGcmOpen = async function (
  keyBytes: Uint8Array,
  iv: Uint8Array,
  sealed: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt']);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, sealed));
};

ViewingKeyManager.prototype._ed25519SkToScalar = function (sk: Uint8Array): bigint {
  const seed = sk.slice(0, 32);
  const n = ristretto255.CURVE.n;
  const x = BigInt('0x' + Buffer.from(seed).toString('hex')) % n;
  return x === 0n ? 1n : x;
};
