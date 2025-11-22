/**
 * privacy/stealth-address.ts
 * 
 * Purpose: Stealth address protocol implementation using standard Ed25519 curves
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { ed25519 } from '@noble/curves/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';
import {
  StealthMetaAddress,
  StealthAddress,
  StealthPayment,
  EphemeralKey
} from './types';

/**
 * StealthAddressManager
 * 
 * Manages the complete lifecycle of stealth addresses using standard crypto.
 */
export class StealthAddressManager {

  /**
   * Generate a stealth meta-address
   */
  generateStealthMetaAddress(viewKeypair?: Keypair, spendKeypair?: Keypair): StealthMetaAddress {
    // Use provided keypairs or generate new ones
    const viewKey = viewKeypair || Keypair.generate();
    const spendKey = spendKeypair || Keypair.generate();

    return {
      viewPublicKey: viewKey.publicKey,
      spendPublicKey: spendKey.publicKey,
      derivationPath: "m/44'/501'/0'/0'", // Default path
      version: 1,
      createdAt: Date.now()
      // Note: We don't store private keys in the meta-address object for security
      // The user must manage the keypairs (e.g. via wallet)
    };
  }

  /**
   * Generate a one-time stealth address for a recipient
   */
  generateStealthAddress(
    recipientMetaAddress: StealthMetaAddress,
    ephemeralKeypair?: Keypair
  ): { stealthAddress: StealthAddress; ephemeralKey: EphemeralKey } {
    // 1. Generate ephemeral keypair
    const ephemeralKey = ephemeralKeypair || Keypair.generate();

    // 2. Compute shared secret using ECDH
    // sharedSecret = hash(ephemeralPrivate * viewingPublic)
    const viewingPubBytes = recipientMetaAddress.viewPublicKey.toBytes();
    // ed25519 secret key is 32 bytes (seed).
    const ephemeralPrivBytes = ephemeralKey.secretKey.slice(0, 32);

    // Get the actual scalar from the seed (clamping)
    const ephemeralScalar = this.getScalarFromSeed(ephemeralPrivBytes);

    // Manual ECDH: sharedPoint = viewingPublicPoint * ephemeralPrivateScalar
    const viewingPoint = ed25519.ExtendedPoint.fromHex(viewingPubBytes);
    const sharedPoint = viewingPoint.multiply(ephemeralScalar);
    const sharedSecret = sha256(sharedPoint.toRawBytes());

    // 3. Derive one-time stealth public key
    // stealthPubKey = spendingPublicKey + hash(sharedSecret) * G
    const offsetScalar = this.hashToScalar(sharedSecret);
    const offsetPoint = ed25519.ExtendedPoint.BASE.multiply(offsetScalar);

    const spendingPubBytes = recipientMetaAddress.spendPublicKey.toBytes();
    const spendingPoint = ed25519.ExtendedPoint.fromHex(spendingPubBytes);

    const stealthPoint = spendingPoint.add(offsetPoint);
    const stealthPublicKeyBytes = stealthPoint.toRawBytes();
    const stealthPublicKey = new PublicKey(stealthPublicKeyBytes);

    const stealthAddress: StealthAddress = {
      address: stealthPublicKey,
      ephemeralPublicKey: ephemeralKey.publicKey,
      sharedSecretHash: Buffer.from(sha256(sharedSecret)).toString('hex'),
      metaAddress: recipientMetaAddress,
      createdAt: Date.now()
    };

    const ephemeralKeyObj: EphemeralKey = {
      publicKey: ephemeralKey.publicKey,
      encryptedPrivateKey: new Uint8Array(0), // Placeholder
      transactionSignature: "",
      createdAt: Date.now()
    };

    return { stealthAddress, ephemeralKey: ephemeralKeyObj };
  }

  /**
   * Scan for payments sent to user's stealth address
   */
  async scanForPayments(
    metaAddress: StealthMetaAddress,
    viewPrivateKey: Uint8Array,
    ephemeralKeys: EphemeralKey[]
  ): Promise<StealthPayment[]> {
    const payments: StealthPayment[] = [];

    // viewPrivateKey is likely the full 64-byte secret key from Keypair
    // We need the first 32 bytes (seed) for scalar derivation
    const viewPrivBytes = viewPrivateKey.length === 64 ? viewPrivateKey.slice(0, 32) : viewPrivateKey;
    const viewScalar = this.getScalarFromSeed(viewPrivBytes);

    for (const eKey of ephemeralKeys) {
      try {
        // 1. Compute shared secret using viewing key
        const ephemeralPubBytes = eKey.publicKey.toBytes();

        // Manual ECDH: sharedPoint = ephemeralPublicPoint * viewingPrivateScalar
        const ephemeralPoint = ed25519.ExtendedPoint.fromHex(ephemeralPubBytes);
        const sharedPoint = ephemeralPoint.multiply(viewScalar);
        const sharedSecret = sha256(sharedPoint.toRawBytes());

        // 2. Derive expected stealth address
        const offsetScalar = this.hashToScalar(sharedSecret);
        const offsetPoint = ed25519.ExtendedPoint.BASE.multiply(offsetScalar);

        const spendingPubBytes = metaAddress.spendPublicKey.toBytes();
        const spendingPoint = ed25519.ExtendedPoint.fromHex(spendingPubBytes);

        const expectedStealthPoint = spendingPoint.add(offsetPoint);
        const expectedStealthAddress = new PublicKey(expectedStealthPoint.toRawBytes());

        payments.push({
          stealthAddress: expectedStealthAddress,
          ephemeralPublicKey: eKey.publicKey,
          sharedSecret: Buffer.from(sharedSecret),
          transactionSignature: eKey.transactionSignature,
          amount: 0,
          detectedAt: Date.now(),
          spent: false
        });

      } catch (error) {
        // Skip invalid keys
        continue;
      }
    }

    return payments;
  }

  /**
   * Derive the private key for spending from a stealth address
   */
  deriveStealthSpendingKey(
    metaAddress: StealthMetaAddress,
    sharedSecret: Uint8Array
  ): Keypair {
    throw new Error("Use deriveStealthSpendingKeyWithPrivate instead");
  }

  deriveStealthSpendingKeyWithPrivate(
    sharedSecret: Uint8Array,
    spendPrivateKey: Uint8Array
  ): { privateKey: Uint8Array; publicKey: PublicKey } {
    // stealthPrivKey = spendingPrivateKey + hash(sharedSecret)

    const n = ed25519.CURVE.n;
    const spendPrivBytes = spendPrivateKey.length === 64 ? spendPrivateKey.slice(0, 32) : spendPrivateKey;

    // Spending key is also a scalar derived from seed
    const spendingScalar = this.getScalarFromSeed(spendPrivBytes);

    const offsetScalar = this.hashToScalar(sharedSecret); // This is already mod n
    const stealthScalar = (spendingScalar + offsetScalar) % n;

    // Convert scalar to 32 bytes (little endian)
    const stealthSecretKey = this.bigIntTo32Bytes(stealthScalar);

    // We derive the public key manually
    const stealthPoint = ed25519.ExtendedPoint.BASE.multiply(stealthScalar);
    const stealthPubBytes = stealthPoint.toRawBytes();

    return {
      privateKey: stealthSecretKey,
      publicKey: new PublicKey(stealthPubBytes)
    };
  }

  /**
   * Verify that a stealth address was correctly derived from the meta-address and ephemeral key.
   * Requires the recipient's view private key.
   */
  verifyStealthAddress(
    stealthAddress: PublicKey,
    metaAddress: StealthMetaAddress,
    ephemeralPublicKey: PublicKey,
    viewPrivateKey: Uint8Array
  ): boolean {
    try {
      // 1. Compute shared secret using viewing key
      // sharedSecret = hash(ephemeralPublic * viewingPrivate)

      const viewPrivBytes = viewPrivateKey.length === 64 ? viewPrivateKey.slice(0, 32) : viewPrivateKey;
      const viewScalar = this.getScalarFromSeed(viewPrivBytes);

      const ephemeralPubBytes = ephemeralPublicKey.toBytes();
      const ephemeralPoint = ed25519.ExtendedPoint.fromHex(ephemeralPubBytes);

      const sharedPoint = ephemeralPoint.multiply(viewScalar);
      const sharedSecret = sha256(sharedPoint.toRawBytes());

      // 2. Derive expected stealth address
      // expected = spendingPublic + hash(sharedSecret) * G

      const offsetScalar = this.hashToScalar(sharedSecret);
      const offsetPoint = ed25519.ExtendedPoint.BASE.multiply(offsetScalar);

      const spendingPubBytes = metaAddress.spendPublicKey.toBytes();
      const spendingPoint = ed25519.ExtendedPoint.fromHex(spendingPubBytes);

      const expectedStealthPoint = spendingPoint.add(offsetPoint);
      const expectedStealthAddress = new PublicKey(expectedStealthPoint.toRawBytes());

      return expectedStealthAddress.equals(stealthAddress);

    } catch (error) {
      console.error("Stealth verification failed:", error);
      return false;
    }
  }

  private getScalarFromSeed(seed: Uint8Array): bigint {
    const hash = sha512(seed);
    const s = hash.slice(0, 32);
    s[0] &= 248;
    s[31] &= 63;
    s[31] |= 64;
    return this.bytesToBigInt(s) % ed25519.CURVE.n;
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
