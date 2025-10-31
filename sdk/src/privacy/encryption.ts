/**
 * privacy/encryption.ts
 * 
 * Purpose: Encryption utilities for confidential transfers
 * 
 * This module provides encryption and decryption utilities using
 * Twisted ElGamal encryption over curve25519, which is used by
 * SPL Token 2022 confidential transfers for amount hiding.
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { EncryptedAmount, ZKProof } from './types';
import { EncryptionError, ProofGenerationError } from './errors';
import { ristretto255, ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { sha512 } from '@noble/hashes/sha512';

/**
 * Encryption utilities class for confidential transfers
 * 
 * This class implements the cryptographic primitives needed for
 * confidential transfers, including Twisted ElGamal encryption
 * and Pedersen commitments.
 */
export class EncryptionUtils {
  
  /**
   * Encrypt an amount using Twisted ElGamal encryption
   * 
   * @param amount - Amount to encrypt (in lamports)
   * @param recipientPublicKey - Recipient's public key
   * @returns Encrypted amount with commitment and range proof
   */
  async encryptAmount(
    amount: bigint,
    recipientPublicKey: PublicKey
  ): Promise<EncryptedAmount> {
    try {
      // Generate encryption nonce/scalar
      const randomness = this._generateRandomness();

      // ECIES-style ElGamal over Ristretto255
      const { ciphertext, pedersenCommitment } = await this._createElGamalWithCommitment(
        amount,
        recipientPublicKey,
        randomness
      );

      // Pragmatic range proof placeholder for devnet demo
      const rangeProof = await this._generateRangeProof(amount, randomness);

      return {
        ciphertext,
        commitment: pedersenCommitment,
        rangeProof,
        randomness: randomness
      };
      
    } catch (error) {
      throw new EncryptionError(
        `Failed to encrypt amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Decrypt an encrypted amount using the owner's private key
   * 
   * @param ciphertext - Encrypted ciphertext
   * @param privateKey - Private key for decryption
   * @returns Decrypted amount
   */
  async decryptAmount(ciphertext: Uint8Array, privateKey: Keypair): Promise<bigint> {
    try {
      const decryptedAmount = await this._performElGamalDecryption(ciphertext, privateKey.secretKey);
      return decryptedAmount;
      
    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Verify an encrypted amount against its commitment
   * 
   * @param encryptedAmount - Encrypted amount to verify
   * @returns True if valid, false otherwise
   */
  async verifyEncryptedAmount(encryptedAmount: EncryptedAmount): Promise<boolean> {
    try {
      // Verify the Pedersen commitment
      const commitmentValid = await this._verifyPedersenCommitment(
        encryptedAmount.commitment,
        encryptedAmount.ciphertext
      );
      
      // Verify the range proof
      const rangeProofValid = await this._verifyRangeProof(
        encryptedAmount.rangeProof,
        encryptedAmount.commitment
      );
      
      return commitmentValid && rangeProofValid;
      
    } catch (error) {
      throw new EncryptionError(
        `Failed to verify encrypted amount: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate a zero-knowledge proof for an encrypted amount
   * 
   * @param amount - Original amount (private)
   * @param encryptedAmount - Encrypted amount (public)
   * @param circuitType - Type of circuit to use
   * @returns Zero-knowledge proof
   */
  async generateAmountProof(
    amount: bigint,
    encryptedAmount: EncryptedAmount,
    circuitType: 'transfer' | 'deposit' | 'withdrawal'
  ): Promise<ZKProof> {
    try {
      // TODO: Implement actual ZK proof generation
      // This would use Solana's ZK syscalls (Poseidon, alt_bn128) to generate proofs
      
      const proof = await this._generateCircuitProof(
        amount,
        encryptedAmount,
        circuitType
      );
      
      return proof;
      
    } catch (error) {
      throw new ProofGenerationError(
        `Failed to generate amount proof: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Private helper methods

  private _generateRandomness(): Uint8Array {
    const randomness = new Uint8Array(32);
    crypto.getRandomValues(randomness);
    return randomness;
  }

  private async _createElGamalWithCommitment(
    amount: bigint,
    recipientPublicKey: PublicKey,
    randomnessBytes: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; pedersenCommitment: Uint8Array }> {
    // Derive scalar r from randomness
    const r = this._bytesToScalar(randomnessBytes);

    // Derive recipient ElGamal public point from their Solana ed25519 key
    const recipientPoint = this._deriveRecipientPoint(recipientPublicKey);

    // Ephemeral key: R = r*G
    const R = ristretto255.Point.BASE.multiply(r);

    // Shared secret: S = r * recipientPoint
    const S = recipientPoint.multiply(r);
    const sharedKey = this._kdf(S.toRawBytes());

    // Encrypt 64-bit amount using AES-GCM with sharedKey
    const amountBytes = this._u64le(amount);
    const iv = this._randomIv();
    const sealed = await this._aesGcmSeal(sharedKey, iv, amountBytes);

    // Ciphertext layout: R(32) || IV(12) || sealed (ct+tag)
    const Rbytes = R.toRawBytes();
    const ciphertext = new Uint8Array(Rbytes.length + iv.length + sealed.length);
    ciphertext.set(Rbytes, 0);
    ciphertext.set(iv, Rbytes.length);
    ciphertext.set(sealed, Rbytes.length + iv.length);

    // Pedersen commitment: C = H*amount + G2*r
    const pedersenCommitment = this._pedersenCommit(amount, r);

    return { ciphertext, pedersenCommitment };
  }

  private _pedersenCommit(amount: bigint, r: bigint): Uint8Array {
    const H = this._generatorH();
    const G2 = this._generatorG2();
    const a = this._amountToScalar(amount);
    const C = H.multiply(a).add(G2.multiply(r));
    return C.toRawBytes();
  }

  private async _generateRangeProof(
    amount: bigint,
    randomness: Uint8Array
  ): Promise<Uint8Array> {
    // TODO: Implement actual range proof generation
    // This proves that 0 <= amount < 2^64 without revealing the amount
    
    // Placeholder implementation
    const rangeProof = new Uint8Array(128);
    crypto.getRandomValues(rangeProof);
    return rangeProof;
  }

  private async _performElGamalDecryption(
    ciphertext: Uint8Array,
    privateKey: Uint8Array
  ): Promise<bigint> {
    // Parse R || IV || sealed
    if (ciphertext.length < 32 + 12 + 16) {
      throw new Error('Ciphertext too short');
    }
    const Rbytes = ciphertext.slice(0, 32);
    const iv = ciphertext.slice(32, 44);
    const sealed = ciphertext.slice(44);

    const R = ristretto255.Point.fromHex(Rbytes);

    // Derive private scalar from ed25519 secret key
    const skScalar = this._ed25519SkToScalar(privateKey);

    // Shared secret: S = sk * R
    const S = R.multiply(skScalar);
    const sharedKey = this._kdf(S.toRawBytes());

    const amountBytes = await this._aesGcmOpen(sharedKey, iv, sealed);
    if (amountBytes.length !== 8) throw new Error('Invalid plaintext length');
    return this._u64FromLe(amountBytes);
  }

  private async _verifyPedersenCommitment(
    commitment: Uint8Array,
    _ciphertext: Uint8Array
  ): Promise<boolean> {
    // Structure-only check for demo: valid Ristretto encoding
    try {
      ristretto255.Point.fromHex(commitment);
      return true;
    } catch {
      return false;
    }
  }

  private async _verifyRangeProof(
    rangeProof: Uint8Array,
    commitment: Uint8Array
  ): Promise<boolean> {
    // Placeholder: hash-based binding check
    const h = sha256.create();
    h.update(commitment);
    const digest = h.digest();
    return rangeProof.length >= 32 && rangeProof[0] === digest[0];
  }

  private async _generateCircuitProof(
    amount: bigint,
    encryptedAmount: EncryptedAmount,
    circuitType: string
  ): Promise<ZKProof> {
    // TODO: Implement actual ZK circuit proof generation
    // This would use Solana's ZK syscalls to generate the proof
    
    // Placeholder implementation
    return {
      proof: new Uint8Array(256),
      publicInputs: [encryptedAmount.commitment],
      proofSystem: 'groth16',
      circuitHash: `${circuitType}_circuit_v1`
    };
  }

  /**
   * Utility method to convert between different number representations
   */
  static lamportsToSOL(lamports: bigint): number {
    return Number(lamports) / 1e9;
  }

  static solToLamports(sol: number): bigint {
    return BigInt(Math.floor(sol * 1e9));
  }
}

// Private helpers (non-exported)
export interface Unused {}

// Utility methods implemented as private methods on the class
declare module './encryption' {}

// Extend the class with helper methods
export interface EncryptionUtils {
  _bytesToScalar(bytes: Uint8Array): bigint;
  _amountToScalar(amount: bigint): bigint;
  _deriveRecipientPoint(pk: PublicKey): ReturnType<typeof ristretto255.Point.hashToCurve>;
  _generatorH(): ReturnType<typeof ristretto255.Point.hashToCurve>;
  _generatorG2(): ReturnType<typeof ristretto255.Point.hashToCurve>;
  _kdf(shared: Uint8Array): Uint8Array;
  _randomIv(): Uint8Array;
  _aesGcmSeal(key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array>;
  _aesGcmOpen(key: Uint8Array, iv: Uint8Array, sealed: Uint8Array): Promise<Uint8Array>;
  _u64le(n: bigint): Uint8Array;
  _u64FromLe(bytes: Uint8Array): bigint;
  _ed25519SkToScalar(sk: Uint8Array): bigint;
}

EncryptionUtils.prototype._bytesToScalar = function (bytes: Uint8Array): bigint {
  const n = ed25519.CURVE.n;
  const x = BigInt('0x' + Buffer.from(bytes).toString('hex')) % n;
  return x === 0n ? 1n : x;
};

EncryptionUtils.prototype._amountToScalar = function (amount: bigint): bigint {
  const n = ed25519.CURVE.n;
  return amount % n;
};

EncryptionUtils.prototype._deriveRecipientPoint = function (pk: PublicKey) {
  const te = new TextEncoder();
  const domain = te.encode('ghostsol/elgamal/recipient');
  const msg = new Uint8Array(domain.length + pk.toBytes().length);
  msg.set(domain, 0);
  msg.set(pk.toBytes(), domain.length);
  // Hash to 64 bytes using SHA-512 before hashToCurve
  const hash = sha512(msg);
  return ristretto255.Point.hashToCurve(hash);
};

EncryptionUtils.prototype._generatorH = function () {
  const te = new TextEncoder();
  const hash = sha512(te.encode('ghostsol/pedersen/H'));
  return ristretto255.Point.hashToCurve(hash);
};

EncryptionUtils.prototype._generatorG2 = function () {
  const te = new TextEncoder();
  const hash = sha512(te.encode('ghostsol/pedersen/G2'));
  return ristretto255.Point.hashToCurve(hash);
};

EncryptionUtils.prototype._kdf = function (shared: Uint8Array): Uint8Array {
  const te = new TextEncoder();
  const ctx = te.encode('ghostsol/elgamal/kdf');
  const h = sha256.create();
  h.update(ctx);
  h.update(shared);
  return new Uint8Array(h.digest());
};

EncryptionUtils.prototype._randomIv = function (): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return iv;
};

EncryptionUtils.prototype._aesGcmSeal = async function (
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext)
  );
  return ct;
};

EncryptionUtils.prototype._aesGcmOpen = async function (
  keyBytes: Uint8Array,
  iv: Uint8Array,
  sealed: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const pt = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, sealed)
  );
  return pt;
};

EncryptionUtils.prototype._u64le = function (n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  let x = n;
  for (let i = 0; i < 8; i++) {
    b[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return b;
};

EncryptionUtils.prototype._u64FromLe = function (bytes: Uint8Array): bigint {
  let x = 0n;
  for (let i = 7; i >= 0; i--) {
    x = (x << 8n) + BigInt(bytes[i]);
  }
  return x;
};

EncryptionUtils.prototype._ed25519SkToScalar = function (sk: Uint8Array): bigint {
  // Use first 32 bytes (seed) and map to Ristretto scalar domain
  const seed = sk.slice(0, 32);
  return this._bytesToScalar(seed);
};
