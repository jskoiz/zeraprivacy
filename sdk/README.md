# Ghost Sol SDK

A privacy-focused SDK for SOL developers using ZK Compression technology.

## 🎉 Beta Release - v0.1.0-beta

> ⚠️ **BETA SOFTWARE**: This SDK is in public beta for development and testing on devnet. **NOT recommended for production use with real funds**. APIs may change before v1.0.0.

### What's New in Beta
✅ Complete ZK Compression integration  
✅ Stealth addresses for unlinkable payments  
✅ Viewing keys for compliance  
✅ React integration with hooks  
✅ TypeScript support  
✅ E2E test coverage  

📖 **Full changelog**: [`/CHANGELOG.md`](../CHANGELOG.md)

## Overview

Ghost Sol SDK provides a simple interface for private SOL transfers using ZK Compression. The SDK wraps the ZK Compression APIs into easy-to-use functions that developers can integrate into their applications.

## Features

- **Simple API**: 3-line interface for private transfers
- **Privacy Features**: Stealth addresses, viewing keys, and encrypted balances
- **Wallet Flexibility**: Support for both Node.js Keypair and browser wallet adapters
- **React Integration**: Built-in React hooks and context providers
- **TypeScript Support**: Full type definitions and IntelliSense support
- **Modular Design**: Well-organized codebase with clear separation of concerns

## Installation

### Beta Installation

```bash
# Install the latest beta version
npm install ghost-sol@0.1.0-beta

# Or use the beta tag
npm install ghost-sol@beta
```

### Version Pinning (Recommended)

During beta, pin to a specific version to avoid unexpected changes:

```json
{
  "dependencies": {
    "ghost-sol": "0.1.0-beta"
  }
}
```

### Requirements

- **Node.js**: 18+ (recommended: 20+)
- **TypeScript**: 5.5+ (if using TypeScript)
- **React**: 18+ (for React integration)
- **Solana RPC**: Light Protocol-compatible endpoint required

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

## Beta Status & Limitations

### ✅ What Works in Beta

#### Core Functionality
- **ZK Compression**: Full Light Protocol integration
- **Compress/Transfer/Decompress**: Complete private SOL operations
- **Balance Queries**: Check compressed balances
- **Wallet Integration**: Keypair and browser wallets
- **React Hooks**: Complete React integration

#### Advanced Privacy Features
- **Stealth Addresses** (34+ test assertions)
  - Generate unlinkable payment addresses
  - ECDH-based key derivation (secp256k1)
  - Payment scanning and detection
  - Spending key derivation

- **Viewing Keys** (34 test assertions)
  - Selective balance disclosure for auditors
  - Time-limited access with expiration
  - Permission-based access control
  - Read-only (no spending authority)
  - Revocation support

### ⚠️ Beta Limitations

#### Known Constraints
- **Devnet Only**: Not tested on mainnet-beta
- **Prototype ElGamal**: Testing-only encryption (production version in v0.2.0)
- **Manual Scanning**: Blockchain scanning requires manual ephemeral key collection
- **SOL Only**: SPL token support coming in future releases
- **RPC Requirements**: Requires Light Protocol-compatible RPC endpoint
- **No Transaction History**: Historical queries not yet implemented

#### Coming in v0.2.0
- 🔄 Automated blockchain scanning
- 🔄 Production-ready ElGamal encryption (audited)
- 🔄 Transaction history API
- 🔄 Performance optimizations

#### Planned for v1.0.0
- 🔮 Mainnet support
- 🔮 SPL token privacy
- 🔮 Hardware wallet integration
- 🔮 Mobile SDK (React Native)

## Testing

### Available Test Suites

```bash
# Basic functionality tests
npm run test

# Privacy prototype tests
npm run test:privacy

# Dual-mode tests (efficiency vs privacy)
npm run test:dual-mode

# Viewing keys E2E tests (34 assertions)
npm run test:e2e-viewing-keys

# Stealth addresses E2E tests (34+ assertions)
npm run test:e2e-stealth

# Basic workflow E2E tests
npm run test:e2e-basic
```

### Test Coverage

- ✅ Core SDK functionality
- ✅ Wallet integration (Keypair and adapters)
- ✅ ZK Compression operations
- ✅ Stealth address generation and scanning
- ✅ Viewing key compliance workflow
- ✅ React integration
- ✅ Error handling

## 🔒 Security

### Beta Security Notice

⚠️ **Important**:
- This is **BETA software** - not audited for production
- Do **NOT** use with real funds on mainnet
- Prototype encryption is for testing only
- Report security issues via GitHub Security Advisories

### Best Practices
- Never expose private keys or seed phrases
- Always verify recipient addresses
- Use environment variables for sensitive data
- Test thoroughly on devnet first
- Revoke viewing keys when no longer needed

## 📚 Documentation

- **[Main README](../README.md)** - Project overview
- **[CHANGELOG](../CHANGELOG.md)** - Version history and release notes
- **[MIGRATION_GUIDE](../docs/MIGRATION_GUIDE.md)** - Version migration help
- **[Implementation Docs](../docs/implementation/)** - Technical details
- **[Research](../docs/research/)** - Privacy architecture

## 🤝 Contributing

We welcome contributions! This SDK follows strict development principles:

- **Best Practices**: Optimized for performance, maintainability, readability, and modularity
- **Functional Modularity**: Well-defined, reusable functions with single purposes
- **File Modularity**: Organized codebase with clear separation of concerns
- **Documentation**: Comprehensive comments and JSDoc for all functions
- **Testing**: E2E tests for all features
- **Readability**: Intuitive naming conventions and logical structure

### Development Setup

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Run specific test suite
npm run test:e2e-viewing-keys
```

## 📄 License

MIT License - see LICENSE file for details.

## 💬 Support

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Discord**: [Join our Discord] (coming soon)

## 🙏 Acknowledgments

- **Light Protocol** - ZK Compression infrastructure
- **Solana Foundation** - Blockchain platform
- **Noble Crypto** - Cryptography libraries

---

**Version**: 0.1.0-beta | **Status**: Public Beta | **Release**: 2025-10-31
