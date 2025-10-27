# Ghost Sol SDK

A privacy-focused SDK for SOL developers using ZK Compression technology.

## Overview

Ghost Sol SDK provides a simple interface for private SOL transfers using ZK Compression. The SDK wraps the ZK Compression APIs into easy-to-use functions that developers can integrate into their applications.

## Features

- **Simple API**: 3-line interface for private transfers
- **Wallet Flexibility**: Support for both Node.js Keypair and browser wallet adapters
- **React Integration**: Built-in React hooks and context providers
- **TypeScript Support**: Full type definitions and IntelliSense support
- **Modular Design**: Well-organized codebase with clear separation of concerns

## Installation

```bash
npm install ghost-sol
```

## Quick Start

### Node.js Usage

```typescript
import { init, getAddress, getBalance, compress, transfer, decompress } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Generate a test keypair
const keypair = Keypair.generate();

// Initialize the SDK
await init({
  wallet: keypair,
  cluster: 'devnet'
});

// Get your address
const address = getAddress();
console.log('Address:', address);

// Check compressed balance
const balance = await getBalance();
console.log('Compressed balance:', balance);

// Compress SOL (shield)
const compressSignature = await compress(0.5); // 0.5 SOL
console.log('Compress signature:', compressSignature);

// Transfer compressed tokens privately
const transferSignature = await transfer(recipientAddress, 0.1); // 0.1 SOL
console.log('Transfer signature:', transferSignature);

// Decompress SOL (unshield)
const decompressSignature = await decompress(0.3); // 0.3 SOL
console.log('Decompress signature:', decompressSignature);
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
- `config.rpcUrl` - Custom RPC endpoint URL
- `config.commitment` - Transaction commitment level

#### `getAddress(): string`
Get the user's public key as a base58 string.

#### `getBalance(): Promise<number>`
Get the compressed token balance in lamports.

#### `compress(amount: number): Promise<string>`
Compress SOL from regular account to compressed token account (shield operation).

**Parameters:**
- `amount` - Amount to compress in SOL

#### `transfer(to: string, amount: number): Promise<string>`
Transfer compressed tokens to another address privately.

**Parameters:**
- `to` - Recipient's public key as base58 string
- `amount` - Amount to transfer in SOL

#### `decompress(amount: number, to?: string): Promise<string>`
Decompress SOL from compressed account back to regular account (unshield operation).

**Parameters:**
- `amount` - Amount to decompress in SOL
- `to` - Optional destination address (defaults to user's address)

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

⚠️ **Note**: This SDK currently uses placeholder implementations for the core compression/transfer/decompression operations. The actual ZK Compression API integration is in development.

The SDK demonstrates:
- ✅ Proper initialization and configuration
- ✅ Wallet integration (Keypair and browser wallets)
- ✅ RPC connection management
- ✅ Balance querying
- ✅ React integration
- ✅ Error handling and validation
- ✅ TypeScript support

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
