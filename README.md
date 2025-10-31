# Zera SDK

Zera is a developer-first privacy SDK that makes private transactions simple. With a clean API, developers can implement private SOL and SPL token transfers in just a few lines.

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

Zera provides a simple interface for private SOL and SPL token transfers using ZK Compression technology. The SDK wraps the ZK Compression APIs into easy-to-use functions that developers can integrate into their applications.

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
npm install zera@0.1.0-beta

# Or use the beta tag
npm install zera@beta
```

### Beta Release (Latest Features)

To install the latest beta version with cutting-edge features:

```bash
npm install zera@beta
```

Or install a specific beta version:

```bash
npm install zera@0.1.0-beta.0
```

> **Note**: Beta releases may contain experimental features and are recommended for testing and development purposes.
**Important**: During beta, we recommend pinning to a specific version to avoid unexpected changes:

```json
{
  "dependencies": {
    "zera": "0.1.0-beta"
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
import { init, getAddress, getBalance, compress, transfer, decompress } from 'zera';
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
import { ZeraProvider, useZera } from 'zera/react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  const network = WalletAdapterNetwork.Devnet;

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <ZeraProvider cluster={network}>
          <WalletButton />
        </ZeraProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletButton() {
  const { address, balance, compress, transfer, decompress, loading, error } = useZera();

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

#### `init(config: ZeraConfig)`
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
- **`zera.ts`** - Main SDK class implementation

### React Integration

- **`ZeraProvider.tsx`** - React context provider
- **`useZera.ts`** - React hook for context access

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
- `ZeraProvider` context provider
- `useZera()` hook for easy access
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
- Range proofs are placeholder implementations (not cryptographically secure)
- Professional security audit required before production use
- Report security issues privately via GitHub Security Advisories

### Security Features

**Implemented Privacy Protections**:
- ✅ **ZK Compression**: Hide transaction amounts and balances on-chain
- ✅ **Stealth Addresses**: Unlinkable one-time payment addresses using ECDH
- ✅ **Viewing Keys**: Selective disclosure for regulatory compliance
- ✅ **Encrypted Balances**: Twisted ElGamal encryption over Ristretto255
- ✅ **Domain Separation**: Cryptographic domain separation prevents protocol collisions

**Security Assumptions**:
- Elliptic Curve Discrete Logarithm Problem (ECDLP) is hard on secp256k1 and Ristretto255
- Decisional Diffie-Hellman (DDH) assumption holds for ElGamal encryption
- SHA-256 and SHA-512 are collision-resistant and pre-image resistant
- AES-GCM provides authenticated encryption with unique nonces
- Platform CSPRNG (crypto.getRandomValues) provides secure randomness
- User private keys remain confidential and are never exposed

**Known Security Limitations**:
- ⚠️ Range proofs are placeholder only (no cryptographic proof of amount validity)
- ⚠️ Viewing key revocation is client-side only (not enforced on-chain)
- ⚠️ Fallback encryption methods in stealth addresses (should be removed for production)
- ⚠️ No explicit point validation for secp256k1 public keys
- ⚠️ No secure memory clearing for cryptographic key material
- ⚠️ RPC providers can observe query patterns (metadata leakage)

### Security Documentation

Comprehensive security documentation is available for auditors and security researchers:

- **[Security Audit Preparation](./docs/security/SECURITY_AUDIT_PREPARATION.md)** - Complete guide for security auditors
- **[Security Assumptions](./docs/security/SECURITY_ASSUMPTIONS.md)** - Cryptographic and operational assumptions
- **[Audit Checklist](./docs/security/AUDIT_CHECKLIST.md)** - Systematic security review checklist
- **[Dependency Security Audit](./docs/security/EXTERNAL_DEPENDENCY_SECURITY_AUDIT.md)** - External dependencies and API keys

### Cryptographic Implementations

**Encryption** (`sdk/src/privacy/encryption.ts`):
- **Algorithm**: Twisted ElGamal over Ristretto255 curve
- **Symmetric Encryption**: AES-256-GCM with random 12-byte IV
- **Key Derivation**: SHA-256 KDF with domain separation
- **Commitment**: Pedersen commitment for amount hiding
- **Status**: Prototype implementation for testing

**Stealth Addresses** (`sdk/src/privacy/stealth-address.ts`):
- **Curve**: secp256k1 (Bitcoin's elliptic curve)
- **Protocol**: ECDH-based one-time addresses
- **Key Derivation**: P = Hash(r*V)*G + S
- **Unlinkability**: Fresh ephemeral key per payment
- **Status**: Functional implementation, needs production hardening

**Viewing Keys** (`sdk/src/privacy/viewing-keys.ts`):
- **Derivation**: Account-specific keys using SHA-512 and XOR
- **Encryption**: ECIES-style encryption for auditor keys
- **Access Control**: Permission-based with expiration
- **Status**: Functional, client-side permission enforcement only

### Best Practices

**For Developers**:
- Never expose private keys or seed phrases in code or logs
- Always verify recipient addresses before transfers
- Use environment variables for sensitive configuration (RPC API keys)
- Validate all user input before cryptographic operations
- Test thoroughly on devnet before any mainnet usage
- Keep viewing keys secure and revoke when no longer needed
- Run local RPC node for maximum privacy (future enhancement)

**For Users**:
- Use hardware wallets when possible for key protection
- Verify recipient addresses through multiple channels
- Understand beta limitations before using the SDK
- Never share private keys, seed phrases, or viewing keys
- Keep wallet software and browser up to date
- Be aware that RPC providers can see query patterns

**For Auditors**:
- Review cryptographic implementations in `sdk/src/privacy/` directory
- Check security comments marked with "SECURITY CRITICAL" and "⚠️"
- Verify no insecure fallback behaviors in production code
- Test with invalid inputs and malformed cryptographic parameters
- Review error handling for information leakage
- Validate randomness sources and nonce uniqueness

### Threat Model

**Protected Against**:
- ✅ Transaction linkability (stealth addresses prevent linking)
- ✅ Balance disclosure (encrypted balances hide amounts)
- ✅ Unauthorized viewing (viewing keys require explicit authorization)
- ✅ Passive network observers (HTTPS encryption on RPC traffic)
- ✅ Replay attacks (transaction nonces and blockhash expiration)

**NOT Protected Against** (Out of Scope):
- ❌ Compromised user device with malware or keyloggers
- ❌ Physical access to unlocked wallet
- ❌ Social engineering or phishing attacks
- ❌ Quantum computer attacks (future threat)
- ❌ Malicious RPC provider censorship
- ❌ Browser extensions stealing wallet data
- ❌ Memory inspection or process dumps
- ❌ Side-channel attacks (timing, power, EM analysis)

### Security Audit Status

**Current Status**: Preparing for professional security audit

**Audit Preparation**:
- [x] Security documentation complete
- [x] Security assumptions documented
- [x] Audit checklist prepared
- [x] Security comments added to critical code
- [x] Known limitations identified and documented
- [ ] Professional security audit (pending)
- [ ] Remediation of audit findings (pending)
- [ ] Final security review before v1.0.0 (pending)

**Target**: Complete professional security audit before v1.0.0 stable release

### Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Use GitHub Security Advisories (preferred): [Report a vulnerability](https://github.com/jskoiz/zera/security/advisories/new)
3. Or email security contact: [To be added]
4. Include detailed description and reproduction steps
5. Allow time for us to fix before public disclosure

**Security Disclosure Policy**:
- We will acknowledge receipt within 48 hours
- We will provide an initial assessment within 1 week
- We will work with you to understand and fix the issue
- We will credit you in the security advisory (unless you prefer to remain anonymous)
- We request 90 days for responsible disclosure

### Security Roadmap

**v0.2.0-beta** (Next Release):
- [ ] Remove insecure fallback behaviors
- [ ] Add explicit point validation for all public keys
- [ ] Implement constant-time comparison utilities
- [ ] Add secure memory clearing for key material
- [ ] Improve error messages (prevent information leakage)

**v0.3.0-beta**:
- [ ] Implement proper range proofs (Bulletproofs)
- [ ] On-chain viewing key registry for revocation
- [ ] ZK proof generation for confidential transfers
- [ ] Formal verification of key protocols

**v1.0.0** (Stable Release):
- [ ] Complete professional security audit
- [ ] All critical security issues resolved
- [ ] Production-ready cryptographic implementations
- [ ] Comprehensive security testing
- [ ] Mainnet deployment approved

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
- **Twitter**: [@zera] (coming soon)

## 🙏 Acknowledgments

- **Light Protocol** - ZK Compression infrastructure
- **Solana Foundation** - Blockchain platform
- **Noble Crypto** - Cryptography libraries
- **Open Source Community** - Contributors and testers

---

**Ready to build private Solana applications?** Get started with our [Quick Start Guide](./docs/guides/QUICK_START_GUIDE_FOR_TEAM.md)!
