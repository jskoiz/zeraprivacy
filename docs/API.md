# GhostSol SDK API Documentation

Complete API reference for the GhostSol SDK - a privacy-focused SDK for SOL developers using ZK Compression technology.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core API](#core-api)
- [React Integration](#react-integration)
- [Types](#types)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Installation

```bash
npm install ghost-sol
```

## Quick Start

### Node.js Usage

```typescript
import { GhostSol } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Initialize SDK
const ghostSol = new GhostSol();
await ghostSol.init({
  wallet: Keypair.generate(),
  cluster: 'devnet'
});

// Use SDK methods
const address = ghostSol.getAddress();
const balance = await ghostSol.getBalance();
const signature = await ghostSol.compress(0.1); // 0.1 SOL
```

### React Usage

```tsx
import { GhostSolProvider, useGhostSol } from 'ghost-sol/react';

function App() {
  return (
    <GhostSolProvider wallet={wallet} cluster="devnet">
      <MyComponent />
    </GhostSolProvider>
  );
}

function MyComponent() {
  const { address, balance, compress, transfer, decompress } = useGhostSol();
  
  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance}</p>
      <button onClick={() => compress(0.1)}>Compress 0.1 SOL</button>
    </div>
  );
}
```

## Core API

### GhostSol Class

The main SDK class providing privacy-focused Solana operations.

#### Constructor

```typescript
const ghostSol = new GhostSol();
```

#### Methods

##### `init(config: GhostSolConfig): Promise<void>`

Initialize the GhostSol SDK with configuration options.

**Parameters:**
- `config.wallet` - Wallet instance (Keypair or wallet adapter)
- `config.cluster` - Solana cluster ('devnet' | 'mainnet-beta')
- `config.rpcUrl` - Custom RPC endpoint URL (optional)
- `config.commitment` - Transaction commitment level (optional)

**Example:**
```typescript
await ghostSol.init({
  wallet: keypair,
  cluster: 'devnet',
  commitment: 'confirmed'
});
```

**Throws:** `GhostSolError` if initialization fails

##### `getAddress(): string`

Get the user's public key as a base58 string.

**Returns:** Base58 encoded public key string

**Example:**
```typescript
const address = ghostSol.getAddress();
console.log('Address:', address);
```

##### `getBalance(): Promise<number>`

Get the compressed token balance in lamports.

**Returns:** Balance in lamports

**Example:**
```typescript
const balance = await ghostSol.getBalance();
console.log('Balance:', balance / 1e9, 'SOL');
```

##### `compress(amount: number): Promise<string>`

Compress SOL from regular account to compressed token account (shield operation).

**Parameters:**
- `amount` - Amount to compress in lamports

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await ghostSol.compress(0.1 * 1e9); // 0.1 SOL
console.log('Compress signature:', signature);
```

**Throws:** `CompressionError` if compression fails

##### `transfer(to: string, amount: number): Promise<string>`

Transfer compressed tokens to another address privately.

**Parameters:**
- `to` - Recipient's public key as base58 string
- `amount` - Amount to transfer in lamports

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await ghostSol.transfer(
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  0.05 * 1e9 // 0.05 SOL
);
console.log('Transfer signature:', signature);
```

**Throws:** `TransferError` if transfer fails

##### `decompress(amount: number, to?: string): Promise<string>`

Decompress SOL from compressed account back to regular account (unshield operation).

**Parameters:**
- `amount` - Amount to decompress in lamports
- `to` - Optional destination address (defaults to user's address)

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await ghostSol.decompress(0.05 * 1e9); // 0.05 SOL
console.log('Decompress signature:', signature);
```

**Throws:** `DecompressionError` if decompression fails

##### `fundDevnet(amount?: number): Promise<string>`

Request devnet airdrop for testing purposes.

**Parameters:**
- `amount` - Amount to request in SOL (default: 2 SOL)

**Returns:** Transaction signature

**Example:**
```typescript
const signature = await ghostSol.fundDevnet(1); // 1 SOL
console.log('Airdrop signature:', signature);
```

**Throws:** `RpcError` if airdrop fails

## React Integration

### GhostSolProvider

React context provider for managing SDK state.

**Props:**
- `wallet` - Wallet adapter from @solana/wallet-adapter-react
- `cluster` - Solana cluster ('devnet' | 'mainnet-beta')
- `children` - React children

**Example:**
```tsx
<GhostSolProvider wallet={wallet} cluster="devnet">
  <App />
</GhostSolProvider>
```

### useGhostSol Hook

Hook to access GhostSol context.

**Returns:**
- `address` - User's address (string | null)
- `balance` - Compressed balance (number | null)
- `loading` - Initialization status (boolean)
- `error` - Error message (string | null)
- `compress(amount: number)` - Compress function
- `transfer(to: string, amount: number)` - Transfer function
- `decompress(amount: number, to?: string)` - Decompress function
- `fundDevnet(amount?: number)` - Airdrop function
- `refresh()` - Refresh balance and address

**Example:**
```tsx
function MyComponent() {
  const { 
    address, 
    balance, 
    compress, 
    transfer, 
    decompress,
    loading, 
    error,
    refresh 
  } = useGhostSol();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance ? balance / 1e9 : 0} SOL</p>
      <button onClick={() => compress(0.1 * 1e9)}>Compress 0.1 SOL</button>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

## Types

### GhostSolConfig

Configuration options for initializing the GhostSol SDK.

```typescript
interface GhostSolConfig {
  wallet?: WalletAdapter;
  rpcUrl?: string;
  cluster?: 'devnet' | 'mainnet-beta';
  commitment?: 'processed' | 'confirmed' | 'finalized';
}
```

### WalletAdapter

Unified wallet interface supporting different wallet types.

```typescript
interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction<T>(tx: T): Promise<T>;
  signAllTransactions<T>(txs: T[]): Promise<T[]>;
  signMessage?(message: Uint8Array): Promise<Uint8Array>;
}
```

### TransferResult

Result of a transfer operation containing transaction metadata.

```typescript
interface TransferResult {
  signature: string;
  blockHeight?: number;
  status: 'confirmed' | 'finalized' | 'failed';
  error?: string;
}
```

### CompressedBalance

Balance information for compressed token accounts.

```typescript
interface CompressedBalance {
  lamports: number;
  sol: number;
  exists: boolean;
  lastUpdated?: number;
}
```

## Error Handling

The SDK provides comprehensive error handling with custom error types:

### Error Types

- **`GhostSolError`** - Base error class for all SDK errors
- **`CompressionError`** - Errors during compression operations
- **`TransferError`** - Errors during transfer operations
- **`DecompressionError`** - Errors during decompression operations
- **`ValidationError`** - Input validation errors
- **`RpcError`** - RPC communication errors

### Error Handling Example

```typescript
try {
  const signature = await ghostSol.compress(0.1 * 1e9);
  console.log('Success:', signature);
} catch (error) {
  if (error instanceof CompressionError) {
    console.error('Compression failed:', error.message);
  } else if (error instanceof RpcError) {
    console.error('RPC error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Examples

### Complete Workflow Example

```typescript
import { GhostSol } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

async function completeWorkflow() {
  // Initialize SDK
  const ghostSol = new GhostSol();
  await ghostSol.init({
    wallet: Keypair.generate(),
    cluster: 'devnet'
  });

  // Get account info
  const address = ghostSol.getAddress();
  console.log('Address:', address);

  // Check balance
  const balance = await ghostSol.getBalance();
  console.log('Balance:', balance / 1e9, 'SOL');

  // Fund account (devnet only)
  try {
    const airdropSignature = await ghostSol.fundDevnet(2);
    console.log('Airdrop signature:', airdropSignature);
  } catch (error) {
    console.log('Airdrop failed (rate limited):', error.message);
  }

  // Compress SOL
  try {
    const compressSignature = await ghostSol.compress(0.1 * 1e9);
    console.log('Compress signature:', compressSignature);
  } catch (error) {
    console.log('Compression failed:', error.message);
  }

  // Transfer compressed SOL
  const recipient = Keypair.generate().publicKey.toBase58();
  try {
    const transferSignature = await ghostSol.transfer(recipient, 0.05 * 1e9);
    console.log('Transfer signature:', transferSignature);
  } catch (error) {
    console.log('Transfer failed:', error.message);
  }

  // Decompress SOL
  try {
    const decompressSignature = await ghostSol.decompress(0.05 * 1e9);
    console.log('Decompress signature:', decompressSignature);
  } catch (error) {
    console.log('Decompression failed:', error.message);
  }
}

completeWorkflow().catch(console.error);
```

### React Component Example

```tsx
import React, { useState } from 'react';
import { useGhostSol } from 'ghost-sol/react';

function PrivateTransferForm() {
  const { address, balance, compress, transfer, decompress, loading, error } = useGhostSol();
  const [amount, setAmount] = useState('0.01');
  const [recipient, setRecipient] = useState('');

  const handleCompress = async () => {
    try {
      const signature = await compress(parseFloat(amount) * 1e9);
      console.log('Compress signature:', signature);
    } catch (error) {
      console.error('Compression failed:', error);
    }
  };

  const handleTransfer = async () => {
    try {
      const signature = await transfer(recipient, parseFloat(amount) * 1e9);
      console.log('Transfer signature:', signature);
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  const handleDecompress = async () => {
    try {
      const signature = await decompress(parseFloat(amount) * 1e9);
      console.log('Decompress signature:', signature);
    } catch (error) {
      console.error('Decompression failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Private SOL Operations</h2>
      <p>Address: {address}</p>
      <p>Balance: {balance ? (balance / 1e9).toFixed(4) : '0.0000'} SOL</p>
      
      <div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (SOL)"
          step="0.001"
          min="0.001"
        />
      </div>

      <div>
        <button onClick={handleCompress}>Compress SOL</button>
      </div>

      <div>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient Address"
        />
        <button onClick={handleTransfer}>Transfer Compressed SOL</button>
      </div>

      <div>
        <button onClick={handleDecompress}>Decompress SOL</button>
      </div>
    </div>
  );
}

export default PrivateTransferForm;
```

## Known Limitations

- **RPC Endpoint**: Standard Solana devnet RPC does not support ZK Compression methods
- **Light Protocol RPC**: Requires dedicated Light Protocol RPC endpoint for full functionality
- **Devnet Testing**: Airdrop rate limiting may affect testing on devnet

## Support

For questions and support, please open an issue on the GitHub repository.
