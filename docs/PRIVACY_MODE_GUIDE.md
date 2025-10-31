# GhostSOL Privacy Mode Guide

Complete guide to using true transaction privacy on Solana with GhostSOL's privacy mode.

## Table of Contents

- [Overview](#overview)
- [Privacy vs Efficiency Mode](#privacy-vs-efficiency-mode)
- [Getting Started](#getting-started)
- [Core Operations](#core-operations)
  - [Initialization](#initialization)
  - [Encrypted Deposits](#encrypted-deposits)
  - [Private Transfers](#private-transfers)
  - [Encrypted Withdrawals](#encrypted-withdrawals)
  - [Balance Decryption](#balance-decryption)
- [Viewing Keys & Compliance](#viewing-keys--compliance)
- [Security Best Practices](#security-best-practices)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

GhostSOL Privacy Mode provides **true transaction privacy** on Solana using SPL Token 2022 Confidential Transfers. Unlike efficiency mode (which uses ZK Compression for cost reduction), privacy mode encrypts all transaction amounts and balances, making your financial activity completely private.

### What Privacy Mode Provides

✅ **Encrypted Balances**: Your balance is stored as encrypted ciphertext on-chain  
✅ **Private Transfers**: Transaction amounts are hidden using ElGamal encryption  
✅ **Zero-Knowledge Proofs**: Validity proven without revealing amounts  
✅ **Viewing Keys**: Optional compliance features for auditors  
✅ **True Privacy**: No one can see your balance or transaction amounts

### When to Use Privacy Mode

Privacy mode is ideal for:
- 💼 **Payroll & Salaries**: Keep employee compensation private
- 🤝 **Donations**: Anonymous charitable giving
- 💰 **OTC Trades**: Private large transactions
- 🏦 **Compliance**: Regulated industries requiring privacy
- 🔐 **Personal Finance**: Keep your finances private

---

## Privacy vs Efficiency Mode

Understanding the difference between the two modes:

| Feature | Privacy Mode | Efficiency Mode |
|---------|-------------|-----------------|
| **Transaction Privacy** | ✅ Full privacy (encrypted) | ❌ Public (visible on-chain) |
| **Balance Privacy** | ✅ Encrypted on-chain | ❌ Visible to anyone |
| **Cost** | Standard transaction fees | 🔥 5000x cheaper |
| **Speed** | ~5-10 seconds | ~1-2 seconds |
| **Use Case** | True privacy | Cost optimization |
| **Technology** | SPL Token 2022 + ZK Proofs | ZK Compression |
| **Compliance** | ✅ Viewing keys | ❌ N/A |

**Key Insight**: 
- **Efficiency Mode** = Public but cheap (like Bitcoin transactions)
- **Privacy Mode** = Private but standard cost (like Monero/Zcash)

---

## Getting Started

### Installation

```bash
npm install ghost-sol
```

### Quick Start Example

```typescript
import { init, deposit, transfer, withdraw, decryptBalance } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Initialize in privacy mode
await init({
  wallet: Keypair.generate(),
  cluster: 'devnet',
  privacy: {
    mode: 'privacy',
    enableViewingKeys: true
  }
});

// Perform private operations
await deposit(2);                                  // Deposit 2 SOL (encrypted)
const balance = await decryptBalance();            // Decrypt your balance
await transfer(recipientAddress, 0.7);             // Private transfer
await withdraw(1);                                 // Encrypted withdrawal
```

---

## Core Operations

### Initialization

Initialize the SDK in privacy mode:

```typescript
import { init } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

await init({
  wallet: Keypair.generate(),  // or wallet adapter
  cluster: 'devnet',           // or 'mainnet-beta'
  privacy: {
    mode: 'privacy',           // REQUIRED for privacy mode
    enableViewingKeys: true,   // Optional: enable compliance features
    auditMode: true            // Optional: enhanced audit logging
  }
});
```

**Configuration Options**:
- `mode: 'privacy'` - **Required** to enable privacy mode
- `enableViewingKeys` - Enable viewing key generation for compliance
- `auditMode` - Enable detailed audit logging (for regulated entities)

### Encrypted Deposits

Deposit SOL into your encrypted balance:

```typescript
import { deposit, getBalance, decryptBalance } from 'ghost-sol';

// Deposit 2 SOL (encrypted)
const signature = await deposit(2);
console.log('Deposit signature:', signature);

// Check encrypted balance
const encrypted = await getBalance();
console.log('Encrypted balance exists:', encrypted.exists);

// Decrypt to see actual amount (only you can do this)
const amount = await decryptBalance();
console.log('Actual balance:', amount, 'SOL');
```

**How It Works**:
1. Amount is encrypted using ElGamal encryption
2. Zero-knowledge proof is generated to prove validity
3. Encrypted balance is stored on-chain
4. Only you can decrypt with your private key

**Performance**: ~5-10 seconds end-to-end

### Private Transfers

Send encrypted transfers that hide the amount:

```typescript
import { transfer, decryptBalance } from 'ghost-sol';

// Private transfer to recipient
const result = await transfer(recipientAddress, 0.7);
console.log('Transfer signature:', result.signature);
console.log('ZK Proof:', result.zkProof);

// Check your balance after transfer
const newBalance = await decryptBalance();
console.log('New balance:', newBalance, 'SOL');
```

**Privacy Properties**:
- ✅ Transfer amount is encrypted
- ✅ Sender identity is known (Solana accounts)
- ✅ Recipient identity is known (on-chain)
- ✅ **Amount is hidden** (true privacy)
- ✅ Validity proven with ZK proofs

**Performance**: ~5-10 seconds end-to-end

### Encrypted Withdrawals

Withdraw from your encrypted balance back to regular SOL:

```typescript
import { withdraw } from 'ghost-sol';

// Withdraw 1 SOL to your wallet
const signature = await withdraw(1);
console.log('Withdrawal signature:', signature);

// Optional: specify different destination
const signature2 = await withdraw(0.5, destinationAddress);
```

**Note**: The withdrawal amount is encrypted until it leaves the privacy pool.

**Performance**: ~5-10 seconds end-to-end

### Balance Decryption

Decrypt your encrypted balance:

```typescript
import { getBalance, decryptBalance } from 'ghost-sol';

// Get encrypted balance structure
const encrypted = await getBalance();
console.log('Ciphertext:', encrypted.ciphertext);
console.log('Commitment:', encrypted.commitment);

// Decrypt using your private key
const amount = await decryptBalance();
console.log('Decrypted amount:', amount, 'SOL');

// With viewing key (for compliance)
const viewingKey = await generateViewingKey();
const auditedAmount = await decryptBalance(viewingKey);
```

**Security**: Only the account owner (or viewing key holders) can decrypt.

**Performance**: <1 second

---

## Viewing Keys & Compliance

Viewing keys allow authorized parties (auditors, regulators) to decrypt your balance without accessing your private key.

### Generating a Viewing Key

```typescript
import { generateViewingKey } from 'ghost-sol';

// Generate viewing key with default permissions
const viewingKey = await generateViewingKey();
console.log('Viewing key public key:', viewingKey.publicKey);
console.log('Permissions:', viewingKey.permissions);

// Share viewing key with auditor (securely)
const keyForAuditor = {
  publicKey: viewingKey.publicKey,
  encryptedPrivateKey: viewingKey.encryptedPrivateKey
};
```

### Viewing Key Permissions

Control what the viewing key can access:

```typescript
const viewingKey = await generateViewingKey();

// Default permissions
console.log({
  canViewBalances: true,    // Can decrypt balance
  canViewAmounts: true,     // Can decrypt transaction amounts
  canViewMetadata: false,   // Cannot view metadata
  allowedAccounts: [...]    // Specific accounts only
});
```

### Using a Viewing Key

```typescript
import { decryptBalance } from 'ghost-sol';

// Auditor uses viewing key to decrypt balance
const auditedBalance = await decryptBalance(viewingKey);
console.log('Audited balance:', auditedBalance, 'SOL');
```

### Setting Expiration

```typescript
// Generate viewing key that expires in 30 days
const viewingKey = await generateViewingKey({
  expirationDays: 30
});

console.log('Expires at:', new Date(viewingKey.expiresAt));
```

### Revoking Viewing Keys

```typescript
import { revokeViewingKey } from 'ghost-sol';

// Revoke a viewing key
await revokeViewingKey(accountAddress, viewingKeyPublicKey);
console.log('Viewing key revoked');
```

---

## Security Best Practices

### 1. Protect Your Private Key

```typescript
// ❌ DON'T: Store private key in plain text
const privateKey = wallet.secretKey.toString();

// ✅ DO: Use secure wallet adapters
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
const wallet = new PhantomWalletAdapter();
```

### 2. Verify Transaction Signatures

```typescript
// Always verify transaction succeeded
const signature = await deposit(2);
const confirmation = await connection.confirmTransaction(signature);
if (confirmation.value.err) {
  throw new Error('Transaction failed');
}
```

### 3. Use Viewing Keys Carefully

```typescript
// ✅ DO: Limit viewing key permissions
const restrictedKey = await generateViewingKey({
  permissions: {
    canViewBalances: true,
    canViewAmounts: false,    // Don't allow amount viewing
    canViewMetadata: false
  },
  expirationDays: 7           // Short expiration
});

// ❌ DON'T: Share viewing keys over insecure channels
// Use encrypted messaging or secure file transfer
```

### 4. Validate Amounts

```typescript
// Always validate user input
function validateAmount(amount: number): void {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  if (amount > MAX_SAFE_AMOUNT) {
    throw new Error('Amount too large');
  }
}

await deposit(validateAmount(userInput));
```

### 5. Handle Errors Securely

```typescript
try {
  await privateTransfer(recipient, amount);
} catch (error) {
  // ✅ DO: Log error without sensitive data
  console.error('Transfer failed:', error.message);
  
  // ❌ DON'T: Log entire error object (may contain keys)
  // console.error(error);
}
```

### 6. Regular Security Audits

For production applications:
- 🔍 Regular security audits of your code
- 🔄 Keep dependencies updated
- 🔐 Use hardware wallets for large amounts
- 📊 Monitor for suspicious activity
- 🚨 Implement rate limiting

---

## Performance Considerations

### Expected Performance

| Operation | Target | Actual (Prototype) | Production Goal |
|-----------|--------|-------------------|-----------------|
| Proof Generation | <5s | ~2-3s (simulated) | <3s |
| Deposit | <10s | ~5-8s | <8s |
| Transfer | <10s | ~5-8s | <8s |
| Withdrawal | <10s | ~5-8s | <8s |
| Balance Decryption | <1s | ~100-300ms | <500ms |

### Optimizing Performance

**1. Batch Operations**:
```typescript
// Instead of multiple single operations
const operations = [
  transfer(recipient1, 0.1),
  transfer(recipient2, 0.2),
  transfer(recipient3, 0.3)
];

await Promise.all(operations); // Parallel execution
```

**2. Cache Decrypted Balances**:
```typescript
let cachedBalance: number | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 30000; // 30 seconds

async function getBalanceWithCache(): Promise<number> {
  const now = Date.now();
  if (cachedBalance !== null && now - cacheTime < CACHE_TTL) {
    return cachedBalance;
  }
  
  cachedBalance = await decryptBalance();
  cacheTime = now;
  return cachedBalance;
}
```

**3. Use Appropriate Commitment Levels**:
```typescript
await init({
  wallet,
  cluster: 'devnet',
  commitment: 'confirmed', // Faster than 'finalized'
  privacy: { mode: 'privacy' }
});
```

**4. Monitor Network Conditions**:
```typescript
// Check network congestion before operations
const recentPerformance = await connection.getRecentPerformanceSamples(1);
if (recentPerformance[0].numTransactions > CONGESTION_THRESHOLD) {
  console.warn('Network congested, operations may be slower');
}
```

---

## Troubleshooting

### Common Issues

#### 1. Proof Generation Timeout

**Problem**: "Proof generation timed out"

**Solution**:
```typescript
// Increase timeout in config
await init({
  wallet,
  cluster: 'devnet',
  privacy: {
    mode: 'privacy',
    circuitParams: {
      proofTimeout: 30000 // 30 seconds
    }
  }
});
```

#### 2. Cannot Decrypt Balance

**Problem**: "Failed to decrypt balance"

**Possible Causes**:
- Using wrong private key
- Encrypted balance not yet initialized
- Viewing key expired

**Solution**:
```typescript
// Check if account exists
const encrypted = await getBalance();
if (!encrypted.exists) {
  console.log('No encrypted balance yet, deposit first');
  await deposit(1);
}

// Verify you're using correct wallet
console.log('Current wallet:', getAddress());
```

#### 3. Transaction Failed

**Problem**: Transaction fails without clear error

**Solution**:
```typescript
import { PrivacyError } from 'ghost-sol';

try {
  await deposit(amount);
} catch (error) {
  if (error instanceof PrivacyError) {
    console.error('Privacy operation failed:', error.message);
    console.error('Cause:', error.cause);
  }
  
  // Check balance
  const solBalance = await connection.getBalance(wallet.publicKey);
  console.log('SOL balance:', solBalance / LAMPORTS_PER_SOL);
}
```

#### 4. Slow Performance

**Problem**: Operations taking longer than expected

**Checklist**:
```typescript
// 1. Check network
const ping = Date.now();
await connection.getLatestBlockhash();
console.log('Network latency:', Date.now() - ping, 'ms');

// 2. Check RPC endpoint
console.log('Using RPC:', connection.rpcEndpoint);

// 3. Try different commitment level
await init({
  wallet,
  cluster: 'devnet',
  commitment: 'processed', // Fastest
  privacy: { mode: 'privacy' }
});
```

---

## FAQ

### General Questions

**Q: How is privacy mode different from efficiency mode?**

A: Privacy mode provides true transaction privacy by encrypting amounts. Efficiency mode uses ZK Compression to reduce costs but transactions remain public.

**Q: Can anyone see my balance in privacy mode?**

A: No. Your balance is encrypted on-chain. Only you (with your private key) or viewing key holders can decrypt it.

**Q: What about sender/recipient privacy?**

A: Solana accounts (addresses) are still visible on-chain. Privacy mode hides the **amounts** transferred, not the identities.

**Q: Is privacy mode slower than efficiency mode?**

A: Yes, slightly. Privacy mode takes ~5-10 seconds per operation (due to proof generation), while efficiency mode takes ~1-2 seconds.

### Security Questions

**Q: How secure is the encryption?**

A: Privacy mode uses:
- **ElGamal encryption** for amounts
- **Pedersen commitments** for balance hiding
- **Groth16 ZK proofs** for validity
- **Range proofs** to prevent negative amounts

These are battle-tested cryptographic primitives used in Zcash and other privacy coins.

**Q: Can the viewing key decrypt everything?**

A: No. Viewing keys have configurable permissions and can be limited to specific operations or time periods.

**Q: What if I lose my private key?**

A: Your encrypted balance cannot be recovered without the private key. Always backup your wallet securely.

### Compliance Questions

**Q: Is privacy mode legal?**

A: Privacy itself is legal. Consult with legal counsel about your specific use case and jurisdiction. Viewing keys provide compliance features for regulated entities.

**Q: How do viewing keys help with compliance?**

A: Viewing keys allow you to grant auditors access to decrypt your balance without giving them spending power.

**Q: Can I use privacy mode for my business?**

A: Yes. Privacy mode is designed for both personal and business use. Viewing keys make it suitable for regulated industries.

### Technical Questions

**Q: Does privacy mode work on mainnet?**

A: Privacy mode is currently in development. Devnet testing is available now.

**Q: What's the cost per transaction?**

A: Standard Solana transaction fees (~0.000005 SOL). No additional privacy premium.

**Q: Can I switch between modes?**

A: Yes! See the [Migration Guide](./MIGRATION_GUIDE.md) for details on switching modes.

**Q: How do I integrate with my existing app?**

A: Privacy mode uses the same API as efficiency mode. Just pass `privacy: { mode: 'privacy' }` in config.

---

## Next Steps

- 📖 Read the [Migration Guide](./MIGRATION_GUIDE.md) to switch modes
- 🔧 Check the [API Reference](./API.md) for detailed API docs
- 💻 Try the [example app](/examples/nextjs-demo)
- 🧪 Run the [test suite](/sdk/test/privacy) to see it in action
- 💬 Join our community for support

---

## Resources

- **GitHub**: [github.com/ghostsol/ghostsol](https://github.com/ghostsol/ghostsol)
- **Documentation**: [docs.ghostsol.io](https://docs.ghostsol.io)
- **SPL Token 2022**: [spl.solana.com/token-2022](https://spl.solana.com/token-2022)
- **ZK Proofs on Solana**: [docs.solana.com/developing/runtime-facilities/zk-token-proof](https://docs.solana.com/developing/runtime-facilities/zk-token-proof)

---

**Need Help?** Open an issue on GitHub or reach out to our team.
