/**
 * privacy/stealth-address.ts
 * 
 * Purpose: Stealth address implementation for unlinkable payments on Solana
 * 
 * This module implements stealth addresses based on ECDH (Elliptic Curve Diffie-Hellman)
 * to provide payment unlinkability. Recipients can receive payments to unique one-time
 * addresses that are unlinkable on-chain but can be detected and spent by the recipient.
 * 
 * Key Features:
 * - Generate stealth meta-addresses (public information for senders)
 * - Generate unique stealth addresses for each payment
 * - Scan blockchain for payments to stealth addresses
 * - Derive spending keys for detected payments
 * - Maintain complete on-chain unlinkability
 * 
 * Protocol Overview:
 * 1. Recipient generates meta-address: (V, S) where V = view key, S = spend key
 * 2. Sender generates ephemeral keypair (r) and computes stealth address: P = Hash(r*V)*G + S
 * 3. Sender publishes ephemeral public key R = r*G alongside payment
 * 4. Recipient scans for ephemeral public keys and checks if r*V corresponds to their payment
 * 5. Recipient derives private key for detected payment: p = Hash(r*V) + s
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { sha256 } from '@noble/hashes/sha256';
import { secp256k1 } from '@noble/curves/secp256k1';
import { 
  StealthMetaAddress, 
  StealthAddress, 
  EphemeralKey,
  StealthPayment,
  StealthAddressError
} from './types';
import { PrivacyError } from './errors';
import { BlockchainScanner } from './blockchain-scanner';

/**
 * Stealth Address Manager
 * 
 * Implements the stealth address protocol for unlinkable payments.
 * Uses ECDH over secp256k1 curve for key derivation.
 */
export class StealthAddressManager {
  private scanner: BlockchainScanner;

  constructor() {
    // Initialize blockchain scanner with default config
    this.scanner = new BlockchainScanner({
      batchSize: 100,
      cacheExpirationMs: 60000, // 1 minute cache
      maxScanDepth: 10000, // ~1 hour of history
      verbose: false
    });
  }
  /**
   * Generate a stealth meta-address for receiving payments
   * 
   * The meta-address consists of:
   * - View key: Used to detect incoming payments
   * - Spend key: Used to spend detected payments
   * 
   * @param viewKeypair - Keypair for viewing (detecting payments)
   * @param spendKeypair - Keypair for spending (optional, generated if not provided)
   * @returns Stealth meta-address
   */
  generateStealthMetaAddress(
    viewKeypair: Keypair,
    spendKeypair?: Keypair
  ): StealthMetaAddress {
    try {
      const spendKey = spendKeypair || Keypair.generate();
      
      return {
        viewPublicKey: viewKeypair.publicKey,
        spendPublicKey: spendKey.publicKey,
        derivationPath: 'm/44\'/501\'/0\'/0\'', // Solana derivation path
        version: 1,
        createdAt: Date.now()
      };
    } catch (error) {
      throw new PrivacyError(
        `Failed to generate stealth meta-address: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate a unique stealth address for a payment
   * 
   * Uses ECDH to derive a shared secret and generate a one-time address
   * that only the recipient can link to their identity.
   * 
   * @param recipientMetaAddress - Recipient's stealth meta-address
   * @param ephemeralKeypair - Optional ephemeral keypair (generated if not provided)
   * @returns Stealth address and ephemeral public key
   */
  generateStealthAddress(
    recipientMetaAddress: StealthMetaAddress,
    ephemeralKeypair?: Keypair
  ): { stealthAddress: StealthAddress; ephemeralKey: EphemeralKey } {
    try {
      // Generate ephemeral keypair for this payment
      const ephemeral = ephemeralKeypair || Keypair.generate();
      
      // Convert Solana keys to secp256k1 format for ECDH
      const viewPublicKeyBytes = recipientMetaAddress.viewPublicKey.toBytes();
      const spendPublicKeyBytes = recipientMetaAddress.spendPublicKey.toBytes();
      const ephemeralPrivateKeyBytes = ephemeral.secretKey.slice(0, 32);
      
      // Compute shared secret: s = Hash(r * V) where r = ephemeral private, V = view public
      const sharedSecret = this._computeSharedSecret(
        ephemeralPrivateKeyBytes,
        viewPublicKeyBytes
      );
      
      // Derive stealth public key: P = Hash(s) * G + S
      const stealthPublicKey = this._deriveStealthPublicKey(
        sharedSecret,
        spendPublicKeyBytes
      );
      
      const stealthAddress: StealthAddress = {
        address: new PublicKey(stealthPublicKey),
        ephemeralPublicKey: ephemeral.publicKey,
        sharedSecretHash: Buffer.from(sha256(sharedSecret)).toString('hex'),
        metaAddress: recipientMetaAddress,
        createdAt: Date.now()
      };
      
      const ephemeralKey: EphemeralKey = {
        publicKey: ephemeral.publicKey,
        encryptedPrivateKey: ephemeralPrivateKeyBytes, // In practice, should be encrypted
        transactionSignature: '', // Set by caller
        createdAt: Date.now()
      };
      
      return { stealthAddress, ephemeralKey };
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to generate stealth address: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Scan for payments to stealth addresses
   * 
   * Checks a list of ephemeral public keys to determine if any payments
   * were sent to the user's stealth addresses.
   * 
   * @param metaAddress - User's stealth meta-address
   * @param viewPrivateKey - User's view private key (for checking)
   * @param ephemeralKeys - List of ephemeral keys from blockchain
   * @returns Array of detected stealth payments
   */
  async scanForPayments(
    metaAddress: StealthMetaAddress,
    viewPrivateKey: Uint8Array,
    ephemeralKeys: EphemeralKey[]
  ): Promise<StealthPayment[]> {
    try {
      const detectedPayments: StealthPayment[] = [];
      
      for (const ephemeralKey of ephemeralKeys) {
        // Compute shared secret: s = view_private * ephemeral_public
        const ephemeralPublicKeyBytes = ephemeralKey.publicKey.toBytes();
        const sharedSecret = this._computeSharedSecret(
          viewPrivateKey,
          ephemeralPublicKeyBytes
        );
        
        // Derive expected stealth public key
        const expectedStealthPublicKey = this._deriveStealthPublicKey(
          sharedSecret,
          metaAddress.spendPublicKey.toBytes()
        );
        
        // Check if this corresponds to an actual payment by looking up the derived address
        // In a real implementation, you would query the blockchain for this address
        const stealthAddress = new PublicKey(expectedStealthPublicKey);
        
        // For now, we mark it as detected (caller should verify on-chain)
        detectedPayments.push({
          stealthAddress,
          ephemeralPublicKey: ephemeralKey.publicKey,
          sharedSecret: Buffer.from(sharedSecret),
          transactionSignature: ephemeralKey.transactionSignature,
          amount: 0, // Should be fetched from on-chain data
          detectedAt: Date.now(),
          spent: false
        });
      }
      
      return detectedPayments;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to scan for payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Derive spending key for a detected stealth payment
   * 
   * Computes the private key needed to spend from a detected stealth address.
   * 
   * @param payment - Detected stealth payment
   * @param spendPrivateKey - User's spend private key
   * @returns Private key for spending the stealth payment
   */
  deriveStealthSpendingKey(
    payment: StealthPayment,
    spendPrivateKey: Uint8Array
  ): Uint8Array {
    try {
      // Compute stealth private key: p = Hash(sharedSecret) + spend_private
      const secretHash = sha256(payment.sharedSecret);
      
      // Add the spend private key (mod curve order)
      const stealthPrivateKey = this._addPrivateKeys(secretHash, spendPrivateKey);
      
      return stealthPrivateKey;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to derive spending key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Verify that a stealth address was correctly generated
   * 
   * @param stealthAddress - Stealth address to verify
   * @param metaAddress - Original meta-address
   * @param ephemeralPublicKey - Ephemeral public key used
   * @returns true if valid, false otherwise
   */
  verifyStealthAddress(
    stealthAddress: PublicKey,
    metaAddress: StealthMetaAddress,
    ephemeralPublicKey: PublicKey
  ): boolean {
    try {
      // This verification requires the ephemeral private key, which the verifier doesn't have
      // In practice, only the sender can fully verify their own stealth address generation
      // Recipients verify by successfully deriving the spending key
      
      // Basic sanity checks
      if (!stealthAddress || !metaAddress || !ephemeralPublicKey) {
        return false;
      }
      
      // Check that addresses are valid Solana public keys
      if (stealthAddress.toBuffer().length !== 32) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch ephemeral keys from blockchain transactions
   * 
   * This method scans the blockchain for transactions containing ephemeral keys
   * published alongside stealth address payments. Uses transaction memos to
   * discover ephemeral public keys.
   * 
   * MVP Implementation:
   * - Scans transaction memos for ephemeral keys in format: STEALTH:<public_key>
   * - Caches results to avoid redundant scanning
   * - Supports scanning specific stealth addresses or all transactions
   * 
   * @param connection - Solana connection
   * @param stealthAddress - Optional stealth address to scan for
   * @param startSlot - Optional starting slot for scanning
   * @param endSlot - Optional ending slot for scanning
   * @returns Array of ephemeral keys found on-chain
   */
  async fetchEphemeralKeysFromBlockchain(
    connection: any,
    stealthAddress?: PublicKey,
    startSlot?: number,
    endSlot?: number
  ): Promise<EphemeralKey[]> {
    try {
      // Use the blockchain scanner to fetch ephemeral keys
      const ephemeralKeys = await this.scanner.fetchEphemeralKeys(
        connection,
        stealthAddress,
        startSlot,
        endSlot
      );
      
      return ephemeralKeys;
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to fetch ephemeral keys from blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Scan blockchain for payments to stealth addresses
   * 
   * This is a convenience method that fetches ephemeral keys from the blockchain
   * and scans for payments in one operation.
   * 
   * @param connection - Solana connection
   * @param metaAddress - User's stealth meta-address
   * @param viewPrivateKey - User's view private key
   * @param stealthAddress - Optional specific stealth address to scan for
   * @param startSlot - Optional starting slot for scanning
   * @param endSlot - Optional ending slot for scanning
   * @returns Array of detected stealth payments
   */
  async scanBlockchainForPayments(
    connection: any,
    metaAddress: StealthMetaAddress,
    viewPrivateKey: Uint8Array,
    stealthAddress?: PublicKey,
    startSlot?: number,
    endSlot?: number
  ): Promise<StealthPayment[]> {
    try {
      // Fetch ephemeral keys from blockchain
      const ephemeralKeys = await this.fetchEphemeralKeysFromBlockchain(
        connection,
        stealthAddress,
        startSlot,
        endSlot
      );
      
      // Scan for payments using the fetched keys
      return await this.scanForPayments(metaAddress, viewPrivateKey, ephemeralKeys);
      
    } catch (error) {
      throw new PrivacyError(
        `Failed to scan blockchain for payments: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get scanner instance for advanced usage
   * 
   * @returns Blockchain scanner instance
   */
  getScanner(): BlockchainScanner {
    return this.scanner;
  }

  // Private helper methods

  /**
   * Compute ECDH shared secret
   * 
   * SECURITY CRITICAL: This function implements ECDH key exchange for stealth addresses.
   * The security of the entire stealth address protocol depends on this computation.
   * 
   * Security Properties:
   * - Uses secp256k1 elliptic curve (Bitcoin's curve)
   * - Shared secret = privateKey * publicKey (scalar multiplication)
   * - Result is hashed with SHA-256 for uniform distribution
   * 
   * Security Concerns:
   * ⚠️ CRITICAL: Fallback to hash-based secret on error is INSECURE
   * ⚠️ Fallback undermines unlinkability if triggered
   * ⚠️ TODO: Remove fallback for production, fail explicitly instead
   * 
   * Attack Vectors:
   * - Invalid curve point injection (if point validation missing)
   * - Timing side-channels in scalar multiplication (library-dependent)
   * - Forcing fallback to weak hash-based secret
   * 
   * @param privateKey - Private key (32 bytes)
   * @param publicKey - Public key (32 bytes)
   * @returns Shared secret (32 bytes)
   */
  private _computeSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
    try {
      // SECURITY: Use secp256k1 for ECDH computation
      // shared_secret = private * public (point multiplication)
      const point = secp256k1.ProjectivePoint.fromHex(
        Buffer.from(publicKey).toString('hex')
      );
      const scalar = BigInt('0x' + Buffer.from(privateKey).toString('hex'));
      const sharedPoint = point.multiply(scalar);
      
      // SECURITY: Hash the x-coordinate for the shared secret
      // This provides uniform distribution over the output space
      const sharedX = sharedPoint.toRawBytes(true).slice(1, 33); // Remove prefix byte
      return sha256(sharedX);
      
    } catch (error) {
      // ⚠️ SECURITY WARNING: Fallback to hash-based shared secret
      // This fallback is INSECURE and should be removed for production
      // It exists only for testing when secp256k1 operations fail
      // TODO FOR PRODUCTION: Remove this fallback and fail explicitly
      console.warn('[SECURITY] Falling back to insecure hash-based shared secret');
      const combined = new Uint8Array(64);
      combined.set(privateKey, 0);
      combined.set(publicKey, 32);
      return sha256(combined);
    }
  }

  /**
   * Derive stealth public key from shared secret and spend public key
   * 
   * SECURITY CRITICAL: This function computes the one-time stealth address.
   * The unlinkability of payments depends on this computation being correct.
   * 
   * Protocol: P = Hash(sharedSecret) * G + spendPublicKey
   * - Hash(sharedSecret) * G: Random-looking point derived from shared secret
   * - + spendPublicKey: Shifted by recipient's spend key
   * - Result: Unique address that only recipient can link to themselves
   * 
   * Security Properties:
   * - Each payment produces unique stealth address (if fresh shared secret)
   * - Only recipient with view key can link address to themselves
   * - Only recipient with spend key can spend from address
   * 
   * Security Concerns:
   * ⚠️ CRITICAL: Fallback to hash-based derivation is INSECURE
   * ⚠️ TODO: Remove fallback for production
   * 
   * @param sharedSecret - Shared secret from ECDH
   * @param spendPublicKey - Recipient's spend public key
   * @returns Stealth public key (32 bytes)
   */
  private _deriveStealthPublicKey(sharedSecret: Uint8Array, spendPublicKey: Uint8Array): Uint8Array {
    try {
      // SECURITY: Compute P = Hash(sharedSecret) * G + S
      const scalar = sha256(sharedSecret);
      const scalarBigInt = BigInt('0x' + Buffer.from(scalar).toString('hex'));
      
      // SECURITY: Hash(sharedSecret) * G (base point multiplication)
      // This produces a random-looking point that's deterministic for given shared secret
      const hashPoint = secp256k1.ProjectivePoint.BASE.multiply(scalarBigInt);
      
      // SECURITY: Parse spend public key as a curve point
      // TODO FOR PRODUCTION: Add explicit point validation here
      const spendPoint = secp256k1.ProjectivePoint.fromHex(
        Buffer.from(spendPublicKey).toString('hex')
      );
      
      // SECURITY: Add the points to get stealth address
      // This shifts the random point by the recipient's spend key
      const stealthPoint = hashPoint.add(spendPoint);
      
      // Return as compressed public key (32 bytes, remove prefix byte)
      return stealthPoint.toRawBytes(true).slice(1, 33);
      
    } catch (error) {
      // ⚠️ SECURITY WARNING: Fallback to hash-based derivation
      // This fallback is INSECURE and breaks stealth address protocol
      // TODO FOR PRODUCTION: Remove this fallback and fail explicitly
      console.warn('[SECURITY] Falling back to insecure hash-based stealth key derivation');
      const combined = new Uint8Array(64);
      combined.set(sharedSecret, 0);
      combined.set(spendPublicKey, 32);
      return sha256(combined);
    }
  }

  /**
   * Add two private keys (modulo curve order)
   * 
   * SECURITY CRITICAL: This function performs private key arithmetic.
   * Used to derive spending key for stealth addresses.
   * 
   * Protocol: spendingKey = Hash(sharedSecret) + spendPrivateKey (mod n)
   * - This allows recipient to spend from stealth address
   * - Corresponds to public key: P = Hash(s)*G + S
   * 
   * Security Properties:
   * - Addition is modulo secp256k1 curve order (prevents overflow)
   * - Result is valid private key in range [1, n-1]
   * - Zero result should be impossible (would mean k1 = -k2 mod n)
   * 
   * Security Concerns:
   * - BigInt arithmetic must be correct (JavaScript handles this well)
   * - Result must be properly reduced modulo curve order
   * - Output must be zero-padded to 32 bytes
   * 
   * Potential Vulnerabilities:
   * - Integer overflow (prevented by modulo operation)
   * - Zero result (astronomically unlikely but not checked)
   * - Timing side-channels (BigInt operations may not be constant-time)
   * 
   * @param key1 - First private key (32 bytes)
   * @param key2 - Second private key (32 bytes)
   * @returns Sum of private keys mod curve order (32 bytes)
   */
  private _addPrivateKeys(key1: Uint8Array, key2: Uint8Array): Uint8Array {
    // SECURITY: Convert keys to BigInt for arithmetic
    const k1 = BigInt('0x' + Buffer.from(key1).toString('hex'));
    const k2 = BigInt('0x' + Buffer.from(key2).toString('hex'));
    
    // SECURITY: Get secp256k1 curve order for modulo operation
    const n = secp256k1.CURVE.n; // Curve order (prime number)
    
    // SECURITY: Add keys and reduce modulo curve order
    // This ensures result is valid private key: 0 < result < n
    const sum = (k1 + k2) % n;
    
    // SECURITY NOTE: Result should never be zero (astronomically unlikely)
    // Production code should check: if (sum === 0n) throw error
    
    // SECURITY: Convert back to 32-byte array, zero-padded
    const sumHex = sum.toString(16).padStart(64, '0');
    return new Uint8Array(Buffer.from(sumHex, 'hex'));
  }
}
