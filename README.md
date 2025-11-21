# 👻 GhostSol Privacy SDK

GhostSol is a privacy-first SDK for Solana, enabling confidential transactions and stealth addresses for autonomous agents and privacy-conscious applications.

Built on **SPL Token 2022 Confidential Transfers** and **Elliptic Curve Diffie-Hellman (ECDH)** stealth address protocols.

> **Note:** This SDK is currently in **Simulation Mode** for Confidential Transfers due to limitations in client-side Zero-Knowledge Proof generation in JavaScript. It simulates the confidential transfer flow using standard Token 2022 instructions where possible, or placeholders for heavy ZK operations. Stealth Addresses are fully functional.

## 🚀 Features

- **Confidential Transfers**: Shield, transfer, and unshield tokens privately using SPL Token 2022 (Simulated).
- **Stealth Addresses**: Generate one-time addresses for every transaction to break on-chain linkability.
- **Privacy-First**: No "Efficiency Mode" or compression trade-offs. Pure privacy focus.
- **Agent-Ready**: Designed for autonomous agents to manage private funds programmatically.

## 📦 Installation

```bash
npm install ghostsol
# or
yarn add ghostsol
```

## 🛠️ Usage

### Initialization

```typescript
import * as Zera from 'ghostsol';
import { Keypair, Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const wallet = Keypair.generate(); // Your wallet

await Zera.init({
  cluster: 'devnet',
  wallet: wallet,
  privacy: {
    mode: 'privacy',
    enableViewingKeys: true
  }
});
```

### Confidential Transfers (Simulation)

```typescript
// Create a Confidential Mint
const mint = await Zera.createConfidentialMint();

// Create a Confidential Account
const account = await Zera.createConfidentialAccount(mint);

// Shield (Deposit)
await Zera.deposit(account, mint, 100);

// Transfer Privately
const recipientAccount = await Zera.createConfidentialAccount(mint, recipientPublicKey);
await Zera.transfer(account, mint, recipientAccount, 50);

// Unshield (Withdraw)
await Zera.withdraw(account, mint, 25);
```

### Stealth Addresses

```typescript
// 1. Recipient generates a Meta-Address (publicly shareable)
const metaAddress = Zera.generateStealthMetaAddress();

// 2. Sender generates a Stealth Address for the recipient
const { stealthAddress, ephemeralKey } = Zera.generateStealthAddress(metaAddress);

// 3. Sender sends funds to `stealthAddress.address`
console.log("Send funds to:", stealthAddress.address.toBase58());

// 4. Recipient scans for payments
const payments = await Zera.scanForPayments(
    metaAddress, 
    viewPrivateKey, // Recipient's view private key
    [ephemeralKey]  // List of ephemeral keys found on-chain (e.g. from memo or event)
);

if (payments.length > 0) {
    // 5. Recipient derives the spending key
    const spendingKey = Zera.deriveStealthSpendingKey(payments[0], spendPrivateKey);
    console.log("Recovered funds with key:", spendingKey.publicKey.toBase58());
}
```

## 🎮 Running the Demo

The SDK includes a CLI demo that showcases the full privacy lifecycle.

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the demo**:
   ```bash
   npx tsx cli-demo.ts
   ```

The demo will:
- Airdrop SOL to a demo wallet.
- Create a Confidential Mint and Account.
- Simulate Shielding, Private Transfer, and Unshielding.
- Generate a Stealth Address and verify the payment scanning flow.

## 🔒 Security

- **Cryptography**: Uses `@noble/curves` (Ed25519) and `@noble/hashes` (SHA512/SHA256) for secure ECDH and key derivation.
- **Token 2022**: Leverages the official SPL Token 2022 program for account management.
- **Non-Custodial**: The SDK never stores your private keys.

## 📄 License

MIT
