# GhostSol SDK – Comprehensive API Reference

Complete documentation for all public APIs, functions, and React components in the GhostSol SDK. The SDK supports two modes:

- Efficiency mode: Uses ZK Compression for lower fees (public but cheap)
- Privacy mode: Uses SPL Token 2022 Confidential Transfers for true transaction privacy

## Table of Contents

- Installation
- Quick Start
  - Efficiency mode
  - Privacy mode
- Top-level SDK (index) APIs
  - Initialization and mode
  - Account and balances
  - Unified operations: deposit, transfer, withdraw
  - Privacy-only helpers
  - Backward compatible helpers
  - Utilities
  - Types and errors
- Core class (efficiency mode)
  - GhostSol
- Privacy class (privacy mode)
  - GhostSolPrivacy
- React integration
  - GhostSolProvider
  - useGhostSol
- Types
- Error classes
- Examples
  - Node: efficiency mode workflow
  - Node: privacy mode workflow
  - React: basic usage
  - React: private transfer form

---

## Installation

```bash
npm install ghost-sol
```

---

## Quick Start

### Efficiency mode (default)
```typescript
import { init, getAddress, getBalance, deposit, transfer, withdraw } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

await init({ wallet: Keypair.generate(), cluster: 'devnet' });

console.log('Address:', getAddress());
console.log('Compressed balance (lamports):', await getBalance());

await deposit(0.1);            // 0.1 SOL -> compressed (shield)
await transfer(recipient, 0.05); // private-ish (compressed) transfer
await withdraw(0.05);          // decompress (unshield)
```

### Privacy mode
```typescript
import { init, getAddress, getBalance, deposit, transfer, withdraw, decryptBalance, generateViewingKey } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

await init({
  wallet: Keypair.generate(),
  cluster: 'devnet',
  privacy: { mode: 'privacy', enableViewingKeys: true },
});

console.log('Address:', getAddress());
const enc = await getBalance(); // encrypted balance structure
const amount = await decryptBalance();
console.log('Decrypted balance (SOL):', amount);

await deposit(0.1);                  // encrypted deposit
await transfer(recipient, 0.05);     // private transfer (encrypted)
await withdraw(0.05);                // encrypted withdrawal

const vk = await generateViewingKey(); // share with auditor
```

---

## Top-level SDK (index) APIs
The package entry `sdk/src/index.ts` exposes the unified API and types.

### Initialization and mode
- `init(config: GhostSolConfig): Promise<void>`: Initialize once. Selects mode based on `config.privacy?.mode`.
- `isInitialized(): boolean`: Whether initialized.
- `getCurrentMode(): 'privacy' | 'efficiency'`: Current mode.
- `getSdkInstance(): GhostSol | GhostSolPrivacy`: Advanced access to underlying instance.

Config: `GhostSolConfig` (see Types)

### Account and balances
- `getAddress(): string`: Base58 wallet address.
- `getBalance(): Promise<CompressedBalance | EncryptedBalance>`
  - Efficiency: returns compressed balance info
  - Privacy: returns encrypted balance object

### Unified operations
- `deposit(amount: number): Promise<string>`
  - Efficiency: compress SOL; `amount` in SOL
  - Privacy: encrypted deposit; `amount` in SOL
- `transfer(recipientAddress: string, amount: number): Promise<TransferResult | PrivateTransferResult>`
  - Efficiency: compressed transfer (returns signature string or transfer-like result)
  - Privacy: private transfer with encrypted amount and ZK proof
- `withdraw(amount: number, destination?: PublicKey): Promise<string>`
  - Efficiency: decompress; `amount` in SOL
  - Privacy: encrypted withdrawal to `destination` (defaults user)

### Privacy-only helpers
- `decryptBalance(viewingKey?: ViewingKey): Promise<number>`: Decrypts encrypted balance, returns SOL.
- `generateViewingKey(): Promise<ViewingKey>`: Create viewing key for compliance/auditors.
- `createConfidentialAccount(mint?: PublicKey): Promise<PublicKey>`: Ensure confidential account exists.

### Backward compatible helpers
- `compress(amount: number): Promise<string>`: Deprecated alias of `deposit` (efficiency path).
- `decompress(amount: number): Promise<string>`: Deprecated alias of `withdraw` (efficiency path).

### Utilities (efficiency mode only)
- `fundDevnet(lamports?: number): Promise<string>`: Request devnet airdrop. Not available in privacy mode.
- `getDetailedBalance(): Promise<CompressedBalance>`: Detailed compressed balance info.

### Types and errors re-exported
- Types from `core/types`: `GhostSolConfig`, `WalletAdapter`, `ExtendedWalletAdapter`, `TransferResult`, `CompressedBalance`, `PrivacySdkConfig`
- Types from `privacy/types`: `PrivacyConfig`, `EncryptedBalance`, `EncryptedAmount`, `ViewingKey`, `PrivateTransferResult`
- Errors: `GhostSolError`, `ValidationError`, `CompressionError`, `TransferError`, `DecompressionError`, `PrivacyError`, `EncryptionError`, `ProofGenerationError`, `ViewingKeyError`

---

## Core class (efficiency mode)

### GhostSol
Main class backing efficiency mode (ZK Compression). Constructed internally by `init`.

Key methods:
- `init(config: GhostSolConfig): Promise<void>`
- `getAddress(): string`
- `getBalance(): Promise<number>`: lamports
- `compress(lamports: number): Promise<string>`
- `transfer(recipientAddress: string, lamports: number): Promise<string>`
- `decompress(lamports: number, destination?: string): Promise<string>`
- `fundDevnet(lamports = 2 * LAMPORTS_PER_SOL): Promise<string>`
- `refreshBalance(): Promise<void>`
- `getDetailedBalance(): Promise<CompressedBalance>`
- `isInitialized(): boolean`

Notes:
- Public API expects lamports for `compress/transfer/decompress` on the class, but top-level `deposit/transfer/withdraw` accept SOL in efficiency mode. Use the entrypoint functions for convenience.

---

## Privacy class (privacy mode)

### GhostSolPrivacy
Main class backing privacy mode. Constructed internally by `init`.

Key methods:
- `init(connection, wallet, config: PrivacyConfig): Promise<void>`
- `createConfidentialMint(): Promise<PublicKey>`
- `createConfidentialAccount(mint?: PublicKey): Promise<PublicKey>`
- `encryptedDeposit(amount: number): Promise<string>`
- `privateTransfer(recipientAddress: string, amount: number): Promise<PrivateTransferResult>`
- `encryptedWithdraw(amount: number, destination?: PublicKey): Promise<string>`
- `getEncryptedBalance(): Promise<EncryptedBalance>`
- `decryptBalance(viewingKey?: ViewingKey): Promise<number>`
- `generateViewingKey(): Promise<ViewingKey>`

### Detailed Privacy APIs

#### `encryptedDeposit(amount: number): Promise<string>`
Performs an encrypted deposit into your confidential account.

**Process:**
1. Encrypts the amount using ElGamal encryption
2. Generates a zero-knowledge proof of deposit validity
3. Stores encrypted balance on-chain
4. Returns transaction signature

**Parameters:**
- `amount` - Amount to deposit in SOL

**Returns:** Transaction signature

**Performance:** ~5-8 seconds

**Throws:**
- `PrivacyError` - If deposit fails
- `ProofGenerationError` - If ZK proof generation fails
- `EncryptionError` - If encryption fails

**Example:**
```typescript
const signature = await privacy.encryptedDeposit(2);
console.log('Deposited 2 SOL (encrypted):', signature);
```

#### `privateTransfer(recipientAddress: string, amount: number): Promise<PrivateTransferResult>`
Performs a private transfer with encrypted amount.

**Process:**
1. Encrypts transfer amount for recipient
2. Generates zero-knowledge proof of validity
3. Creates confidential transfer instruction
4. Submits transaction

**Parameters:**
- `recipientAddress` - Recipient's public key (base58)
- `amount` - Amount to transfer in SOL

**Returns:** PrivateTransferResult containing:
- `signature` - Transaction signature
- `encryptedAmount` - Encrypted amount structure
- `zkProof` - Zero-knowledge proof

**Performance:** ~5-10 seconds

**Throws:**
- `PrivacyError` - If transfer fails
- `ProofGenerationError` - If ZK proof generation fails

**Example:**
```typescript
const result = await privacy.privateTransfer(recipient, 0.7);
console.log('Transfer signature:', result.signature);
console.log('ZK Proof system:', result.zkProof.proofSystem);
```

#### `getEncryptedBalance(): Promise<EncryptedBalance>`
Retrieves the encrypted balance from on-chain.

**Returns:** EncryptedBalance containing:
- `ciphertext` - Encrypted balance data
- `commitment` - Pedersen commitment
- `lastUpdated` - Last update timestamp
- `exists` - Whether account exists

**Performance:** <1 second

**Example:**
```typescript
const encrypted = await privacy.getEncryptedBalance();
console.log('Balance exists:', encrypted.exists);
console.log('Ciphertext length:', encrypted.ciphertext.length);
```

#### `decryptBalance(viewingKey?: ViewingKey): Promise<number>`
Decrypts the encrypted balance.

**Parameters:**
- `viewingKey` - Optional viewing key for auditing

**Returns:** Decrypted balance in SOL

**Performance:** <500ms

**Security:**
- Without viewing key: Uses your private key (full access)
- With viewing key: Uses viewing key permissions (auditing)

**Throws:**
- `EncryptionError` - If decryption fails
- `ComplianceError` - If viewing key lacks permissions

**Example:**
```typescript
// Decrypt with your key
const balance = await privacy.decryptBalance();
console.log('Your balance:', balance, 'SOL');

// Decrypt with viewing key (auditor)
const auditedBalance = await privacy.decryptBalance(viewingKey);
console.log('Audited balance:', auditedBalance, 'SOL');
```

#### `generateViewingKey(): Promise<ViewingKey>`
Generates a viewing key for compliance and auditing.

**Returns:** ViewingKey containing:
- `publicKey` - Public key component
- `encryptedPrivateKey` - Encrypted private key
- `permissions` - Access permissions
- `expiresAt` - Optional expiration timestamp

**Permissions:**
```typescript
interface ViewingKeyPermissions {
  canViewBalances: boolean;
  canViewAmounts: boolean;
  canViewMetadata: boolean;
  allowedAccounts?: PublicKey[];
}
```

**Performance:** ~1-2 seconds

**Example:**
```typescript
const viewingKey = await privacy.generateViewingKey();
console.log('Viewing key:', viewingKey.publicKey.toBase58());
console.log('Permissions:', viewingKey.permissions);

// Share with auditor (encrypted)
await shareViewingKey(viewingKey, auditorPublicKey);
```

### Privacy Configuration

#### PrivacyConfig
```typescript
interface PrivacyConfig {
  mode: 'privacy' | 'efficiency';
  enableViewingKeys?: boolean;
  auditMode?: boolean;
  circuitParams?: ZKCircuitParams;
}
```

#### ZKCircuitParams
```typescript
interface ZKCircuitParams {
  maxAmount?: bigint;           // Max transfer amount
  anonymitySetSize?: number;    // Anonymity set size
  proofTimeout?: number;        // Proof generation timeout (ms)
}
```

**Example:**
```typescript
const config: PrivacyConfig = {
  mode: 'privacy',
  enableViewingKeys: true,
  auditMode: true,
  circuitParams: {
    maxAmount: BigInt(1000 * LAMPORTS_PER_SOL),
    anonymitySetSize: 128,
    proofTimeout: 30000 // 30 seconds
  }
};
```

Notes:
- Proof generation methods are stubs and will throw `ProofGenerationError` until implemented.
- Full SPL Token 2022 integration is in progress.

---

## React integration

### GhostSolProvider
React context provider for SDK state and actions.

Props:
- `wallet?: WalletAdapter`
- `cluster?: 'devnet' | 'mainnet-beta'` (default: `devnet`)
- `children: ReactNode`

Usage:
```tsx
import { GhostSolProvider } from 'ghost-sol/react';

<GhostSolProvider wallet={wallet} cluster="devnet">
  <App />
</GhostSolProvider>
```

### useGhostSol
Hook to access state and actions from context.

Returns:
- `address: string | null`
- `balance: number | null` (lamports in efficiency mode)
- `loading: boolean`
- `error: string | null`
- `compress(amount: number): Promise<string>`
- `transfer(to: string, amount: number): Promise<string>`
- `decompress(amount: number, to?: string): Promise<string>`
- `fundDevnet(amount?: number): Promise<string>`
- `refresh(): Promise<void>`

Example:
```tsx
import { useGhostSol } from 'ghost-sol/react';

function WalletPanel() {
  const { address, balance, compress, decompress, transfer, refresh, loading, error } = useGhostSol();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <div>Address: {address}</div>
      <div>Compressed: {balance ? (balance / 1e9).toFixed(4) : '0.0000'} SOL</div>
      <button onClick={() => compress(0.1 * 1e9)}>Compress 0.1 SOL</button>
      <button onClick={() => decompress(0.05 * 1e9)}>Decompress 0.05 SOL</button>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

---

## Types

### GhostSolConfig
```typescript
interface GhostSolConfig {
  wallet?: WalletAdapter;
  rpcUrl?: string;
  cluster?: 'devnet' | 'mainnet-beta';
  commitment?: 'processed' | 'confirmed' | 'finalized';
  privacy?: PrivacyConfig; // selects privacy mode when privacy.mode === 'privacy'
}
```

### PrivacyConfig (subset)
```typescript
interface PrivacyConfig {
  mode: 'privacy' | 'efficiency';
  enableViewingKeys?: boolean;
}
```

### WalletAdapter (core)
```typescript
interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction<T>(tx: T): Promise<T>;
  signAllTransactions<T>(txs: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}
```

### TransferResult (efficiency)
```typescript
interface TransferResult {
  signature: string;
  blockHeight?: number;
  status: 'confirmed' | 'finalized' | 'failed';
  error?: string;
}
```

### PrivateTransferResult (privacy)
```typescript
interface PrivateTransferResult {
  signature: string;
  encryptedAmount: EncryptedAmount;
  zkProof: ZKProof;
}
```

### CompressedBalance (efficiency)
```typescript
interface CompressedBalance {
  lamports: number;
  sol: number;
  exists: boolean;
  lastUpdated?: number;
}
```

### EncryptedBalance (privacy)
```typescript
interface EncryptedBalance {
  ciphertext: Uint8Array;
  commitment: Uint8Array;
  lastUpdated: number;
  exists: boolean;
}
```

---

## Error classes
- `GhostSolError` (base)
- `ValidationError`
- `CompressionError`
- `TransferError`
- `DecompressionError`
- `PrivacyError`
- `EncryptionError`
- `ProofGenerationError`
- `ViewingKeyError`

Example handling:
```typescript
try {
  await deposit(0.1);
} catch (e) {
  if (e instanceof ValidationError) { /* invalid input */ }
  else if (e instanceof CompressionError) { /* efficiency op failed */ }
  else if (e instanceof PrivacyError) { /* privacy op failed */ }
}
```

---

## Examples

### Node: efficiency mode workflow
```typescript
import { init, getAddress, getBalance, deposit, transfer, withdraw, fundDevnet } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

await init({ wallet: Keypair.generate(), cluster: 'devnet' });

console.log('Address:', getAddress());
console.log('Compressed balance:', await getBalance());

try { await fundDevnet(); } catch {}

await deposit(0.1);
await transfer(Keypair.generate().publicKey.toBase58(), 0.05);
await withdraw(0.05);
```

### Node: privacy mode workflow
```typescript
import { init, getAddress, getBalance, deposit, transfer, withdraw, decryptBalance, generateViewingKey } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

await init({ wallet: Keypair.generate(), cluster: 'devnet', privacy: { mode: 'privacy', enableViewingKeys: true } });

console.log('Address:', getAddress());
const enc = await getBalance();
console.log('Encrypted:', enc);
console.log('Decrypted SOL:', await decryptBalance());

await deposit(0.1);
await transfer(Keypair.generate().publicKey.toBase58(), 0.05);
await withdraw(0.05);

const vk = await generateViewingKey();
console.log('Viewing Key:', vk);
```

### React: basic usage
```tsx
import { GhostSolProvider, useGhostSol } from 'ghost-sol/react';

function App() {
  return (
    <GhostSolProvider wallet={wallet} cluster="devnet">
      <Dashboard />
    </GhostSolProvider>
  );
}

function Dashboard() {
  const { address, balance, compress, transfer, decompress, refresh, loading, error } = useGhostSol();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <div>{address}</div>
      <div>{balance ? balance / 1e9 : 0} SOL</div>
      <button onClick={() => compress(0.1 * 1e9)}>Compress</button>
      <button onClick={() => decompress(0.05 * 1e9)}>Decompress</button>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### React: private transfer form
```tsx
import React, { useState } from 'react';
import { useGhostSol } from 'ghost-sol/react';

function PrivateTransferForm() {
  const { address, balance, compress, transfer, decompress, loading, error } = useGhostSol();
  const [amount, setAmount] = useState('0.01');
  const [recipient, setRecipient] = useState('');

  const toLamports = (sol: string) => parseFloat(sol) * 1e9;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance ? (balance / 1e9).toFixed(4) : '0.0000'} SOL</p>

      <div>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.001" />
        <button onClick={() => compress(toLamports(amount))}>Compress</button>
      </div>

      <div>
        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient Address" />
        <button onClick={() => transfer(recipient, toLamports(amount))}>Private Transfer</button>
      </div>

      <div>
        <button onClick={() => decompress(toLamports(amount))}>Decompress</button>
      </div>
    </div>
  );
}

export default PrivateTransferForm;
```

---

## Privacy Mode Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| Proof Generation | <5 seconds | CRITICAL for UX |
| Deposit | <10 seconds | End-to-end including proof |
| Transfer | <10 seconds | End-to-end including proof |
| Withdrawal | <10 seconds | End-to-end including proof |
| Balance Decryption | <1 second | Must be fast for good UX |

## Privacy Mode Security Properties

### Encryption
- **ElGamal encryption** for homomorphic operations
- **Pedersen commitments** for balance hiding
- **Range proofs** to prevent negative amounts
- **AES-GCM** for viewing key encryption

### Zero-Knowledge Proofs
- **Groth16** proof system (default)
- **Poseidon** hash function for circuits
- **alt_bn128** curve for verification
- Proof size: ~128 bytes

### Compliance Features
- **Viewing keys** with granular permissions
- **Key expiration** support
- **Audit logs** in audit mode
- **Key revocation** capabilities

## Privacy Mode Error Handling

### Error Types

```typescript
// Privacy-specific errors
class PrivacyError extends Error {
  constructor(message: string, cause?: Error);
}

class EncryptionError extends PrivacyError {}
class ProofGenerationError extends PrivacyError {}
class ProofVerificationError extends PrivacyError {}
class ViewingKeyError extends PrivacyError {}
class ComplianceError extends PrivacyError {}
```

### Error Handling Example

```typescript
try {
  await privacy.privateTransfer(recipient, amount);
} catch (error) {
  if (error instanceof ProofGenerationError) {
    console.error('Proof generation failed:', error.message);
    // Retry with longer timeout
  } else if (error instanceof EncryptionError) {
    console.error('Encryption failed:', error.message);
    // Check encryption keys
  } else if (error instanceof ComplianceError) {
    console.error('Compliance check failed:', error.message);
    // Check viewing key permissions
  }
}
```

---

## Notes and limitations
- Devnet airdrop is rate-limited and times out after 30 seconds in SDK helper.
- Privacy mode proof generation is currently in prototype and will throw `ProofGenerationError` until full implementation.
- Standard public RPC endpoints do not support ZK Compression specifics; use Light Protocol-compatible RPC when needed.
- Privacy mode requires SPL Token 2022 support - full integration in progress.
- Viewing key encryption uses ristretto255 curve points for secure key derivation.
