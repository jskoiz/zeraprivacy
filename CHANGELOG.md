# Changelog

All notable changes to the Ghost Sol SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-beta] - 2025-10-31

### 🎉 Initial Beta Release

This is the first public beta release of Ghost Sol SDK, a privacy-focused SDK for Solana developers using ZK Compression and confidential transfer technologies.

### ✅ What Works in Beta

#### Core Privacy Features
- **ZK Compression Integration**: Full implementation using Light Protocol's `@lightprotocol/stateless.js`
- **Private SOL Transfers**: Compress, transfer, and decompress SOL with privacy
- **Stealth Addresses**: Generate unlinkable one-time payment addresses for complete transaction privacy
- **Viewing Keys**: Compliance-friendly selective balance disclosure for auditors
- **Encrypted Balances**: True balance privacy using ElGamal encryption (prototype implementation)

#### SDK Functionality
- **Simple 3-Line API**: Easy-to-use interface for private transfers
- **TypeScript Support**: Full type definitions and IntelliSense
- **Wallet Flexibility**: Support for both Node.js Keypair and browser wallet adapters
- **Error Handling**: Comprehensive error handling and validation
- **Modular Architecture**: Well-organized codebase with clear separation of concerns

#### React Integration
- **GhostSolProvider**: Context provider for managing SDK state in React applications
- **useGhostSol Hook**: React hook for accessing privacy features
- **Browser Wallet Support**: Integration with Phantom and other Solana wallet adapters
- **Next.js Demo**: Complete demo application showcasing all features

#### Testing & Quality
- **E2E Test Suite**: Comprehensive end-to-end tests for all major features
- **Stealth Address Tests**: 34+ assertions covering complete stealth workflow
- **Viewing Keys Tests**: 34 assertions validating compliance features
- **Type Safety**: Full TypeScript coverage

### 🚧 Known Limitations (Beta)

#### Privacy Implementation
- **ElGamal Encryption**: Prototype implementation using simplified crypto
  - **Production-Ready**: Will be replaced with audited implementation in v0.2.0
  - **Impact**: Current implementation is for testing and development only
- **Blockchain Scanning**: Manual ephemeral key collection required for stealth addresses
  - **Coming Soon**: Automated on-chain scanning service in v0.2.0
- **Token Support**: Currently limited to SOL
  - **Roadmap**: SPL token support planned for future releases

#### Infrastructure
- **RPC Requirements**: Requires Light Protocol-compatible RPC endpoint
  - Standard Solana devnet RPC does not support ZK Compression methods
  - Custom RPC configuration required for full functionality
- **Devnet Only**: Currently tested on Solana devnet
  - Mainnet support coming in stable v1.0.0
- **Airdrop Rate Limits**: Testing may be affected by devnet airdrop rate limiting

#### Features
- **No Transaction History**: Historical transaction viewing not yet implemented
- **No Mobile SDK**: React Native support planned for future releases
- **Limited Relayer Support**: TestRelayer implementation for development only

### 🔧 Technical Details

#### Dependencies
- `@lightprotocol/stateless.js` v0.21.0 - ZK Compression core
- `@lightprotocol/compressed-token` v0.21.0 - Compressed token operations
- `@solana/web3.js` v1.98.0 - Solana blockchain interaction
- `@noble/curves` v1.4.0 - Elliptic curve cryptography for stealth addresses
- `@noble/hashes` v1.4.0 - Cryptographic hashing

#### Supported Environments
- **Node.js**: 18+ (recommended: 20+)
- **Browsers**: Modern browsers with BigInt support
- **React**: 18+
- **TypeScript**: 5.5+

### 📦 Installation

```bash
npm install ghost-sol@0.1.0-beta
```

### 🚀 Quick Start

#### Basic Usage (Node.js)
```typescript
import { init, compress, transfer, decompress } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

const keypair = Keypair.generate();

await init({
  wallet: keypair,
  cluster: 'devnet'
});

// Private operations
await compress(0.5);                          // Shield 0.5 SOL
await transfer(recipientAddress, 0.1);        // Private transfer
await decompress(0.3);                        // Unshield to public
```

#### React Integration
```tsx
import { GhostSolProvider, useGhostSol } from 'ghost-sol/react';

function App() {
  return (
    <GhostSolProvider cluster="devnet">
      <YourComponent />
    </GhostSolProvider>
  );
}

function YourComponent() {
  const { compress, transfer, decompress } = useGhostSol();
  // Use privacy features
}
```

#### Stealth Addresses
```typescript
import * as GhostSol from 'ghost-sol';

await GhostSol.init({
  wallet: keypair,
  cluster: 'devnet',
  privacy: { mode: 'privacy' }
});

// Generate meta-address for receiving
const metaAddress = GhostSol.generateStealthMetaAddress();

// Create one-time payment address
const { stealthAddress, ephemeralKey } = 
  GhostSol.generateStealthAddress(recipientMetaAddress);

// Scan for payments
const payments = await GhostSol.scanBlockchainForPayments(
  metaAddress, 
  viewPrivateKey
);
```

#### Viewing Keys (Compliance)
```typescript
// Generate viewing key for auditor
const viewingKey = await GhostSol.generateViewingKey({
  permissions: ['balance_view'],
  expiresAt: Date.now() + 86400000 // 24 hours
});

// Auditor decrypts balance
const balance = await GhostSol.decryptBalance(viewingKey);

// Revoke access
await GhostSol.revokeViewingKey(viewingKey.id);
```

### 🔮 Coming Soon (v0.2.0)

#### Planned Features
- **Automated Blockchain Scanning**: Built-in indexer for stealth address detection
- **Production ElGamal**: Audited encryption implementation
- **Transaction History**: Query and display private transaction history
- **SPL Token Support**: Privacy for any Solana token
- **Mainnet Beta**: Testing on Solana mainnet-beta
- **Performance Optimizations**: Faster encryption and scanning

#### Under Consideration
- **Hardware Wallet Support**: Ledger and other hardware wallets
- **Mobile SDK**: React Native integration
- **GraphQL API**: Query interface for transaction history
- **Multi-signature Support**: Shared stealth addresses

### 🐛 Bug Fixes

N/A - Initial release

### 🔒 Security Notes

#### Beta Security Status
- ⚠️ **NOT PRODUCTION READY**: This is beta software for development and testing
- ⚠️ **Devnet Only**: Do not use with real funds on mainnet
- ⚠️ **Prototype Encryption**: ElGamal implementation is for testing only
- ✅ **Open Source**: All code is publicly auditable

#### Security Best Practices
- Never expose private keys or seed phrases
- Always verify recipient addresses before transfers
- Use environment variables for sensitive configuration
- Test thoroughly on devnet before any mainnet usage
- Keep viewing keys secure and revoke when no longer needed

### 📚 Documentation

- **Main README**: `/README.md` - Project overview and quick start
- **SDK README**: `/sdk/README.md` - Detailed API documentation
- **Migration Guide**: `/docs/MIGRATION_GUIDE.md` - Future version migration help
- **Implementation Docs**: `/docs/implementation/` - Technical implementation details
- **Research**: `/docs/research/` - Privacy architecture and protocol analysis

### 🤝 Contributing

We welcome contributions! This SDK follows strict development principles:

- **Best Practices**: Performance, maintainability, readability, modularity
- **Functional Modularity**: Well-defined, reusable functions
- **File Modularity**: Clear separation of concerns
- **Documentation**: Comprehensive comments and JSDoc
- **Testing**: E2E tests for all features

### 📄 License

MIT License - see LICENSE file for details

### 🙏 Acknowledgments

- Light Protocol team for ZK Compression infrastructure
- Solana Foundation for the blockchain platform
- Noble cryptography libraries for secure implementations

### 🔗 Links

- **GitHub**: [Repository URL]
- **Documentation**: [Docs URL]
- **Discord**: [Community URL]
- **Twitter**: [Twitter URL]

---

## Version History

### Beta Releases
- **0.1.0-beta** (2025-10-31) - Initial beta release

### Stable Releases
- Coming soon...

---

**Note**: This is beta software. APIs may change before the stable 1.0.0 release. Please report any issues on GitHub!
