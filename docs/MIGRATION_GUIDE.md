# Migration Guide: Efficiency Mode ↔ Privacy Mode

Complete guide for migrating between GhostSOL's two operating modes.

## Table of Contents

- [Overview](#overview)
- [Understanding the Modes](#understanding-the-modes)
- [Migration Path 1: Efficiency → Privacy](#migration-path-1-efficiency--privacy)
- [Migration Path 2: Privacy → Efficiency](#migration-path-2-privacy--efficiency)
- [Breaking Changes](#breaking-changes)
- [Performance Comparison](#performance-comparison)
- [Cost Comparison](#cost-comparison)
- [Use Case Matrix](#use-case-matrix)
- [Code Examples](#code-examples)
- [Testing Your Migration](#testing-your-migration)
- [Rollback Strategy](#rollback-strategy)

---

## Overview

GhostSOL supports two distinct modes:

1. **Efficiency Mode** (default): Uses ZK Compression for 5000x cost reduction
2. **Privacy Mode**: Uses SPL Token 2022 Confidential Transfers for true transaction privacy

This guide helps you migrate between modes with zero downtime and minimal code changes.

### Quick Migration Checklist

- [ ] Understand the differences between modes
- [ ] Update initialization code
- [ ] Test in devnet environment
- [ ] Update user-facing documentation
- [ ] Monitor performance after migration
- [ ] Have rollback plan ready

---

## Understanding the Modes

### Mode Comparison

| Aspect | Efficiency Mode | Privacy Mode |
|--------|----------------|--------------|
| **Privacy** | Public (amounts visible) | Private (amounts encrypted) |
| **Cost** | 5000x cheaper | Standard Solana fees |
| **Speed** | ~1-2 seconds/tx | ~5-10 seconds/tx |
| **Balance** | Public on-chain | Encrypted on-chain |
| **Viewing Keys** | N/A | Supported |
| **Compliance** | Basic | Enhanced with viewing keys |
| **Best For** | Gaming, DeFi, high-frequency | Payroll, donations, OTC trades |

### Which Mode Should You Use?

**Choose Efficiency Mode if:**
- ✅ Cost optimization is your primary goal
- ✅ Privacy is not a requirement
- ✅ You need maximum transaction speed
- ✅ Your use case is DeFi, gaming, or high-frequency trading

**Choose Privacy Mode if:**
- ✅ Transaction privacy is critical
- ✅ You need compliance features (viewing keys)
- ✅ You handle sensitive financial data
- ✅ Your use case is payroll, donations, or OTC trades

---

## Migration Path 1: Efficiency → Privacy

### Step 1: Update Configuration

**Before (Efficiency Mode)**:
```typescript
import { init } from 'ghost-sol';

await init({
  wallet: myWallet,
  cluster: 'devnet'
});
// Defaults to efficiency mode
```

**After (Privacy Mode)**:
```typescript
import { init } from 'ghost-sol';

await init({
  wallet: myWallet,
  cluster: 'devnet',
  privacy: {                    // Add privacy config
    mode: 'privacy',            // Enable privacy mode
    enableViewingKeys: true     // Optional: enable viewing keys
  }
});
```

### Step 2: Update Operation Calls

The API remains the same! Only the underlying behavior changes.

**Efficiency Mode**:
```typescript
await deposit(2);        // Compress SOL
await transfer(to, 0.7); // Compressed transfer
await withdraw(1);       // Decompress SOL
```

**Privacy Mode** (same API):
```typescript
await deposit(2);        // Encrypted deposit
await transfer(to, 0.7); // Private transfer
await withdraw(1);       // Encrypted withdrawal
```

### Step 3: Handle Balance Differently

**Efficiency Mode**:
```typescript
const balance = await getBalance(); // Returns number (lamports)
console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
```

**Privacy Mode**:
```typescript
const encrypted = await getBalance(); // Returns encrypted structure
console.log('Encrypted:', encrypted.exists);

const balance = await decryptBalance(); // Decrypt to see amount
console.log('Balance:', balance, 'SOL');
```

### Step 4: Add Viewing Key Support (Optional)

Only applicable in privacy mode:

```typescript
// Generate viewing key for compliance
const viewingKey = await generateViewingKey();

// Share with auditor
const auditorBalance = await decryptBalance(viewingKey);
```

### Step 5: Update Error Handling

Add privacy-specific error handling:

```typescript
import { 
  PrivacyError, 
  EncryptionError, 
  ProofGenerationError 
} from 'ghost-sol';

try {
  await deposit(2);
} catch (error) {
  if (error instanceof PrivacyError) {
    console.error('Privacy operation failed:', error.message);
  } else if (error instanceof EncryptionError) {
    console.error('Encryption failed:', error.message);
  } else if (error instanceof ProofGenerationError) {
    console.error('Proof generation failed:', error.message);
  }
}
```

### Step 6: Update UI/UX

Inform users about the new privacy features:

```typescript
// Before
<div>Balance: {balance / LAMPORTS_PER_SOL} SOL</div>

// After
<div>
  {isPrivacyMode ? (
    <div>
      Balance: {decryptedBalance} SOL (🔐 Private)
      <button onClick={showEncrypted}>Show Encrypted</button>
    </div>
  ) : (
    <div>Balance: {balance / LAMPORTS_PER_SOL} SOL</div>
  )}
</div>
```

### Step 7: Test Migration

```typescript
// Test script
async function testMigration() {
  console.log('Testing privacy mode migration...');
  
  // 1. Initialize in privacy mode
  await init({
    wallet: testWallet,
    cluster: 'devnet',
    privacy: { mode: 'privacy' }
  });
  
  // 2. Test deposit
  await deposit(0.1);
  console.log('✅ Deposit works');
  
  // 3. Test balance decryption
  const balance = await decryptBalance();
  console.log('✅ Decryption works:', balance);
  
  // 4. Test transfer
  await transfer(recipient, 0.05);
  console.log('✅ Transfer works');
  
  // 5. Test withdrawal
  await withdraw(0.04);
  console.log('✅ Withdrawal works');
  
  console.log('Migration test complete!');
}
```

### Step 8: Deploy Gradually

Roll out in phases:

1. **Week 1**: Deploy to devnet, test thoroughly
2. **Week 2**: Beta test with small user group
3. **Week 3**: Gradual rollout to 25% of users
4. **Week 4**: Full rollout to all users

---

## Migration Path 2: Privacy → Efficiency

### When to Migrate Back

Consider migrating from Privacy to Efficiency if:
- ⚠️ Privacy is no longer required
- ⚠️ Performance is more critical than privacy
- ⚠️ Cost reduction is needed
- ⚠️ Complexity is causing issues

### Step 1: Update Configuration

**Before (Privacy Mode)**:
```typescript
await init({
  wallet: myWallet,
  cluster: 'devnet',
  privacy: {
    mode: 'privacy',
    enableViewingKeys: true
  }
});
```

**After (Efficiency Mode)**:
```typescript
await init({
  wallet: myWallet,
  cluster: 'devnet'
  // No privacy config = efficiency mode
});

// Or explicitly:
await init({
  wallet: myWallet,
  cluster: 'devnet',
  privacy: { mode: 'efficiency' }
});
```

### Step 2: Remove Privacy-Specific Code

**Remove viewing key code**:
```typescript
// ❌ Remove this
const viewingKey = await generateViewingKey();
const auditedBalance = await decryptBalance(viewingKey);

// ✅ Use this instead
const balance = await getBalance(); // Returns number directly
```

**Simplify balance handling**:
```typescript
// ❌ Remove this
const encrypted = await getBalance();
const balance = await decryptBalance();

// ✅ Use this instead
const balance = await getBalance(); // Direct lamports value
```

### Step 3: Update Performance Expectations

```typescript
// Privacy mode: 5-10 seconds
await deposit(2); // ~8 seconds

// Efficiency mode: 1-2 seconds  
await deposit(2); // ~1.5 seconds
```

### Step 4: Inform Users

```typescript
// Notify users of the change
function showModeChangeNotification() {
  return (
    <Alert>
      We've switched to Efficiency Mode for faster transactions.
      Transaction amounts are now public for better transparency.
    </Alert>
  );
}
```

---

## Breaking Changes

### ⚠️ API Changes

**None!** The public API is the same across both modes.

### ⚠️ Behavior Changes

| Operation | Efficiency Mode | Privacy Mode |
|-----------|----------------|--------------|
| `getBalance()` | Returns `number` (lamports) | Returns `EncryptedBalance` object |
| `deposit()` | Compresses SOL | Encrypts deposit |
| `transfer()` | Compressed transfer | Private transfer with ZK proof |
| `withdraw()` | Decompresses SOL | Encrypted withdrawal |

### ⚠️ Return Type Changes

**Efficiency Mode**:
```typescript
const balance: number = await getBalance();
const sig: string = await transfer(to, amount);
```

**Privacy Mode**:
```typescript
const balance: EncryptedBalance = await getBalance();
const result: PrivateTransferResult = await transfer(to, amount);
// result.signature, result.encryptedAmount, result.zkProof
```

### ⚠️ New Errors

Privacy mode introduces new error types:

```typescript
import {
  PrivacyError,
  EncryptionError,
  ProofGenerationError,
  ViewingKeyError,
  ComplianceError
} from 'ghost-sol';
```

---

## Performance Comparison

### Operation Timings

| Operation | Efficiency Mode | Privacy Mode | Difference |
|-----------|----------------|--------------|------------|
| Initialization | ~2-3 seconds | ~3-5 seconds | +50% |
| Deposit | ~1-2 seconds | ~5-8 seconds | +300% |
| Transfer | ~1-2 seconds | ~5-8 seconds | +300% |
| Withdrawal | ~1-2 seconds | ~5-8 seconds | +300% |
| Balance Query | ~0.5-1 second | ~0.1-0.5 seconds (encrypted) | -50% |
| Balance Decrypt | N/A | ~0.1-0.5 seconds | N/A |

### Throughput Comparison

```typescript
// Efficiency Mode
const ops = await Promise.all([
  deposit(1),
  deposit(1),
  deposit(1)
]); // Completes in ~3 seconds total

// Privacy Mode
const ops = await Promise.all([
  deposit(1),
  deposit(1),
  deposit(1)
]); // Completes in ~10 seconds total
```

### Memory Usage

| Mode | Initialization | Per Transaction | Steady State |
|------|---------------|-----------------|--------------|
| Efficiency | ~10 MB | ~2 MB | ~15 MB |
| Privacy | ~15 MB | ~5 MB | ~25 MB |

---

## Cost Comparison

### Transaction Fees

| Operation | Efficiency Mode | Privacy Mode | Notes |
|-----------|----------------|--------------|-------|
| Deposit | ~0.000001 SOL | ~0.000005 SOL | Standard Solana fee |
| Transfer | ~0.000001 SOL | ~0.000005 SOL | Standard Solana fee |
| Withdrawal | ~0.000001 SOL | ~0.000005 SOL | Standard Solana fee |

**Key Insight**: Privacy mode uses standard Solana fees, while efficiency mode can be **5000x cheaper** due to ZK Compression.

### Monthly Cost Example

For 10,000 transactions/month:

```typescript
// Efficiency Mode
const costPerTx = 0.000001; // SOL
const monthlyTxs = 10000;
const monthlyCost = costPerTx * monthlyTxs;
console.log('Monthly cost:', monthlyCost, 'SOL'); // ~0.01 SOL

// Privacy Mode  
const costPerTx = 0.000005; // SOL
const monthlyTxs = 10000;
const monthlyCost = costPerTx * monthlyTxs;
console.log('Monthly cost:', monthlyCost, 'SOL'); // ~0.05 SOL
```

---

## Use Case Matrix

### Efficiency Mode Best For:

| Use Case | Why Efficiency Mode |
|----------|-------------------|
| 🎮 Gaming | High frequency, public transactions, cost critical |
| 🏦 DeFi | Public by nature, needs transparency |
| ⚡ High-Volume | Needs maximum throughput |
| 💰 Cost-Sensitive | Budget is primary concern |
| 🔄 Micropayments | Many small transactions |

### Privacy Mode Best For:

| Use Case | Why Privacy Mode |
|----------|-----------------|
| 💼 Payroll | Employee salary privacy |
| 🤝 Donations | Anonymous giving |
| 💵 OTC Trades | Large private transactions |
| 🏢 Corporate | Business finance privacy |
| 🔐 Compliance | Needs viewing keys |

---

## Code Examples

### Full Migration Example

```typescript
// old-efficiency-app.ts (before)
import { init, deposit, transfer, withdraw, getBalance } from 'ghost-sol';

await init({ wallet, cluster: 'devnet' });
await deposit(2);
const balance = await getBalance();
console.log('Balance:', balance / LAMPORTS_PER_SOL);
```

```typescript
// new-privacy-app.ts (after)
import { 
  init, 
  deposit, 
  transfer, 
  withdraw, 
  getBalance,
  decryptBalance,
  generateViewingKey 
} from 'ghost-sol';

await init({ 
  wallet, 
  cluster: 'devnet',
  privacy: { mode: 'privacy', enableViewingKeys: true }
});

await deposit(2);
const encrypted = await getBalance();
const balance = await decryptBalance();
console.log('Balance:', balance);

// New: Generate viewing key
const viewingKey = await generateViewingKey();
```

### Dual-Mode Support

Support both modes in the same app:

```typescript
import { init, deposit, getBalance, decryptBalance } from 'ghost-sol';

async function initSDK(usePrivacy: boolean) {
  await init({
    wallet,
    cluster: 'devnet',
    ...(usePrivacy && {
      privacy: { mode: 'privacy', enableViewingKeys: true }
    })
  });
}

async function getBalanceUniversal(usePrivacy: boolean) {
  if (usePrivacy) {
    return await decryptBalance();
  } else {
    const balance = await getBalance();
    return balance / LAMPORTS_PER_SOL;
  }
}

// Usage
await initSDK(userPreference.privacyMode);
const balance = await getBalanceUniversal(userPreference.privacyMode);
```

---

## Testing Your Migration

### Test Checklist

```typescript
async function runMigrationTests() {
  console.log('🧪 Running migration tests...\n');
  
  // Test 1: Initialization
  await init({
    wallet: testWallet,
    cluster: 'devnet',
    privacy: { mode: 'privacy' }
  });
  console.log('✅ 1. Initialization successful');
  
  // Test 2: Deposit
  const depositSig = await deposit(0.1);
  console.log('✅ 2. Deposit successful:', depositSig);
  
  // Test 3: Balance retrieval
  const encrypted = await getBalance();
  console.log('✅ 3. Encrypted balance retrieved:', encrypted.exists);
  
  // Test 4: Balance decryption
  const balance = await decryptBalance();
  console.log('✅ 4. Balance decrypted:', balance);
  
  // Test 5: Transfer
  const transferResult = await transfer(recipient, 0.05);
  console.log('✅ 5. Transfer successful:', transferResult.signature);
  
  // Test 6: Withdrawal
  const withdrawSig = await withdraw(0.04);
  console.log('✅ 6. Withdrawal successful:', withdrawSig);
  
  // Test 7: Viewing key (if enabled)
  try {
    const viewingKey = await generateViewingKey();
    console.log('✅ 7. Viewing key generated');
  } catch (e) {
    console.log('⚠️  7. Viewing keys not enabled');
  }
  
  console.log('\n🎉 All migration tests passed!');
}
```

### Performance Testing

```typescript
async function testPerformance() {
  const operations = [
    { name: 'Deposit', fn: () => deposit(0.1) },
    { name: 'Transfer', fn: () => transfer(recipient, 0.05) },
    { name: 'Withdraw', fn: () => withdraw(0.04) }
  ];
  
  for (const op of operations) {
    const start = Date.now();
    await op.fn();
    const duration = Date.now() - start;
    console.log(`${op.name}: ${duration}ms`);
  }
}
```

---

## Rollback Strategy

### Quick Rollback

If issues arise, rollback is simple:

```typescript
// From Privacy Mode back to Efficiency Mode
await init({
  wallet,
  cluster: 'devnet'
  // Remove privacy config to revert
});
```

### Gradual Rollback

```typescript
// Feature flag approach
const PRIVACY_MODE_ENABLED = process.env.PRIVACY_MODE === 'true';

await init({
  wallet,
  cluster: 'devnet',
  ...(PRIVACY_MODE_ENABLED && {
    privacy: { mode: 'privacy' }
  })
});

// Toggle via environment variable
// PRIVACY_MODE=false to rollback
```

### Zero-Downtime Migration

```typescript
// Blue-green deployment
async function initSDKWithFallback() {
  try {
    // Try privacy mode first
    await init({
      wallet,
      cluster: 'devnet',
      privacy: { mode: 'privacy' }
    });
    return 'privacy';
  } catch (error) {
    // Fallback to efficiency mode
    await init({ wallet, cluster: 'devnet' });
    return 'efficiency';
  }
}

const mode = await initSDKWithFallback();
console.log('Running in', mode, 'mode');
```

---

## Support & Resources

### Migration Help

- 📖 [Privacy Mode Guide](./PRIVACY_MODE_GUIDE.md)
- 🔧 [API Reference](./API.md)
- 💬 [Community Discord](https://discord.gg/ghostsol)
- 🐛 [Report Issues](https://github.com/ghostsol/ghostsol/issues)

### Need Help?

If you encounter issues during migration:

1. Check the [Troubleshooting section](./PRIVACY_MODE_GUIDE.md#troubleshooting)
2. Review [test examples](/sdk/test/privacy)
3. Open a GitHub issue with details
4. Reach out on Discord

---

**Happy Migrating!** 🚀
