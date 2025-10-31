# Ghost Sol SDK

A privacy-focused SDK for SOL developers using ZK Compression technology.

## 🎉 Beta Status

**Version**: 0.1.0-beta | **Status**: Public Beta | **Release Date**: 2025-10-31

> ⚠️ **BETA SOFTWARE**: This SDK is in public beta. It is suitable for development and testing on devnet, but **NOT recommended for production use with real funds**. APIs may change before the stable 1.0.0 release.

### What's Included in Beta
✅ ZK Compression for private SOL transfers  
✅ Stealth addresses for unlinkable payments  
✅ Viewing keys for compliance and auditing  
✅ React integration with hooks and providers  
✅ TypeScript support with full type definitions  
✅ Complete Next.js demo application  

### Known Limitations
⚠️ Prototype ElGamal encryption (production version coming in v0.2.0)  
⚠️ Manual blockchain scanning for stealth addresses (automation coming)  
⚠️ Devnet only (mainnet support in v1.0.0)  
⚠️ Requires Light Protocol-compatible RPC endpoint  

📖 **Read the full changelog**: [`CHANGELOG.md`](./CHANGELOG.md)  
🔄 **Migration guide**: [`docs/MIGRATION_GUIDE.md`](./docs/MIGRATION_GUIDE.md)

## Overview

Ghost Sol SDK provides a simple interface for private SOL transfers using ZK Compression. The SDK wraps the ZK Compression APIs into easy-to-use functions that developers can integrate into their applications.

## Features

- **Simple API**: 3-line interface for private transfers
- **Wallet Flexibility**: Support for both Node.js Keypair and browser wallet adapters
- **React Integration**: Built-in React hooks and context providers
- **TypeScript Support**: Full type definitions and IntelliSense support
- **Modular Design**: Well-organized codebase with clear separation of concerns

## Installation

### Stable Release
### Beta Installation

```bash
# Install the latest beta version
npm install ghost-sol@0.1.0-beta

# Or use the beta tag
npm install ghost-sol@beta
```

### Beta Release (Latest Features)

To install the latest beta version with cutting-edge features:

```bash
npm install ghost-sol@beta
```

Or install a specific beta version:

```bash
npm install ghost-sol@0.1.0-beta.0
```

> **Note**: Beta releases may contain experimental features and are recommended for testing and development purposes.
**Important**: During beta, we recommend pinning to a specific version to avoid unexpected changes:

```json
{
  "dependencies": {
    "ghost-sol": "0.1.0-beta"
  }
}
```

### Requirements

- **Node.js**: 18+ (recommended: 20+)
- **TypeScript**: 5.5+ (for TypeScript projects)
- **React**: 18+ (for React integration)
- **RPC Endpoint**: Light Protocol-compatible RPC for full functionality

## Quick Start

### Node.js Usage

```typescript
import { init, getAddress, getBalance, compress, transfer, decompress } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Generate a test keypair
const keypair = Keypair.generate();
console.log('🔑 Generated address:', keypair.publicKey.toBase58());
console.log('💰 Fund this address at: https://faucet.solana.com');

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

## Beta Release Features

### ✅ Core Privacy Features

#### ZK Compression
- Compress SOL for private storage
- Private transfers between addresses
- Decompress back to regular SOL
- Built on Light Protocol's stateless.js

#### Stealth Addresses
- Generate unlinkable one-time payment addresses
- Complete transaction privacy
- ECDH-based key derivation (secp256k1)
- Payment scanning and detection
- 34+ E2E test assertions

#### Viewing Keys (Compliance)
- Selective balance disclosure for auditors
- Time-limited access with expiration
- Permission-based access control
- Read-only (no spending authority)
- Revocation support

#### React Integration
- `GhostSolProvider` context provider
- `useGhostSol()` hook for easy access
- Browser wallet adapter support
- State management and error handling

### 🚧 Beta Limitations

#### Current Constraints
- **Devnet Only**: Not yet tested on mainnet
- **Prototype Encryption**: ElGamal implementation for testing only
- **Manual Scanning**: Blockchain scanning for stealth addresses requires manual ephemeral key collection
- **SOL Only**: SPL token support coming in future releases
- **RPC Requirements**: Needs Light Protocol-compatible RPC endpoint

#### Coming Soon (v0.2.0-beta)
- 🔄 Automated blockchain scanning for stealth addresses
- 🔄 Production-ready ElGamal encryption (audited)
- 🔄 Transaction history API
- 🔄 Performance optimizations
- 🔄 SPL token support (planned)

#### Future (v1.0.0 Stable)
- 🔮 Mainnet support
- 🔮 Hardware wallet integration
- 🔮 Mobile SDK (React Native)
- 🔮 Multi-signature support

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

## 📚 Documentation

- **[CHANGELOG.md](./CHANGELOG.md)** - Complete release notes and version history
- **[MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md)** - Guide for migrating between versions
- **[SDK README](./sdk/README.md)** - Detailed API documentation
- **[Implementation Docs](./docs/implementation/)** - Technical implementation details
- **[Research](./docs/research/)** - Privacy architecture and protocol analysis

## 🔒 Security

### Beta Security Status

⚠️ **Important Security Notes**:
- This is **BETA software** - not audited for production use
- Do **NOT** use with real funds on mainnet
- Prototype ElGamal encryption is for testing only
- Report security issues privately via GitHub Security Advisories

### Best Practices
- Never expose private keys or seed phrases
- Always verify recipient addresses before transfers
- Use environment variables for sensitive configuration
- Test thoroughly on devnet before any mainnet usage
- Keep viewing keys secure and revoke when no longer needed

## 🤝 Contributing

We welcome contributions! This SDK follows strict development principles:

- **Best Practices**: Optimized for performance, maintainability, readability, and modularity
- **Functional Modularity**: Well-defined, reusable functions with single purposes
- **File Modularity**: Organized codebase with clear separation of concerns
- **Documentation**: Comprehensive comments and JSDoc for all functions
- **Testing**: E2E tests for all features
- **Readability**: Intuitive naming conventions and logical structure

## 📄 License

MIT License - see LICENSE file for details.

## 💬 Support & Community

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community support
- **Discord**: [Join our Discord] (coming soon)
- **Twitter**: [@ghostsol] (coming soon)

## 🙏 Acknowledgments

- **Light Protocol** - ZK Compression infrastructure
- **Solana Foundation** - Blockchain platform
- **Noble Crypto** - Cryptography libraries
- **Open Source Community** - Contributors and testers

---

**Ready to build private Solana applications?** Get started with our [Quick Start Guide](./docs/guides/QUICK_START_GUIDE_FOR_TEAM.md)!
