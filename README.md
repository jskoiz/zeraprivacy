# Ghost Sol SDK

A privacy-focused SDK for Solana with dual modes: **Efficiency** (ZK Compression) and **Privacy** (Confidential Transfers).

## Overview

Ghost Sol SDK provides two distinct operating modes to suit different use cases:

- **Efficiency Mode** (default): Uses ZK Compression for 5000x cost reduction with public transactions
- **Privacy Mode**: Uses SPL Token 2022 Confidential Transfers for true transaction privacy with encrypted amounts

Choose the mode that best fits your needs—or use both!

## Features

- **Dual Mode Operation**: Switch between efficiency and privacy modes
- **Simple API**: 3-line interface that works across both modes
- **True Privacy**: Encrypted balances and transaction amounts (privacy mode)
- **Cost Optimization**: 5000x cheaper transactions (efficiency mode)
- **Wallet Flexibility**: Support for both Node.js Keypair and browser wallet adapters
- **React Integration**: Built-in React hooks and context providers
- **TypeScript Support**: Full type definitions and IntelliSense support
- **Modular Design**: Well-organized codebase with clear separation of concerns
- **Viewing Keys**: Compliance-ready with optional viewing keys (privacy mode)

## Mode Comparison

| Feature | Efficiency Mode | Privacy Mode |
|---------|----------------|--------------|
| **Privacy** | ❌ Public (amounts visible) | ✅ Encrypted (amounts hidden) |
| **Cost** | 🔥 5000x cheaper | Standard Solana fees |
| **Speed** | ⚡ ~1-2 seconds | ~5-10 seconds |
| **Use Case** | Gaming, DeFi, High-frequency | Payroll, Donations, OTC |
| **Technology** | ZK Compression | SPL Token 2022 + ZK Proofs |
| **Compliance** | Basic | ✅ Viewing keys |

## Installation

```bash
npm install ghost-sol
```

## Quick Start

### Efficiency Mode (Default - Cost Optimization)

```typescript
import { init, deposit, transfer, withdraw, getBalance } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Initialize SDK (defaults to efficiency mode)
await init({
  wallet: Keypair.generate(),
  cluster: 'devnet'
});

// Operations (5000x cheaper!)
await deposit(2);                    // Compress 2 SOL
const balance = await getBalance();  // Check balance (lamports)
await transfer(recipient, 0.7);      // Compressed transfer
await withdraw(1);                   // Decompress 1 SOL
```

### Privacy Mode (True Transaction Privacy)

```typescript
import { init, deposit, transfer, withdraw, decryptBalance } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Initialize SDK in privacy mode
await init({
  wallet: Keypair.generate(),
  cluster: 'devnet',
  privacy: {
    mode: 'privacy',           // Enable privacy mode
    enableViewingKeys: true    // Optional: enable viewing keys
  }
});

// Private operations (amounts encrypted!)
await deposit(2);                    // Encrypted deposit
const balance = await decryptBalance(); // Decrypt your balance (only you can)
await transfer(recipient, 0.7);      // Private transfer (amount hidden)
await withdraw(1);                   // Encrypted withdrawal
```

### React Usage

```tsx
import { GhostSolProvider, useGhostSol } from 'ghost-sol/react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const network = WalletAdapterNetwork.Devnet;

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <GhostSolProvider cluster={network}>
          <WalletButton />
        </GhostSolProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletButton() {
  const { address, balance, compress, transfer, decompress, loading, error } = useGhostSol();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Address: {address}</p>
      <p>Balance: {balance} lamports</p>
      <button onClick={() => compress(0.1)}>Compress 0.1 SOL</button>
      <button onClick={() => decompress(0.1)}>Decompress 0.1 SOL</button>
    </div>
  );
}
```

## API Reference

### Core Functions

#### `init(config: GhostSolConfig)`
Initialize the SDK with configuration options.

**Parameters:**
- `config.wallet` - Wallet instance (Keypair or wallet adapter)
- `config.cluster` - Solana cluster ('devnet' | 'mainnet-beta')
- `config.rpcUrl` - Custom RPC endpoint URL (optional)
- `config.commitment` - Transaction commitment level (optional)
- `config.privacy` - Privacy mode configuration (optional)
  - `mode: 'privacy' | 'efficiency'` - Operating mode
  - `enableViewingKeys: boolean` - Enable viewing keys for compliance
  - `auditMode: boolean` - Enable audit logging

#### `getAddress(): string`
Get the user's public key as a base58 string.

#### `getBalance(): Promise<number>`
Get the compressed token balance in lamports.

#### `deposit(amount: number): Promise<string>`
Deposit SOL into the SDK (compress in efficiency mode, encrypt in privacy mode).

**Parameters:**
- `amount` - Amount to deposit in SOL

**Returns:** Transaction signature

#### `transfer(to: string, amount: number): Promise<string | PrivateTransferResult>`
Transfer to another address (compressed in efficiency mode, private in privacy mode).

**Parameters:**
- `to` - Recipient's public key as base58 string
- `amount` - Amount to transfer in SOL

**Returns:** 
- Efficiency mode: Transaction signature (string)
- Privacy mode: PrivateTransferResult with signature, encrypted amount, and ZK proof

#### `withdraw(amount: number, to?: string): Promise<string>`
Withdraw from the SDK (decompress in efficiency mode, decrypt in privacy mode).

**Parameters:**
- `amount` - Amount to withdraw in SOL
- `to` - Optional destination address (defaults to user's address)

**Returns:** Transaction signature

#### `decryptBalance(viewingKey?: ViewingKey): Promise<number>`
Decrypt encrypted balance (privacy mode only).

**Parameters:**
- `viewingKey` - Optional viewing key for auditing

**Returns:** Decrypted balance in SOL

#### `generateViewingKey(): Promise<ViewingKey>`
Generate a viewing key for compliance (privacy mode only).

**Returns:** ViewingKey object with permissions

#### `fundDevnet(amount?: number): Promise<string>`
Request devnet airdrop for testing purposes.

**Parameters:**
- `amount` - Amount to request in SOL (default: 2 SOL)

### React Components

#### `GhostSolProvider`
React context provider for managing SDK state.

**Props:**
- `wallet` - Wallet adapter from @solana/wallet-adapter-react
- `cluster` - Solana cluster ('devnet' | 'mainnet-beta')
- `children` - React children

#### `useGhostSol()`
Hook to access GhostSol context.

**Returns:**
- `address` - User's address (string | null)
- `balance` - Compressed balance (number | null)
- `loading` - Initialization status (boolean)
- `error` - Error message (string | null)
- `compress()` - Compress function
- `transfer()` - Transfer function
- `decompress()` - Decompress function
- `fundDevnet()` - Airdrop function
- `refresh()` - Refresh balance and address

## Architecture

The SDK is built with modularity and maintainability in mind:

### Core Modules

- **`types.ts`** - TypeScript interfaces and types
- **`wallet.ts`** - Wallet normalization utilities
- **`rpc.ts`** - ZK Compression RPC initialization
- **`relayer.ts`** - TestRelayer implementation for fee payment
- **`ghost-sol.ts`** - Main SDK class implementation

### React Integration

- **`GhostSolProvider.tsx`** - React context provider
- **`useGhostSol.ts`** - React hook for context access

## Development Status

✅ **SDK Implementation Complete**: The GhostSol SDK is fully implemented with ZK Compression integration using Light Protocol's `@lightprotocol/stateless.js`.

### Current Status:
- ✅ **Core SDK**: Complete implementation with ZK Compression API integration
- ✅ **Wallet Integration**: Support for Keypair and browser wallet adapters
- ✅ **React Integration**: Full React context provider and hooks
- ✅ **Next.js Demo**: Complete demo application with UI
- ✅ **TypeScript Support**: Full type definitions and IntelliSense
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **Testing**: End-to-end test suite and functionality tests

### Known Limitations:
- ⚠️ **RPC Endpoint**: Standard Solana devnet RPC does not support ZK Compression methods
- ⚠️ **Light Protocol RPC**: Requires dedicated Light Protocol RPC endpoint for full functionality
- ⚠️ **Devnet Testing**: Airdrop rate limiting may affect testing on devnet

### Demo Application:
A complete Next.js demo application is available in `examples/nextjs-demo/` showcasing:
- Wallet connection with Phantom
- Balance display
- Private SOL operations (compress, transfer, decompress)
- Transaction logging
- Error handling

#### Running the Demo:
```bash
# Install dependencies
npm install

# Start the demo application
cd examples/nextjs-demo
npm run dev

# Open http://localhost:3000 in your browser
```

#### Testing the SDK:
```bash
# Run functionality tests
cd sdk
npx tsx test/sdk-functionality-test.ts

# Run end-to-end tests (requires funded account)
npx tsx test/e2e-test.ts
```

## Privacy Mode Deep Dive

### Understanding Privacy Mode

Privacy mode provides **true transaction privacy** on Solana using:

- **ElGamal Encryption**: Homomorphic encryption for amounts
- **Pedersen Commitments**: Hide balances while proving validity
- **Zero-Knowledge Proofs**: Prove transactions are valid without revealing amounts
- **Range Proofs**: Prevent negative amounts
- **Viewing Keys**: Compliance-ready auditing

### Privacy Properties

✅ **What's Private:**
- Transaction amounts (fully encrypted)
- Account balances (encrypted on-chain)
- Transfer history (amounts hidden)

❌ **What's Public:**
- Sender address (Solana account)
- Recipient address (Solana account)
- Transaction timing (block time)

### Documentation

- 📖 [Privacy Mode Guide](./docs/PRIVACY_MODE_GUIDE.md) - Comprehensive privacy mode documentation
- 📖 [Migration Guide](./docs/MIGRATION_GUIDE.md) - How to switch between modes
- 📖 [API Reference](./docs/API.md) - Complete API documentation

### Example: Privacy Mode Workflow

```typescript
// 1. Initialize with privacy enabled
await init({
  wallet,
  cluster: 'devnet',
  privacy: { mode: 'privacy', enableViewingKeys: true }
});

// 2. Deposit (encrypted)
await deposit(2);

// 3. Check encrypted balance
const encrypted = await getBalance();
console.log('Encrypted:', encrypted.ciphertext);

// 4. Decrypt balance (only you can)
const balance = await decryptBalance();
console.log('Balance:', balance, 'SOL');

// 5. Private transfer (amount hidden)
await transfer(recipient, 0.7);

// 6. Generate viewing key for auditor
const viewingKey = await generateViewingKey();
const auditedBalance = await decryptBalance(viewingKey);
```

## Contributing

This SDK follows strict development principles:

- **Best Practices**: Optimized for performance, maintainability, readability, and modularity
- **Functional Modularity**: Well-defined, reusable functions with single purposes
- **File Modularity**: Organized codebase with clear separation of concerns
- **Documentation**: Comprehensive comments and JSDoc for all functions
- **Readability**: Intuitive naming conventions and logical structure

## License

MIT License - see LICENSE file for details.

## Support

For questions and support, please open an issue on the GitHub repository.
