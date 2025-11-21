/**
 * privacy/stealth-addresses.ts
 * 
 * Purpose: Stealth address protocol implementation using standard Ed25519 curves
 * 
 * This module implements stealth addresses to enable true sender/recipient unlinkability.
 * It uses the standard @noble/curves library for cryptographic operations.
 * 
 * Key concepts:
 * - Stealth Meta-Address: Published once, contains viewing and spending public keys
 * - Ephemeral Keys: Generated fresh for each stealth address (never reused)
 * - ECDH: Enables shared secret generation without revealing private keys
 * - Unlinkability: Each stealth address appears random and independent on-chain
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

/**
 * Stealth meta-address structure
 */
export interface StealthMetaAddress {
  /** Public viewing key (32 bytes) */
  viewingPublicKey: Uint8Array;
  /** Public spending key (32 bytes) */
  spendingPublicKey: Uint8Array;
  /** Private viewing key (32 bytes scalar) */
  viewingSecretKey: Uint8Array;
  /** Private spending key (32 bytes scalar) */
  spendingSecretKey: Uint8Array;
}

/**
 * One-time stealth address
 */
export interface StealthAddress {
  /** One-time stealth address to receive funds */
  address: PublicKey;
  /** Ephemeral public key (published with transaction) */
  ephemeralPublicKey: PublicKey;
  /** Raw ephemeral key bytes (32 bytes) */
  ephemeralKeyRaw: Uint8Array;
  /** Shared secret (kept private by sender) */
  sharedSecret?: Uint8Array;
}

/**
 * Stealth address detection result
 */
export interface StealthPaymentInfo {
  /** Whether transaction is for the recipient */
  isForMe: boolean;
  /** Stealth address if detected */
  stealthAddress?: PublicKey;
  /** Ephemeral key used */
  ephemeralPublicKey?: PublicKey;
  /** Shared secret for spending */
  sharedSecret?: Uint8Array;
}

/**
 * StealthAddressManager
 * 
 * Manages the complete lifecycle of stealth addresses using standard crypto.
 */
export class StealthAddressManager {
  
  /**
   * Generate a stealth meta-address
   */
  async generateStealthMetaAddress(): Promise<StealthMetaAddress> {
    // Generate viewing keypair
    const viewingSecretKey = ed25519.utils.randomPrivateKey();
    const viewingPublicKey = ed25519.getPublicKey(viewingSecretKey);
    
    // Generate spending keypair
    const spendingSecretKey = ed25519.utils.randomPrivateKey();
    const spendingPublicKey = ed25519.getPublicKey(spendingSecretKey);
    
    return {
      viewingPublicKey,
      spendingPublicKey,
      viewingSecretKey,
      spendingSecretKey
    };
  }
  
  /**
   * Generate a one-time stealth address for a recipient
   */
  async generateStealthAddress(
    recipientMetaAddress: StealthMetaAddress
  ): Promise<StealthAddress> {
    // 1. Generate ephemeral keypair
    const ephemeralSecretKey = ed25519.utils.randomPrivateKey();
    const ephemeralPublicKey = ed25519.getPublicKey(ephemeralSecretKey);
    
    // 2. Compute shared secret using ECDH
    // sharedSecret = hash(ephemeralPrivate * viewingPublic)
    const sharedPoint = ed25519.getSharedSecret(ephemeralSecretKey, recipientMetaAddress.viewingPublicKey);
    const sharedSecret = sha256(sharedPoint); // Hash to get a uniform scalar/seed
    
    // 3. Derive one-time stealth public key
    // stealthPubKey = spendingPublicKey + hash(sharedSecret) * G
    const offsetScalar = this.hashToScalar(sharedSecret);
    const offsetPoint = ed25519.ExtendedPoint.BASE.multiply(offsetScalar);
    const spendingPoint = ed25519.ExtendedPoint.fromHex(recipientMetaAddress.spendingPublicKey);
    const stealthPoint = spendingPoint.add(offsetPoint);
    const stealthPublicKeyBytes = stealthPoint.toRawBytes();
    
    return {
      address: new PublicKey(stealthPublicKeyBytes),
      ephemeralPublicKey: new PublicKey(ephemeralPublicKey),
      ephemeralKeyRaw: ephemeralPublicKey,
      sharedSecret
    };
  }
  
  /**
   * Check if a transaction is sent to user's stealth address
   */
  async isTransactionForMe(
    ephemeralPublicKey: Uint8Array,
    destinationAddress: PublicKey,
    metaAddress: StealthMetaAddress
  ): Promise<StealthPaymentInfo> {
    try {
      // 1. Compute shared secret using viewing key
      // sharedSecret = hash(viewingPrivate * ephemeralPublic)
      const sharedPoint = ed25519.getSharedSecret(metaAddress.viewingSecretKey, ephemeralPublicKey);
      const sharedSecret = sha256(sharedPoint);
      
      // 2. Derive expected stealth address
      const offsetScalar = this.hashToScalar(sharedSecret);
      const offsetPoint = ed25519.ExtendedPoint.BASE.multiply(offsetScalar);
      const spendingPoint = ed25519.ExtendedPoint.fromHex(metaAddress.spendingPublicKey);
      const expectedStealthPoint = spendingPoint.add(offsetPoint);
      const expectedStealthAddress = new PublicKey(expectedStealthPoint.toRawBytes());
      
      // 3. Check if it matches
      if (expectedStealthAddress.equals(destinationAddress)) {
        return {
          isForMe: true,
          stealthAddress: destinationAddress,
          ephemeralPublicKey: new PublicKey(ephemeralPublicKey),
          sharedSecret
        };
      }
      
      return { isForMe: false };
      
    } catch (error) {
      return { isForMe: false };
    }
  }
  
  /**
   * Derive the private key for spending from a stealth address
   */
  async deriveStealthSpendingKey(
    metaAddress: StealthMetaAddress,
    sharedSecret: Uint8Array
  ): Promise<Keypair> {
    // stealthPrivKey = spendingPrivateKey + hash(sharedSecret)
    
    const n = ed25519.CURVE.n;
    const spendingInt = this.bytesToBigInt(metaAddress.spendingSecretKey);
    const offsetInt = this.bytesToBigInt(sha256(sharedSecret));
    const stealthInt = (spendingInt + offsetInt) % n;
    
    const stealthSecretKey = this.bigIntTo32Bytes(stealthInt);
    
    return Keypair.fromSeed(stealthSecretKey);
  }

  private hashToScalar(data: Uint8Array): bigint {
    const hash = sha256(data);
    return this.bytesToBigInt(hash) % ed25519.CURVE.n;
  }

  private bytesToBigInt(bytes: Uint8Array): bigint {
    let value = 0n;
    for (let i = bytes.length - 1; i >= 0; i--) {
      value = (value << 8n) + BigInt(bytes[i]);
    }
    return value;
  }

  private bigIntTo32Bytes(num: bigint): Uint8Array {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = Number(num & 0xffn);
      num >>= 8n;
    }
    return bytes;
  }
}

export class StealthAddressUtils {
  static encodeMetaAddress(metaAddress: StealthMetaAddress): string {
    const viewingPkHex = Buffer.from(metaAddress.viewingPublicKey).toString('hex');
    const spendingPkHex = Buffer.from(metaAddress.spendingPublicKey).toString('hex');
    return `stealth:${viewingPkHex}:${spendingPkHex}`;
  }
}
