# Privacy Architecture Design

## Overview

This document defines the technical architecture for implementing true transaction privacy in the Zera SDK, transforming it from a ZK Compression efficiency tool to a genuine privacy solution.

## Core Privacy Principles

### 1. **True Unlinkability**
- Sender addresses cannot be linked to recipient addresses
- Transaction amounts are encrypted and hidden
- Balance inquiries return encrypted data only

### 2. **Compliance-Ready**
- Viewing keys enable authorized access for auditors
- Selective disclosure for regulatory requirements
- Maintain privacy while meeting compliance needs

### 3. **Backward Compatibility**
- Efficiency mode (ZK Compression) remains available
- Developers can choose privacy vs cost optimization
- Smooth migration path from existing implementations

## Architecture Components

### Layer 1: Privacy Core (`sdk/src/privacy/`)

```
privacy/
├── index.ts                 # Main exports and public API
├── types.ts                 # TypeScript type definitions
├── errors.ts                # Privacy-specific error classes
├── zera-privacy.ts     # Main privacy class implementation
├── confidential-transfer.ts # SPL Token 2022 integration
├── encryption.ts            # Twisted ElGamal encryption utilities
├── viewing-keys.ts          # Compliance and auditing features
├── zk-circuits/            # Custom ZK circuit implementations
│   ├── deposit-circuit.ts
│   ├── transfer-circuit.ts
│   └── withdraw-circuit.ts
└── privacy-pools/          # Advanced mixing functionality
    ├── pool-manager.ts
    ├── nullifier-tree.ts
    └── anonymity-set.ts
```

### Layer 2: Dual-Mode SDK (`sdk/src/core/`)

```typescript
// Updated Zera class supports both modes
class Zera {
  private privacyMode?: ZeraPrivacy;
  private efficiencyMode?: ZeraCompression; // Current implementation
  
  async init(config: ZeraConfig) {
    if (config.privacy?.mode === 'privacy') {
      this.privacyMode = new ZeraPrivacy();
      await this.privacyMode.init(this.connection, this.wallet, config.privacy);
    } else {
      // Default to efficiency mode (current ZK Compression)
      this.efficiencyMode = new ZeraCompression();
      // ... existing initialization
    }
  }
}
```

### Layer 3: Protocol Integration (`sdk/src/protocols/`)

```
protocols/
├── spl-confidential/       # SPL Token 2022 Confidential Transfers
├── custom-circuits/        # Custom ZK implementations using Solana syscalls
├── light-privacy/          # Light Protocol privacy features (if available)
└── external-integrations/  # Third-party privacy protocol integrations
```

## Privacy Implementation Strategies

### Strategy 1: SPL Token 2022 Confidential Transfers (Phase 1)

#### Technical Implementation
```typescript
interface ConfidentialTransferStrategy {
  // Account Management
  createConfidentialMint(): Promise<PublicKey>;
  createConfidentialAccount(mint: PublicKey): Promise<PublicKey>;
  
  // Encrypted Operations
  encryptedDeposit(amount: bigint): Promise<string>;
  privateTransfer(recipient: PublicKey, amount: bigint): Promise<string>;
  encryptedWithdraw(amount: bigint): Promise<string>;
  
  // Balance Management
  getEncryptedBalance(): Promise<EncryptedBalance>;
  decryptBalance(viewingKey?: ViewingKey): Promise<number>;
}
```

#### Privacy Guarantees
- ✅ **Balance Privacy**: Encrypted using Twisted ElGamal
- ✅ **Amount Privacy**: Transfer amounts hidden via commitments
- ✅ **Compliance**: Viewing keys for authorized access
- ❌ **Unlinkability**: Sender/recipient still linked (address reuse)

#### Implementation Details
```typescript
// Encryption flow
const encryptedAmount = await encryptionUtils.encryptAmount(
  amount,
  recipientPublicKey
);

// Generate ZK proof of validity
const proof = await generateRangeProof(amount, encryptedAmount);

// Execute confidential transfer
const signature = await confidentialTransferManager.transfer(
  fromAccount,
  toAccount, 
  encryptedAmount,
  proof
);
```

### Strategy 2: Custom Privacy Pools with ZK Circuits (Phase 2)

#### Technical Implementation
```typescript
interface PrivacyPoolStrategy {
  // Pool Management
  createPrivacyPool(denomination: bigint): Promise<PublicKey>;
  
  // Anonymizing Operations
  deposit(amount: bigint): Promise<{ commitment: string, nullifier: string }>;
  withdraw(proof: ZKProof, recipient: PublicKey): Promise<string>;
  
  // Advanced Features
  generateStealthAddress(): Promise<{ address: PublicKey, viewKey: Uint8Array }>;
  mixTransactions(inputs: MixingInput[]): Promise<MixingResult>;
}
```

#### Privacy Guarantees
- ✅ **Full Unlinkability**: Sender/recipient cannot be linked
- ✅ **Amount Privacy**: Hidden in mixing pools
- ✅ **Anonymity Sets**: Configurable anonymity levels
- ✅ **Native SOL Support**: Not limited to SPL tokens
- ❌ **Compliance**: Harder to audit (requires careful design)

#### ZK Circuit Architecture
```typescript
// Deposit Circuit
circuit DepositCircuit(denomination) {
  private input: secret, nullifier
  public input: commitment
  
  // Verify commitment = hash(secret, nullifier)
  commitment === poseidonHash(secret, nullifier)
  
  // Verify denomination matches
  secret === denomination
}

// Withdrawal Circuit  
circuit WithdrawCircuit(merkleRoot) {
  private input: secret, nullifier, path
  public input: merkleRoot, nullifierHash, recipient
  
  // Verify commitment is in merkle tree
  verifyMerkleProof(poseidonHash(secret, nullifier), path, merkleRoot)
  
  // Verify nullifier
  nullifierHash === poseidonHash(nullifier)
}
```

#### Nullifier Management
```typescript
class NullifierTree {
  private nullifiers: Set<string> = new Set();
  
  async addNullifier(nullifierHash: string): Promise<void> {
    if (this.nullifiers.has(nullifierHash)) {
      throw new Error('Double spending detected');
    }
    this.nullifiers.add(nullifierHash);
  }
  
  isNullifierUsed(nullifierHash: string): boolean {
    return this.nullifiers.has(nullifierHash);
  }
}
```

## API Design

### Privacy-First Interface
```typescript
// Initialize with privacy mode
await ghostSol.init({
  wallet: keypair,
  cluster: 'devnet',
  privacy: {
    mode: 'privacy',           // vs 'efficiency'
    strategy: 'confidential',  // vs 'mixing'
    enableViewingKeys: true,
    anonymitySetSize: 100      // for mixing strategy
  }
});

// Privacy operations (encrypted by default)
await ghostSol.deposit(1.5);                    // Shield 1.5 SOL
await ghostSol.privateTransfer(recipient, 0.5); // Private transfer
await ghostSol.withdraw(1.0);                   // Unshield 1.0 SOL

// Balance operations (return encrypted data)
const encryptedBalance = await ghostSol.getEncryptedBalance();
const actualBalance = await ghostSol.decryptBalance(); // Owner only
```

### Compliance Interface
```typescript
// Generate viewing key for auditors
const viewingKey = await ghostSol.generateViewingKey({
  permissions: {
    canViewBalances: true,
    canViewAmounts: true,
    allowedAccounts: [userAccount]
  },
  expirationDays: 30
});

// Auditor can decrypt with viewing key
const auditBalance = await ghostSol.decryptBalance(viewingKey);
const auditAmount = await ghostSol.decryptTransactionAmount(txSig, viewingKey);
```

### Dual-Mode Interface (Backward Compatible)
```typescript
// Efficiency mode (existing functionality)
await ghostSol.init({ wallet: keypair, cluster: 'devnet' }); // Default efficiency
await ghostSol.compress(1.0);   // ZK Compression for cost savings
await ghostSol.transfer(0.5);   // Compressed transfer (visible amounts)

// Privacy mode (new functionality)  
await ghostSol.init({ 
  wallet: keypair, 
  privacy: { mode: 'privacy' } 
});
await ghostSol.deposit(1.0);    // Encrypted deposit (hidden amounts)
await ghostSol.privateTransfer(0.5); // Private transfer (unlinkable)
```

## Security Considerations

### Cryptographic Security
- **Encryption**: Twisted ElGamal over curve25519 (SPL Token 2022 standard)
- **Commitments**: Pedersen commitments for amount hiding
- **Proofs**: Groth16 zk-SNARKs for efficient verification
- **Hashing**: Poseidon for ZK-friendly operations

### Privacy Analysis
- **Confidential Transfers**: Hides amounts, preserves address linkability
- **Privacy Pools**: Breaks address linkability via mixing
- **Viewing Keys**: Selective disclosure for compliance without breaking privacy
- **Anonymity Sets**: Configurable privacy levels (100, 1000, 10000 participants)

### Attack Resistance
- **Double Spending**: Prevented by nullifier tracking
- **Front Running**: Mitigated by commitment-reveal schemes
- **Timing Analysis**: Protected by batched operations
- **Amount Analysis**: Range proofs prevent invalid amounts

## Implementation Roadmap

### Week 1-2: Foundation
- [x] Complete research and architecture design
- [x] Build privacy module structure
- [x] Implement basic encryption utilities
- [ ] Add SPL Token 2022 dependencies
- [ ] Create confidential transfer manager

### Week 3-4: Core Privacy
- [ ] Implement SPL confidential transfers
- [ ] Add viewing key functionality
- [ ] Build encrypted balance management
- [ ] Create compliance features

### Week 5-6: Advanced Features
- [ ] Design custom ZK circuits
- [ ] Implement privacy pools
- [ ] Add nullifier management
- [ ] Build mixing functionality

### Week 7-8: Integration & Testing
- [ ] Integrate with main SDK
- [ ] Update React components
- [ ] Build comprehensive test suite
- [ ] Create migration documentation

## Success Metrics

### Technical Metrics
- **Privacy**: 100% encrypted balances and amounts
- **Performance**: <5 second proof generation time
- **Compatibility**: Support for both privacy and efficiency modes
- **Compliance**: Full viewing key functionality

### User Experience Metrics
- **API Simplicity**: Maintain 3-line interface
- **Migration**: Zero breaking changes for efficiency mode users
- **Documentation**: Complete guides for privacy features
- **Developer Adoption**: Positive feedback on privacy utilities

This architecture provides the foundation for transforming Zera from an efficiency tool to a true privacy solution while maintaining backward compatibility and regulatory compliance.
