# Privacy Cash Quick Reference Guide

**Quick comparison guide for developers**

---

## At-a-Glance Comparison

```
┌────────────────────────────────────────────────────────────────┐
│                  Privacy Cash vs GhostSol                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  PRIVACY CASH          │  GHOSTSOL                             │
│  ─────────────         │  ────────                             │
│  Prod-ready ✓          │  Prototype                            │
│  Slow UX               │  Fast UX ✓                            │
│  Strong privacy ✓      │  Unknown privacy                      │
│  High complexity       │  Simple ✓                             │
│  Own infrastructure    │  Light Protocol ✓                     │
│  4 audits ✓            │  Not audited                          │
│  ~500KB bundle         │  ~200KB bundle ✓                      │
│  Client proving        │  Off-chain proving ✓                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Key Metrics

### Performance

| Metric | Privacy Cash | GhostSol |
|--------|-------------|----------|
| **Deposit Time** | 15-20s | 10s |
| **Proof Generation** | 5-10s (client) | <1s (server) |
| **Bundle Size** | 500KB | 200KB |
| **Mobile Support** | Slow | Fast |

### Privacy

| Feature | Privacy Cash | GhostSol |
|---------|-------------|----------|
| **Transaction Privacy** | ✅ Strong | ❓ Unknown |
| **Amount Privacy** | ❌ Weak | ❓ Unknown |
| **Anonymity Set** | All users | All compressed |
| **Proven Model** | ✅ Yes | ❌ No |

### Economics

| Item | Privacy Cash | GhostSol |
|------|-------------|----------|
| **Deposit Fee** | 0% + 0.005 SOL | ~0.005 SOL |
| **Withdraw Fee** | 0.25% + 0.005 SOL | ~0.005 SOL |
| **Total Cost (1 SOL)** | 1.25% | 1.5% (est) |

---

## Architecture Cheat Sheet

### Privacy Cash Stack

```
┌─────────────────────────────────────────┐
│ Browser Client                          │
│ ┌─────────────────────────────────┐     │
│ │ SDK (TypeScript)                │     │
│ │ - UTXO management               │     │
│ │ - Proof generation (snarkjs)    │     │
│ │ - Encryption                    │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Backend Services                        │
│ ┌────────────────┐  ┌─────────────┐    │
│ │ Indexer        │  │ Relayer     │    │
│ │ - UTXO index   │  │ - Tx submit │    │
│ │ - API          │  │ - Fee payer │    │
│ └────────────────┘  └─────────────┘    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Solana Blockchain                       │
│ ┌─────────────────────────────────┐     │
│ │ Custom Anchor Program           │     │
│ │ - Groth16 verifier              │     │
│ │ - Merkle tree (26 levels)       │     │
│ │ - Nullifier PDAs                │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### GhostSol Stack

```
┌─────────────────────────────────────────┐
│ Browser Client                          │
│ ┌─────────────────────────────────┐     │
│ │ SDK (TypeScript)                │     │
│ │ - Simple API wrapper            │     │
│ │ - Balance queries               │     │
│ │ - Tx building                   │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Light Protocol (Third-party)            │
│ ┌─────────────────────────────────┐     │
│ │ ZK Compression                  │     │
│ │ - Proof generation              │     │
│ │ - State trees                   │     │
│ │ - RPC interface                 │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Solana Blockchain                       │
│ ┌─────────────────────────────────┐     │
│ │ Light Protocol Programs         │     │
│ │ - Compressed accounts           │     │
│ │ - State verification            │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

---

## Code Comparison

### Privacy Cash SDK

```typescript
import { deposit, withdraw, getPrivateBalance } from 'privacy-cash-sdk';

// Initialize (derives encryption key from wallet)
const encryptionService = new EncryptionService();
encryptionService.deriveEncryptionKeyFromWallet(wallet);

// Deposit (user pays fees)
await deposit({
  publicKey: wallet.publicKey,
  connection,
  amount_in_lamports: 1_000_000_000, // 1 SOL
  storage: localStorage,
  encryptionService,
  keyBasePath: '/path/to/circuit/keys',
  lightWasm,
  transactionSigner: async (tx) => wallet.signTransaction(tx)
});

// Check balance (scans encrypted UTXOs)
const balance = await getPrivateBalance({
  publicKey: wallet.publicKey,
  connection,
  encryptionService,
  storage: localStorage
});

// Withdraw (relayer pays fees)
await withdraw({
  recipient: new PublicKey('...'),
  lightWasm,
  storage: localStorage,
  publicKey: wallet.publicKey,
  connection,
  amount_in_lamports: 500_000_000, // 0.5 SOL
  encryptionService,
  keyBasePath: '/path/to/circuit/keys'
});
```

### GhostSol SDK

```typescript
import { GhostSol } from '@your-org/ghostsol-sdk';

// Initialize
const ghostSol = new GhostSol();
await ghostSol.init({
  wallet,
  cluster: 'devnet',
  rpcUrl: 'https://...'
});

// Compress (shield)
await ghostSol.compress(1_000_000_000); // 1 SOL

// Check balance
const balance = await ghostSol.getBalance();

// Transfer (private)
await ghostSol.transfer(
  'recipient-address',
  500_000_000 // 0.5 SOL
);

// Decompress (unshield)
await ghostSol.decompress(500_000_000);
```

**Winner: GhostSol** (much simpler API)

---

## Privacy Model Comparison

### Privacy Cash: Commitment-Nullifier

```
Deposit:
  User → [Commitment] → Merkle Tree
  
  Commitment = Hash(amount, pubkey, blinding, mint)
  - Amount: visible
  - Pubkey: hidden (ZK proof shows ownership)
  - Blinding: random, hidden
  - Mint: token type
  
Withdraw:
  Merkle Tree → [ZK Proof] → Recipient
  
  Nullifier = Hash(commitment, index, signature)
  - Prevents double-spend
  - No link to deposit
  - Anonymous recipient
  
Privacy Properties:
  ✅ Breaks deposit → withdraw link
  ✅ Hides sender identity
  ✅ Hides recipient identity  
  ❌ Amount visible
  ❌ Timing correlations possible
```

### GhostSol: ZK Compression

```
Compress:
  User → [Compressed Account] → State Tree
  
  (Details depend on Light Protocol)
  
Transfer:
  State Tree → [ZK Proof] → State Tree
  
  (Details depend on Light Protocol)
  
Privacy Properties:
  ❓ Unknown - needs research
  ❓ Transaction linkability?
  ❓ Amount privacy?
  ❓ Timing privacy?
```

---

## When to Use Which?

### Use Privacy Cash If:

- ✅ **Maximum privacy required**
  - High-value transactions
  - Maximum anonymity needed
  - Proven privacy model required

- ✅ **Full control needed**
  - Want to customize everything
  - Need specific privacy features
  - Building on top of protocol

- ✅ **Production-ready solution**
  - Launching immediately
  - Need audited code
  - Can't wait for development

### Use GhostSol If:

- ✅ **Speed matters**
  - Mobile-first application
  - Real-time transfers needed
  - User experience critical

- ✅ **Simplicity preferred**
  - Easy integration required
  - Small bundle size needed
  - Less maintenance wanted

- ✅ **Light Protocol believer**
  - Trust Light's roadmap
  - Want ecosystem benefits
  - Okay with dependencies

---

## Migration Path

### From Privacy Cash to GhostSol

**Not possible** - different accounting models (UTXO vs Account)

**Workaround:**
1. Withdraw from Privacy Cash to regular wallet
2. Compress into GhostSol

### From GhostSol to Privacy Cash

**Not possible** - same issue

**Workaround:**
1. Decompress from GhostSol to regular wallet
2. Deposit into Privacy Cash

### Future: Bridge Protocol

Could build a bridge that:
- Accepts Privacy Cash withdrawal
- Immediately compresses into GhostSol
- Single transaction from user perspective
- Requires coordination between protocols

---

## Key Technical Decisions

### Privacy Cash Chose:

| Decision | Choice | Reason |
|----------|--------|--------|
| **Accounting** | UTXO | Better privacy |
| **Proof System** | Groth16 | Small proofs |
| **Proving** | Client-side | Decentralization |
| **Hash** | Poseidon | ZK-friendly |
| **Tree** | Sparse Merkle | Efficient updates |
| **Storage** | On-chain | Trustless |
| **Indexer** | Centralized | UX |

### GhostSol Chose:

| Decision | Choice | Reason |
|----------|--------|--------|
| **Accounting** | Compressed Accounts | Light Protocol |
| **Proof System** | Light's choice | Dependency |
| **Proving** | Off-chain | Speed |
| **Hash** | Light's choice | Dependency |
| **Tree** | Light's trees | Dependency |
| **Storage** | Compressed | Efficiency |
| **Indexer** | Light's infra | Simplicity |

---

## Integration Examples

### Privacy Cash Integration

```typescript
// In your dApp
import { deposit, withdraw } from 'privacy-cash-sdk';

class MyDApp {
  async shieldFunds(amount: number) {
    // Show loading (5-10s)
    this.showLoading("Generating proof...");
    
    try {
      const result = await deposit({
        amount_in_lamports: amount,
        // ... other params
      });
      
      this.showSuccess("Funds shielded!");
    } catch (error) {
      this.showError(error.message);
    }
  }
  
  async unshieldFunds(amount: number, recipient: string) {
    this.showLoading("Generating proof...");
    
    const result = await withdraw({
      amount_in_lamports: amount,
      recipient: new PublicKey(recipient),
      // ... other params
    });
    
    this.showSuccess("Funds withdrawn!");
  }
}
```

### GhostSol Integration

```typescript
// In your dApp
import { GhostSol } from '@your-org/ghostsol-sdk';

class MyDApp {
  ghostSol = new GhostSol();
  
  async initialize() {
    await this.ghostSol.init({
      wallet: this.wallet,
      cluster: 'mainnet'
    });
  }
  
  async shieldFunds(amount: number) {
    // Fast operation
    this.showLoading("Processing...");
    
    const signature = await this.ghostSol.compress(amount);
    this.showSuccess("Funds shielded!");
  }
  
  async unshieldFunds(amount: number) {
    const signature = await this.ghostSol.decompress(amount);
    this.showSuccess("Funds withdrawn!");
  }
}
```

---

## Common Questions

### Q: Which is more private?

**A:** Privacy Cash has proven privacy model. GhostSol's privacy depends on Light Protocol (unknown).

### Q: Which is faster?

**A:** GhostSol is 2-3x faster due to off-chain proving.

### Q: Which is cheaper?

**A:** Similar costs (~1-1.5% for deposit+withdraw cycle).

### Q: Which is more decentralized?

**A:** Both have centralized components (indexer/relayer). Tie.

### Q: Which should I use?

**A:** Privacy Cash for maximum privacy NOW. GhostSol for speed and simplicity, IF Light Protocol provides adequate privacy.

### Q: Can I use both?

**A:** Yes, but no direct bridge between them. Users must exit one and enter the other.

### Q: Is Privacy Cash safe?

**A:** 4 audits, live on mainnet, no exploits reported. Appears safe.

### Q: Is GhostSol safe?

**A:** Depends on Light Protocol's security. Not yet audited.

---

## Resource Links

### Privacy Cash
- Main Repo: https://github.com/Privacy-Cash/privacy-cash
- SDK Repo: https://github.com/Privacy-Cash/privacy-cash-sdk
- NPM: `privacy-cash-sdk`
- Program: `9fhQBbumKEFuXtMBDw8AaQyAjCorLGJQiS3skWZdQyQD`

### GhostSol
- Main Repo: (your repo)
- SDK: `@your-org/ghostsol-sdk`
- Docs: `/workspace/docs`

### Light Protocol
- Website: https://lightprotocol.com
- Docs: https://docs.lightprotocol.com
- GitHub: https://github.com/Lightprotocol

---

## Next Steps

1. ✅ Read full analysis: `privacy-cash-analysis.md`
2. ⚠️ Research Light Protocol privacy model
3. 📝 Decide: Light-only, Privacy Cash fork, or hybrid?
4. 🚀 Implement chosen approach
5. 🔒 Get audits before mainnet

---

**Last Updated**: 2025-10-31  
**See Also**: `privacy-cash-analysis.md` for comprehensive comparison
