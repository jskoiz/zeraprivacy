# GhostSol SDK

**Privacy-focused SDK for Solana developers using ZK Compression technology.**

GhostSol provides a simple, developer-friendly interface for integrating private transfers into your Solana applications and agents. It leverages Light Protocol's ZK Compression to enable shielded transactions.

## Features

- 🛡️ **ZK Compression**: Shield SOL and tokens using zero-knowledge proofs.
- 🕵️ **Stealth Addresses**: Generate one-time addresses for true unlinkability (powered by standard Ed25519 crypto).
- 🤖 **Agent-Ready**: Designed for autonomous agents (Node.js) to manage private funds.
- ⚡ **Simple API**: `compress`, `transfer`, `decompress` in just a few lines.

## Installation

```bash
npm install ghost-sol
```

## Quick Start (CLI / Agents)

GhostSol is perfect for autonomous agents running in a Node.js environment.

### 1. Run the Demo

We provide a ready-to-run CLI demo that simulates two agents (Alice and Bob) exchanging private funds.

```bash
# Clone the repo
git clone https://github.com/jskoiz/ghostsol.git
cd ghostsol

# Install dependencies
npm install

# Run the demo
npx tsx examples/cli-demo.ts
```

### 2. Use in Your Code

```typescript
import { init, compress, transfer, decompress } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// 1. Initialize with your agent's keypair
const agentKeypair = Keypair.fromSecretKey(...);
await init({
  wallet: agentKeypair,
  cluster: 'devnet' // or 'mainnet-beta'
});

// 2. Shield funds (Public SOL -> Private SOL)
const sig1 = await compress(1000000000); // 1 SOL

// 3. Transfer privately
const sig2 = await transfer('RecipientPublicKey...', 500000000); // 0.5 SOL

// 4. Unshield funds (Private SOL -> Public SOL)
const sig3 = await decompress(100000000); // 0.1 SOL
```

## Architecture

GhostSol is built on top of:
- **@lightprotocol/stateless.js**: For ZK proof generation and RPC interaction.
- **@solana/web3.js**: For standard Solana interaction.
- **@noble/curves**: For secure cryptographic operations.

## Important Note on Browser Support

Currently, GhostSol requires a raw `Keypair` to generate ZK proofs on the client side. This means it is primarily designed for **server-side applications** or **autonomous agents** where the private key is available.

Standard browser wallets (Phantom, Solflare) do not expose private keys, so client-side ZK proving is not directly supported with them yet. For web applications, we recommend using a backend service to handle the ZK operations.

## License

MIT
