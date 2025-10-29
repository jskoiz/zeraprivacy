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

Notes:
- Proof generation methods are stubs and will throw `ProofGenerationError` until implemented.

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

## Notes and limitations
- Devnet airdrop is rate-limited and times out after 30 seconds in SDK helper.
- Privacy mode proof generation is not yet implemented and will throw `ProofGenerationError`.
- Standard public RPC endpoints do not support ZK Compression specifics; use Light Protocol-compatible RPC when needed.
