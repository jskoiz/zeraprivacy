# Linear Issue Templates for GhostSOL Privacy Implementation
## Copy-paste these into Linear for each feature branch

**Total Issues**: 15  
**Recommended Labels**: `privacy`, `phase-1`, `phase-2`, `phase-3`, `phase-4`, `enhancement`  
**Project**: GhostSOL Privacy Implementation  

---

## PHASE 1: Core Privacy (Issues 1-7)

### Issue 1/15: Implement Encryption Utils Foundation

**Title**: `[1/15] Implement Encryption Utils Foundation`

**Labels**: `phase-1`, `privacy`, `core`, `week-1`

**Description**:
```markdown
## Objective
Implement the foundational encryption utilities for privacy mode using Twisted ElGamal encryption and Pedersen commitments. This is the base layer that all other privacy features depend on.

## Branch
`feature/1-of-15-encryption-utils-foundation`

## Dependencies
- ✅ None - START HERE

## What to Build

### 1. Create `sdk/src/privacy/encryption.ts`
Implement the following classes and functions:

**ElGamalEncryption class:**
- `generateKeypair()` - Generate ElGamal keypair for encryption
- `encrypt(amount: bigint, publicKey: ElGamalPublicKey)` - Encrypt amount using Twisted ElGamal
- `decrypt(ciphertext: ElGamalCiphertext, secretKey: ElGamalSecretKey)` - Decrypt ciphertext
- `serializePublicKey()` / `deserializePublicKey()` - Key serialization

**PedersenCommitment class:**
- `generateCommitment(amount: bigint, blindingFactor: Scalar)` - Create Pedersen commitment
- `verifyCommitment()` - Verify commitment is valid
- `addCommitments()` - Homomorphic addition of commitments

**Utilities:**
- `generateRandomScalar()` - Generate cryptographically secure random scalar
- `validateAmount()` - Ensure amount is within valid range (0 to 2^64)

### 2. Create `sdk/test/privacy/encryption.test.ts`
Write comprehensive unit tests:
- ✅ Test keypair generation produces valid keys
- ✅ Test encrypt/decrypt round-trip (encrypt then decrypt = original)
- ✅ Test commitment generation and verification
- ✅ Test homomorphic properties (commitment addition)
- ✅ Test edge cases (zero amount, max amount, invalid inputs)
- ✅ Achieve >95% code coverage

## Technical Requirements

**Use Official Libraries:**
```typescript
import {
  ElGamalKeypair,
  ElGamalSecretKey,
  ElGamalPublicKey,
  ElGamalCiphertext
} from '@solana/spl-token';
```

**DO NOT implement crypto primitives from scratch** - use official SPL Token 2022 implementations.

## Success Criteria
- [ ] All encryption utilities implemented and tested
- [ ] Unit tests pass with >95% coverage
- [ ] No custom cryptography (use official libraries)
- [ ] Code follows TypeScript best practices
- [ ] JSDoc comments on all public methods
- [ ] Encryption/decryption round-trip works correctly
- [ ] Performance: Encrypt/decrypt <100ms per operation

## Reference Documentation
- `/workspace/docs/research/confidential-transfers.md` (lines 54-99: Twisted ElGamal)
- `/workspace/docs/research/confidential-transfers.md` (lines 22-52: Pedersen Commitments)
- `/workspace/QUICK_START_GUIDE_FOR_TEAM.md` (Week 1 checklist)
- SPL Token 2022 Docs: https://spl.solana.com/token-2022/extensions

## Time Estimate
3 days (Week 1, Days 1-3)

## Notes
- This is the foundation - all other privacy features depend on this
- Focus on correctness over optimization (optimize later if needed)
- Test thoroughly - encryption bugs are critical security issues
```

---

### Issue 2/15: Implement Confidential Transfer Manager

**Title**: `[2/15] Implement Confidential Transfer Manager`

**Labels**: `phase-1`, `privacy`, `core`, `week-1`

**Description**:
```markdown
## Objective
Implement the Confidential Transfer Manager that integrates with SPL Token 2022 to create confidential mints and accounts. This enables encrypted balances on Solana.

## Branch
`feature/2-of-15-confidential-transfer-manager`

## Dependencies
- ✅ Issue [1/15] MUST be merged first (requires encryption utilities)
- ⚠️ DO NOT start until encryption.ts is complete and merged

## What to Build

### 1. Create `sdk/src/privacy/confidential-transfer.ts`
Implement the ConfidentialTransferManager class:

**Core Methods:**
```typescript
class ConfidentialTransferManager {
  constructor(connection: Connection, wallet: WalletAdapter)
  
  // Mint Operations
  async createConfidentialMint(): Promise<PublicKey>
  async getOrCreateConfidentialMint(): Promise<PublicKey>
  
  // Account Operations
  async createConfidentialAccount(mint: PublicKey): Promise<PublicKey>
  async configureAccountForConfidentialTransfers(account: PublicKey): Promise<string>
  
  // Balance Operations
  async applyPendingBalance(account: PublicKey): Promise<string>
  async getConfidentialAccountInfo(account: PublicKey): Promise<ConfidentialAccountInfo>
}
```

**Implementation Details:**
- Use `TOKEN_2022_PROGRAM_ID` not standard token program
- Enable `ExtensionType.ConfidentialTransferMint` on mint creation
- Configure ElGamal encryption keys on account setup
- Handle pending balance credits properly

### 2. Create `sdk/test/privacy/confidential-transfer.test.ts`
Write integration tests (requires devnet):
- ✅ Test creating confidential mint with extension
- ✅ Test creating confidential account
- ✅ Test account configuration
- ✅ Test pending balance application
- ✅ Verify encrypted balance storage on-chain

## Technical Requirements

**Use SPL Token 2022:**
```typescript
import {
  TOKEN_2022_PROGRAM_ID,
  createMint,
  createAccount,
  ExtensionType,
  getAccountInfo
} from '@solana/spl-token';
```

**Import from Issue 1:**
```typescript
import { ElGamalEncryption } from './encryption';
```

## Success Criteria
- [ ] Can create confidential mint on devnet
- [ ] Can create confidential account with encrypted balance
- [ ] Account configuration enables encrypted transfers
- [ ] Pending balance application works
- [ ] Integration tests pass on devnet
- [ ] Balance shows as encrypted in Solana explorer
- [ ] Code is well-documented with JSDoc

## Reference Documentation
- `/workspace/docs/research/confidential-transfers.md` (lines 150-242: Account Structure & Transaction Flow)
- `/workspace/docs/research/confidential-transfers.md` (lines 595-628: Reusable Components)
- SPL Token 2022 Extensions: https://spl.solana.com/token-2022/extensions#confidential-transfers

## Testing Notes
- Use devnet for testing (not localhost)
- Fund test accounts with SOL before testing
- Verify encrypted balances in Solana Explorer to confirm working
- Save mint and account addresses for debugging

## Time Estimate
2-3 days (Week 1, Days 3-5)

## Notes
- This builds on Issue 1 - ensure encryption utilities work first
- Focus on mint/account creation, not transfers yet (that's Issue 3-5)
- Test on devnet early and often
```

---

### Issue 3/15: Implement Encrypted Deposit Operation

**Title**: `[3/15] Implement Encrypted Deposit Operation`

**Labels**: `phase-1`, `privacy`, `operations`, `week-2`

**Description**:
```markdown
## Objective
Implement the encrypted deposit operation that allows users to shield SOL into a confidential balance. This is the "on-ramp" to privacy mode.

## Branch
`feature/3-of-15-encrypted-deposit-operation`

## Dependencies
- ✅ Issue [1/15] MUST be merged (encryption utilities)
- ✅ Issue [2/15] MUST be merged (confidential transfer manager)
- ⚠️ DO NOT start until both are complete

## What to Build

### 1. Update `sdk/src/privacy/ghost-sol-privacy.ts`
Implement the `encryptedDeposit()` method:

```typescript
class GhostSolPrivacy {
  async encryptedDeposit(amountLamports: number): Promise<string> {
    // 1. Get or create confidential account
    // 2. Encrypt the deposit amount
    // 3. Generate range proof (0 ≤ amount < 2^64)
    // 4. Create deposit instruction with encrypted amount
    // 5. Submit transaction
    // 6. Apply pending balance
    // 7. Return transaction signature
  }
  
  private async generateDepositProof(amount: bigint): Promise<DepositProof>
  private async submitDepositTransaction(proof: DepositProof): Promise<string>
}
```

**Key Implementation Steps:**
1. Use ConfidentialTransferManager from Issue 2
2. Use ElGamalEncryption from Issue 1
3. Generate range proof to prevent negative balances
4. Encrypt amount for user's ElGamal public key
5. Submit to TOKEN_2022_PROGRAM_ID
6. Apply pending balance (required step!)

### 2. Create `sdk/test/privacy/deposit.test.ts`
Write integration tests:
- ✅ Test deposit with valid amount
- ✅ Test deposit updates encrypted balance
- ✅ Verify balance is encrypted on-chain (check explorer)
- ✅ Test edge cases (zero amount, max amount)
- ✅ Test proof generation is <5 seconds
- ✅ Test pending balance is applied correctly

## Technical Requirements

**Proof Generation:**
```typescript
import {
  generateDepositProof,
  DepositProofData
} from '@solana/spl-token';
```

**Performance Target:**
- Proof generation MUST be <5 seconds
- If slower, investigate and optimize

## Success Criteria
- [ ] Can deposit SOL and encrypt balance
- [ ] Encrypted balance visible on-chain
- [ ] Proof generation <5 seconds
- [ ] Transaction succeeds on devnet
- [ ] Pending balance applied automatically
- [ ] Integration tests pass
- [ ] Error handling for common failures

## Reference Documentation
- `/workspace/docs/research/confidential-transfers.md` (lines 182-242: Transaction Flow)
- `/workspace/docs/research/syscalls-zk.md` (lines 117-148: Range Proofs)
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 1, Week 2)

## Testing Strategy
1. Create test account with SOL
2. Call encryptedDeposit(0.1 SOL)
3. Check encrypted balance exists
4. Verify in Solana Explorer balance is encrypted
5. Measure proof generation time

## Time Estimate
2 days (Week 2, Days 1-2)

## Notes
- This is the first "write" operation - test thoroughly
- Proof generation time is critical for UX
- Make sure pending balance is applied (common mistake)
```

---

### Issue 4/15: Implement Private Transfer Operation

**Title**: `[4/15] Implement Private Transfer Operation`

**Labels**: `phase-1`, `privacy`, `operations`, `week-2`

**Description**:
```markdown
## Objective
Implement private transfer operation that allows encrypted transfers between confidential accounts. This is the core privacy feature - transfers with hidden amounts.

## Branch
`feature/4-of-15-private-transfer-operation`

## Dependencies
- ✅ Issue [1/15] MUST be merged (encryption)
- ✅ Issue [2/15] MUST be merged (confidential transfer manager)
- ✅ Issue [3/15] MUST be merged (deposit operation)
- ⚠️ DO NOT start until deposit is working

## What to Build

### 1. Update `sdk/src/privacy/ghost-sol-privacy.ts`
Implement the `privateTransfer()` method:

```typescript
class GhostSolPrivacy {
  async privateTransfer(
    recipientAddress: string,
    amountLamports: number
  ): Promise<PrivateTransferResult> {
    // 1. Validate recipient has confidential account
    // 2. Get sender's encrypted balance
    // 3. Generate transfer proof (balance validity + range proof)
    // 4. Encrypt amount for:
    //    - Sender (new balance)
    //    - Recipient (transfer amount)
    //    - Auditor (if configured)
    // 5. Create confidential transfer instruction
    // 6. Submit transaction
    // 7. Return signature + encrypted amount + proof
  }
  
  private async generateTransferProof(
    amount: bigint,
    senderBalance: EncryptedBalance,
    recipientPubKey: PublicKey
  ): Promise<TransferProof>
}
```

**Critical Implementation:**
- Transfer proof shows: `oldBalance - amount = newBalance` (without revealing amounts)
- Range proof shows: `0 ≤ amount < 2^64` (prevents negative)
- Encrypt for 3 parties: sender, recipient, auditor
- Recipient must apply pending balance to see transfer

### 2. Create `sdk/test/privacy/transfer.test.ts`
Write integration tests with TWO accounts:
- ✅ Test Alice deposits 1 SOL (encrypted)
- ✅ Test Alice transfers 0.5 SOL to Bob (private)
- ✅ Test Bob's pending balance shows transfer
- ✅ Test Bob applies pending balance
- ✅ Test Alice's balance updated (0.5 SOL encrypted)
- ✅ Verify amounts hidden on-chain (check explorer)
- ✅ Test proof generation <5 seconds

## Technical Requirements

**Transfer Proof Generation:**
```typescript
import {
  generateTransferProof,
  TransferProofData
} from '@solana/spl-token';
```

**Triple Encryption:**
```typescript
const transferData = {
  newSourceBalance: encryptForSender(newBalance, senderKey),
  transferAmount: encryptForRecipient(amount, recipientKey),
  auditAmount: encryptForAuditor(amount, auditorKey) // optional
};
```

## Success Criteria
- [ ] Can transfer between two confidential accounts
- [ ] Amount is hidden on-chain (verify in explorer)
- [ ] Recipient receives encrypted balance
- [ ] Sender's balance decreases correctly
- [ ] Proof generation <5 seconds
- [ ] Integration test: Alice → Bob works
- [ ] Error handling for insufficient balance
- [ ] Error handling for invalid recipient

## Reference Documentation
- `/workspace/docs/research/confidential-transfers.md` (lines 209-242: Transfer Flow)
- `/workspace/docs/research/confidential-transfers.md` (lines 101-148: Proofs)
- `/workspace/docs/research/confidential-transfers.md` (lines 256-305: Viewing Keys/Auditor)

## Testing Strategy
**Two-Account Test Flow:**
1. Create Alice and Bob test accounts
2. Alice deposits 1 SOL (encrypted)
3. Alice transfers 0.5 SOL to Bob
4. Bob checks pending balance (should show 0.5 SOL encrypted)
5. Bob applies pending balance
6. Verify: Alice has 0.5 SOL, Bob has 0.5 SOL (both encrypted)
7. Check Solana Explorer: amounts should NOT be visible

## Time Estimate
2 days (Week 2, Days 3-4)

## Notes
- This is THE core privacy feature - test extensively
- Recipient MUST apply pending balance (document this)
- Triple encryption is critical for viewing key compliance
```

---

### Issue 5/15: Implement Encrypted Withdraw Operation

**Title**: `[5/15] Implement Encrypted Withdraw Operation`

**Labels**: `phase-1`, `privacy`, `operations`, `week-2`

**Description**:
```markdown
## Objective
Implement encrypted withdrawal operation that allows users to unshield from confidential balance back to regular SOL. This is the "off-ramp" from privacy mode.

## Branch
`feature/5-of-15-encrypted-withdraw-operation`

## Dependencies
- ✅ Issues [1/15] through [4/15] MUST be merged
- ⚠️ DO NOT start until deposit and transfer are working

## What to Build

### 1. Update `sdk/src/privacy/ghost-sol-privacy.ts`
Implement the `encryptedWithdraw()` method:

```typescript
class GhostSolPrivacy {
  async encryptedWithdraw(
    amountLamports: number,
    destination?: PublicKey
  ): Promise<string> {
    // 1. Get encrypted balance
    // 2. Decrypt balance to verify sufficient funds
    // 3. Generate withdrawal proof
    // 4. Create withdraw instruction (encrypted → regular balance)
    // 5. Submit transaction
    // 6. Return signature
  }
  
  private async generateWithdrawProof(
    amount: bigint,
    encryptedBalance: EncryptedBalance
  ): Promise<WithdrawProof>
  
  private async verifyWithdrawAmount(
    amount: bigint,
    balance: EncryptedBalance
  ): Promise<boolean>
}
```

**Key Implementation Steps:**
1. Decrypt user's encrypted balance (to verify sufficient funds)
2. Generate withdrawal proof (proves balance ≥ amount)
3. Move from encrypted balance → available balance
4. Destination defaults to user's wallet if not specified
5. Optional: Close confidential account if balance becomes zero

### 2. Create `sdk/test/privacy/withdraw.test.ts`
Write integration tests:
- ✅ Test withdraw from encrypted balance
- ✅ Test funds appear in regular SOL balance
- ✅ Test encrypted balance decreases correctly
- ✅ Test withdraw all (balance becomes zero)
- ✅ Test withdraw to different destination address
- ✅ Test error: insufficient encrypted balance
- ✅ Test proof generation <5 seconds

## Technical Requirements

**Withdraw Proof:**
```typescript
import {
  generateWithdrawProof,
  WithdrawProofData
} from '@solana/spl-token';
```

**Balance Decryption:**
```typescript
import { ElGamalEncryption } from './encryption';

const actualBalance = await ElGamalEncryption.decrypt(
  encryptedBalance,
  userSecretKey
);
```

## Success Criteria
- [ ] Can withdraw from encrypted balance
- [ ] Funds appear in regular SOL balance
- [ ] Encrypted balance updates correctly
- [ ] Can withdraw to custom destination
- [ ] Proof generation <5 seconds
- [ ] Error handling for insufficient balance
- [ ] Integration tests pass
- [ ] Account cleanup works (if balance zero)

## Reference Documentation
- `/workspace/docs/research/confidential-transfers.md` (lines 227-242: Withdraw Flow)
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 1, Week 2)

## Testing Strategy
**Complete E2E Flow:**
1. User deposits 1 SOL (encrypted)
2. User transfers 0.3 SOL to someone
3. User withdraws 0.5 SOL to regular balance
4. Verify: Encrypted balance = 0.2 SOL, Regular balance = 0.5 SOL
5. User withdraws remaining 0.2 SOL
6. Verify: Encrypted balance = 0, Regular balance = 0.7 SOL

## Time Estimate
1-2 days (Week 2, Days 4-5)

## Notes
- Completes the deposit → transfer → withdraw cycle
- After this issue, basic privacy mode is functional!
```

---

### Issue 6/15: Implement Viewing Keys & Compliance

**Title**: `[6/15] Implement Viewing Keys & Compliance Features`

**Labels**: `phase-1`, `privacy`, `compliance`, `week-3`

**Description**:
```markdown
## Objective
Implement viewing key functionality for regulatory compliance. This allows authorized auditors to decrypt balances and transaction amounts without compromising user privacy.

## Branch
`feature/6-of-15-viewing-keys-compliance`

## Dependencies
- ✅ Issues [1/15] through [5/15] MUST be merged
- ⚠️ DO NOT start until all operations (deposit/transfer/withdraw) are working

## What to Build

### 1. Create `sdk/src/privacy/viewing-keys.ts`
Implement the ViewingKeyManager class:

```typescript
class ViewingKeyManager {
  // Generate viewing key with permissions
  async generateViewingKey(config: ViewingKeyConfig): Promise<ViewingKey>
  
  // Decrypt balance using viewing key
  async decryptBalanceWithViewingKey(
    encryptedBalance: EncryptedBalance,
    viewingKey: ViewingKey
  ): Promise<number>
  
  // Decrypt transaction amount using viewing key
  async decryptTransactionAmount(
    txSignature: string,
    viewingKey: ViewingKey
  ): Promise<number>
  
  // Revoke viewing key (set expiration)
  async revokeViewingKey(viewingKey: ViewingKey): Promise<void>
  
  // Check if viewing key is still valid
  isViewingKeyValid(viewingKey: ViewingKey): boolean
}

interface ViewingKeyConfig {
  permissions: {
    canViewBalances: boolean;
    canViewAmounts: boolean;
    allowedAccounts: PublicKey[];
  };
  expirationDays?: number; // Auto-expire for security
  auditorPublicKey?: PublicKey; // Optional auditor identification
}
```

### 2. Update `sdk/src/privacy/ghost-sol-privacy.ts`
Add viewing key methods to main privacy class:

```typescript
class GhostSolPrivacy {
  // Generate viewing key for current user
  async generateViewingKey(config?: ViewingKeyConfig): Promise<ViewingKey>
  
  // Decrypt balance with viewing key (for auditors)
  async decryptBalance(viewingKey?: ViewingKey): Promise<number>
}
```

### 3. Create `sdk/test/privacy/viewing-keys.test.ts`
Write comprehensive tests:
- ✅ Test generating viewing key
- ✅ Test auditor can decrypt balance with viewing key
- ✅ Test auditor can decrypt transaction amounts
- ✅ Test viewing key respects permissions (allowed accounts only)
- ✅ Test viewing key expiration works
- ✅ Test revoking viewing key
- ✅ Test viewing key cannot decrypt other users' data

## Technical Requirements

**Viewing Key Encryption:**
```typescript
// Viewing key is derived from user's private key + auditor's public key
const viewingKey = deriveViewingKey(
  userElGamalSecretKey,
  auditorElGamalPublicKey
);
```

**Compliance Features:**
- Viewing keys can be time-limited (auto-expire)
- Permissions can be scoped to specific accounts
- User controls who gets viewing keys (not infrastructure)
- Viewing keys cannot decrypt other users' balances

## Success Criteria
- [ ] Can generate viewing key with permissions
- [ ] Auditor can decrypt balance with viewing key
- [ ] Auditor can decrypt transaction amounts
- [ ] Viewing key respects permission restrictions
- [ ] Viewing key expiration works correctly
- [ ] User can revoke viewing key
- [ ] Cannot decrypt unauthorized data
- [ ] Integration tests pass
- [ ] Documentation includes compliance examples

## Reference Documentation
- `/workspace/docs/research/confidential-transfers.md` (lines 245-366: Viewing Keys & Global Auditor System)
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 1, Week 3)

## Testing Strategy
**Compliance Test Scenario:**
1. Alice deposits and transfers SOL (encrypted)
2. Alice generates viewing key for Auditor
3. Auditor decrypts Alice's balance using viewing key
4. Auditor decrypts Alice's transaction amounts
5. Auditor CANNOT decrypt Bob's balance (no viewing key for Bob)
6. Alice revokes viewing key after 30 days
7. Auditor can no longer decrypt (viewing key expired)

## Time Estimate
2 days (Week 3, Days 1-2)

## Notes
- Critical for regulatory compliance (especially fintech use cases)
- Viewing keys are user-controlled, not infrastructure-controlled
- Document clearly: viewing key = selective disclosure, not backdoor
```

---

### Issue 7/15: Privacy Mode Testing & Documentation

**Title**: `[7/15] Complete Privacy Mode Testing & Documentation`

**Labels**: `phase-1`, `privacy`, `testing`, `documentation`, `week-3`

**Description**:
```markdown
## Objective
Create comprehensive end-to-end tests and complete documentation for privacy mode. This ensures Phase 1 is production-ready before moving to Phase 2.

## Branch
`feature/7-of-15-privacy-testing-documentation`

## Dependencies
- ✅ Issues [1/15] through [6/15] MUST be merged and working
- ⚠️ This is the final Phase 1 issue - do NOT start until all operations work

## What to Build

### 1. Create `sdk/test/privacy/e2e-privacy-workflow.test.ts`
Complete end-to-end test covering full privacy workflow:

```typescript
describe('Complete Privacy Workflow E2E', () => {
  it('should complete full privacy lifecycle', async () => {
    // Setup: Alice and Bob, both with confidential accounts
    const alice = Keypair.generate();
    const bob = Keypair.generate();
    
    // 1. Alice deposits 2 SOL (encrypted)
    await ghostSol.init({ wallet: alice, privacy: { mode: 'privacy' } });
    await ghostSol.deposit(2);
    
    // 2. Verify Alice's balance is encrypted
    const aliceEncrypted = await ghostSol.getBalance();
    expect(aliceEncrypted.exists).toBe(true);
    const aliceDecrypted = await ghostSol.decryptBalance();
    expect(aliceDecrypted).toBe(2);
    
    // 3. Alice transfers 0.7 SOL to Bob (private)
    await ghostSol.transfer(bob.publicKey.toBase58(), 0.7);
    
    // 4. Bob receives and applies pending balance
    await ghostSol.init({ wallet: bob, privacy: { mode: 'privacy' } });
    const bobBalance = await ghostSol.decryptBalance();
    expect(bobBalance).toBe(0.7);
    
    // 5. Alice withdraws 1 SOL to regular balance
    await ghostSol.init({ wallet: alice, privacy: { mode: 'privacy' } });
    await ghostSol.withdraw(1);
    
    // 6. Verify final balances
    const aliceFinal = await ghostSol.decryptBalance();
    expect(aliceFinal).toBe(0.3); // 2 - 0.7 - 1 = 0.3
    
    // 7. Generate viewing key for compliance
    const viewingKey = await ghostSol.generateViewingKey();
    const auditedBalance = await ghostSol.decryptBalance(viewingKey);
    expect(auditedBalance).toBe(0.3);
  });
});
```

### 2. Create `sdk/test/privacy/performance-benchmarks.test.ts`
Performance benchmark tests:
- ✅ Proof generation time <5 seconds (CRITICAL)
- ✅ Deposit operation end-to-end time
- ✅ Transfer operation end-to-end time
- ✅ Balance decryption time
- ✅ Concurrent operation handling

### 3. Create `sdk/test/privacy/security-tests.test.ts`
Security validation tests:
- ✅ Cannot decrypt balance without private key
- ✅ Cannot decrypt other user's balance
- ✅ Proof verification rejects invalid proofs
- ✅ Range proof prevents negative amounts
- ✅ Viewing key permissions enforced
- ✅ No sensitive data leaked in errors

### 4. Update Documentation Files

**Create `docs/PRIVACY_MODE_GUIDE.md`:**
- Privacy mode overview
- How to initialize in privacy mode
- Deposit/transfer/withdraw examples
- Viewing keys and compliance
- Security best practices
- FAQ section

**Update `README.md`:**
- Add privacy mode quick start
- Add privacy vs efficiency comparison table
- Add privacy mode examples

**Update `docs/API.md`:**
- Document all privacy-specific APIs
- Add privacy mode configuration options
- Include viewing key API reference

**Create `docs/MIGRATION_GUIDE.md`:**
- How to migrate from efficiency to privacy mode
- Breaking changes (none expected)
- Performance considerations
- Cost comparison

## Success Criteria
- [ ] ✅ E2E tests pass on devnet (full workflow works)
- [ ] ✅ All proof generation <5 seconds (measured in benchmarks)
- [ ] ✅ Security tests pass (no vulnerabilities found)
- [ ] ✅ Test coverage >90% for privacy module
- [ ] ✅ Documentation complete and reviewed
- [ ] ✅ Migration guide clear and tested
- [ ] ✅ No critical issues or TODOs remaining
- [ ] ✅ Ready for Phase 1 review and approval

## Performance Targets (MUST MEET)
```typescript
Performance Requirements:
- Proof generation: <5 seconds (CRITICAL for UX)
- Deposit operation: <10 seconds end-to-end
- Transfer operation: <10 seconds end-to-end
- Withdraw operation: <10 seconds end-to-end
- Balance decryption: <1 second
```

## Documentation Checklist
- [ ] Privacy mode overview and benefits explained
- [ ] Clear examples for all operations
- [ ] Viewing key usage documented
- [ ] Security considerations explained
- [ ] Migration path from efficiency mode
- [ ] Troubleshooting guide included
- [ ] Performance expectations set
- [ ] Code samples tested and working

## Reference Documentation
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 1 Success Criteria)
- `/workspace/QUICK_START_GUIDE_FOR_TEAM.md` (Week 3 checklist)
- All previous issues [1/15] through [6/15]

## Testing Strategy
1. Run all unit tests: `npm test`
2. Run E2E on devnet: `npm run test:e2e-privacy`
3. Run performance benchmarks: `npm run test:performance`
4. Run security tests: `npm run test:security`
5. Manual testing in demo app
6. Review test coverage report

## Time Estimate
3 days (Week 3, Days 3-5)

## Notes
- This is the Phase 1 completion gate - be thorough!
- If performance targets not met, optimize before proceeding
- Documentation is as important as code
- After this issue completes, Phase 1 is DONE! 🎉
```

---

## PHASE 2: Infrastructure (Issues 8-10)

### Issue 8/15: Deploy Photon RPC Infrastructure

**Title**: `[8/15] Deploy Photon RPC Infrastructure`

**Labels**: `phase-2`, `infrastructure`, `devops`, `week-2`

**Description**:
```markdown
## Objective
Deploy GhostSOL-operated Photon RPC indexer for data availability and implement multi-provider RPC failover in the SDK. This ensures 99.9% uptime for privacy operations.

## Branch
`feature/8-of-15-photon-rpc-infrastructure`

## Dependencies
- ✅ None - can start anytime (infrastructure work)
- ⚠️ Should be merged AFTER Phase 1 (issues 1-7) complete

## What to Build

### 1. Infrastructure as Code
Create Terraform/CloudFormation scripts:

**File**: `infrastructure/terraform/photon-rpc.tf`
```hcl
# Provision AWS/GCP instance for Photon RPC
resource "aws_instance" "photon_rpc" {
  instance_type = "c6i.4xlarge"  # 16 vCPU, 32GB RAM
  ami           = "ubuntu-22.04"
  
  root_block_device {
    volume_size = 2000  # 2TB SSD
    volume_type = "gp3"
  }
  
  tags = {
    Name = "ghostsol-photon-rpc-primary"
    Environment = "production"
  }
}
```

### 2. Docker Configuration
**File**: `infrastructure/docker/photon-rpc/Dockerfile`
```dockerfile
FROM ubuntu:22.04

# Install Light Protocol indexer
RUN apt-get update && apt-get install -y \
    git curl build-essential

# Clone and build Light Protocol indexer
RUN git clone https://github.com/Lightprotocol/light-protocol
RUN cd light-protocol && cargo build --release

# Configure for devnet/mainnet
COPY config.toml /app/config.toml

CMD ["/app/light-protocol/target/release/indexer"]
```

### 3. Deployment Scripts
**File**: `infrastructure/scripts/deploy-photon.sh`
```bash
#!/bin/bash
# Deploy Photon RPC indexer

# 1. Provision infrastructure with Terraform
terraform apply -auto-approve

# 2. Deploy Docker container
docker-compose -f docker-compose.photon.yml up -d

# 3. Wait for sync
./wait-for-sync.sh

# 4. Health check
./health-check.sh
```

### 4. SDK RPC Failover
**Update**: `sdk/src/core/rpc.ts`

Add multi-provider RPC configuration:
```typescript
const RPC_PROVIDERS = {
  primary: 'https://rpc.ghostsol.io',        // GhostSOL-operated
  fallback1: 'https://photon.light.so',      // Light Protocol
  fallback2: 'https://rpc.helius.xyz',       // Helius
};

async function createRpcWithFailover(cluster: Cluster) {
  for (const provider of Object.values(RPC_PROVIDERS)) {
    try {
      const connection = new Connection(provider);
      await connection.getVersion(); // Health check
      return createRpc(connection);
    } catch (error) {
      console.warn(`RPC provider ${provider} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All RPC providers unavailable');
}
```

## Success Criteria
- [ ] Photon RPC deployed on AWS/GCP
- [ ] Indexer syncing with devnet/mainnet
- [ ] Health check endpoint working
- [ ] SDK can connect to GhostSOL RPC
- [ ] Automatic failover to Helius works
- [ ] Infrastructure documented in runbook
- [ ] Terraform/Docker configs in repo

## Resource Requirements
- AWS c6i.4xlarge (16 vCPU, 32GB RAM, 2TB SSD)
- Monthly cost: ~$500-600/month
- Network: 1Gbps bandwidth

## Reference Documentation
- `/workspace/docs/research/liveness-and-infra.md` (lines 19-65: Photon RPC)
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 2, Week 2)

## Testing
1. Deploy to staging environment first
2. Verify indexer syncs from genesis
3. Test RPC queries return correct data
4. Test failover by stopping primary RPC
5. Measure query response time (target: <1s p95)

## Time Estimate
3-5 days (Week 2-3, DevOps)

## Notes
- This is infrastructure work - can run parallel to Phase 1
- Should be merged after Phase 1 to avoid conflicts
- Focus on reliability over features
```

---

### Issue 9/15: Implement Monitoring & Failover System

**Title**: `[9/15] Implement Monitoring & Failover System`

**Labels**: `phase-2`, `infrastructure`, `monitoring`, `week-3`

**Description**:
```markdown
## Objective
Set up comprehensive monitoring with Datadog and PagerDuty alerting. Improve SDK failover logic with health checks and automatic retry.

## Branch
`feature/9-of-15-monitoring-failover-system`

## Dependencies
- ✅ Issue [8/15] recommended (Photon RPC deployed)
- ⚠️ Can work in parallel with Issue 8

## What to Build

### 1. Datadog Monitoring Configuration
**File**: `infrastructure/monitoring/datadog/dashboards.json`

Configure dashboards tracking:
- RPC response time (p50, p95, p99)
- Forester queue depth (<100 warning, >200 critical)
- Transaction success rate (>99% target)
- Indexer sync status (blocks behind)
- Error rates by operation type
- API endpoint availability

### 2. PagerDuty Alerting
**File**: `infrastructure/monitoring/pagerduty/alerts.json`

Configure alerts:
```json
{
  "alerts": [
    {
      "name": "RPC Response Time High",
      "condition": "p95 > 1000ms for 5 minutes",
      "severity": "warning",
      "escalation": "engineering-team"
    },
    {
      "name": "All RPC Providers Down",
      "condition": "all providers unreachable",
      "severity": "critical",
      "escalation": "on-call-immediate"
    },
    {
      "name": "Forester Queue Overflow",
      "condition": "queue depth > 200",
      "severity": "critical",
      "escalation": "devops-team"
    },
    {
      "name": "Transaction Success Rate Low",
      "condition": "success rate < 95% for 10 minutes",
      "severity": "warning",
      "escalation": "engineering-team"
    }
  ]
}
```

### 3. Enhanced SDK Failover Logic
**Update**: `sdk/src/core/rpc.ts`

```typescript
class RpcConnectionManager {
  private providers: RpcProvider[];
  private currentProvider: number = 0;
  private healthCheckInterval: NodeJS.Timer;
  
  async getConnection(): Promise<Connection> {
    // Health check before each request
    if (!await this.isHealthy(this.currentProvider)) {
      await this.failoverToNext();
    }
    return this.providers[this.currentProvider].connection;
  }
  
  private async isHealthy(providerIndex: number): Promise<boolean> {
    try {
      const start = Date.now();
      await this.providers[providerIndex].connection.getVersion();
      const latency = Date.now() - start;
      
      // Track metrics
      this.recordMetric('rpc_latency', latency);
      
      return latency < 2000; // Fail if >2s response
    } catch (error) {
      this.recordError('rpc_health_check_failed', error);
      return false;
    }
  }
  
  private async failoverToNext(): Promise<void> {
    console.warn(`Failing over from ${this.providers[this.currentProvider].name}`);
    this.currentProvider = (this.currentProvider + 1) % this.providers.length;
    this.recordMetric('rpc_failover', 1);
  }
}
```

### 4. Monitoring Script
**File**: `infrastructure/scripts/monitor-health.sh`

```bash
#!/bin/bash
# Continuous health monitoring script

while true; do
  # Check RPC health
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://rpc.ghostsol.io/health)
  if [ $RESPONSE != "200" ]; then
    echo "RPC health check failed: $RESPONSE"
    # Trigger alert
  fi
  
  # Check Forester queue
  QUEUE_DEPTH=$(curl -s https://api.lightprotocol.com/forester/queue | jq '.depth')
  if [ $QUEUE_DEPTH -gt 200 ]; then
    echo "Forester queue overflow: $QUEUE_DEPTH"
    # Trigger alert
  fi
  
  sleep 30
done
```

## Success Criteria
- [ ] Datadog dashboards live and updating
- [ ] PagerDuty alerts configured and tested
- [ ] SDK failover logic tested (manual RPC shutdown)
- [ ] Health checks working (<1s response for healthy)
- [ ] Automatic retry on transient failures
- [ ] Metrics tracked: latency, errors, failovers
- [ ] Alert test: simulate RPC failure, verify alert fires

## Monitoring Targets
- RPC response time: <1s (p95)
- Uptime: 99.9% (43 minutes downtime/month max)
- Error rate: <1%
- Failover time: <5 seconds

## Reference Documentation
- `/workspace/docs/research/liveness-and-infra.md` (lines 553-603: Monitoring Setup)
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 2, Week 3)

## Testing Strategy
1. Deploy monitoring to staging
2. Simulate RPC failure (stop service)
3. Verify alert fires within 1 minute
4. Verify SDK fails over automatically
5. Verify metrics appear in Datadog
6. Test PagerDuty escalation (alert → on-call)

## Time Estimate
3 days (Week 3-4, DevOps)

## Notes
- Monitoring is critical for production readiness
- Test alerts before going live (avoid alert fatigue)
- Document on-call procedures
```

---

### Issue 10/15: Create Status Page & Alerting

**Title**: `[10/15] Create Status Page & Operational Runbooks`

**Labels**: `phase-2`, `infrastructure`, `documentation`, `week-4`

**Description**:
```markdown
## Objective
Create public status page for transparency and write operational runbooks for incident response. This builds user trust and ensures team can recover from failures.

## Branch
`feature/10-of-15-status-page-alerting`

## Dependencies
- ✅ Issue [9/15] recommended (monitoring setup)
- ⚠️ Can work in parallel

## What to Build

### 1. Public Status Page
**File**: `infrastructure/status-page/index.html`

Create status page (uptime.ghostsol.io) showing:
- ✅ Current system status (operational / degraded / down)
- ✅ Component-level status:
  - Photon RPC (primary)
  - Photon RPC (backup)
  - Forester service
  - SDK endpoints
- ✅ Historical uptime (30 day, 90 day)
- ✅ Incident history
- ✅ Subscription for updates

**Tech Stack Options:**
- Statuspage.io (managed, $29/month)
- Custom with Netlify + API endpoint
- Self-hosted with uptime-kuma

### 2. Status API
**File**: `infrastructure/status-page/api/health.ts`

```typescript
// API endpoint for status page
export async function getSystemStatus() {
  const checks = await Promise.all([
    checkPhotonRpcPrimary(),
    checkPhotonRpcBackup(),
    checkForesterHealth(),
    checkSdkEndpoint()
  ]);
  
  return {
    status: checks.every(c => c.healthy) ? 'operational' : 'degraded',
    components: checks,
    uptime: {
      day30: calculateUptime(30),
      day90: calculateUptime(90)
    },
    lastUpdated: new Date().toISOString()
  };
}
```

### 3. Operational Runbooks
Create runbooks for common incidents:

**File**: `infrastructure/runbooks/rpc-failure.md`
```markdown
# Runbook: Photon RPC Failure

## Detection
- PagerDuty alert: "RPC Response Time High" or "RPC Unavailable"
- Datadog dashboard shows RPC errors

## Diagnosis
1. Check RPC health endpoint: `curl https://rpc.ghostsol.io/health`
2. Check server status: `ssh ghostsol-rpc-1 && systemctl status indexer`
3. Check disk space: `df -h`
4. Check logs: `journalctl -u indexer -n 100`

## Resolution
### If disk full:
- Clear old logs: `./clear-logs.sh`
- Increase disk size in Terraform

### If indexer crashed:
- Restart service: `systemctl restart indexer`
- Monitor sync: `./check-sync-status.sh`

### If hardware failure:
- Failover to backup: Update DNS to backup RPC
- Provision new primary: `terraform apply`

## Communication
- Update status page: Set RPC to "degraded"
- Post incident update if >15 min downtime
- Notify team in #incidents Slack channel

## Post-Incident
- Write incident report
- Update runbook with learnings
- Review alerts (was detection fast enough?)
```

**File**: `infrastructure/runbooks/forester-failure.md`
**File**: `infrastructure/runbooks/recovery.md`

### 4. User Recovery Documentation
**File**: `docs/USER_RECOVERY_GUIDE.md`

Document how users can self-recover if infrastructure fails:
```markdown
# User Recovery Guide

## If GhostSOL RPC is Down

1. Check status page: https://uptime.ghostsol.io
2. Use alternative RPC (SDK auto-fails over):
   - Helius RPC (automatic)
   - Light Protocol RPC (automatic)
3. Manual RPC override:
   ```typescript
   await init({
     rpcUrl: 'https://your-custom-rpc.com',
     privacy: { mode: 'privacy' }
   });
   ```

## If All Infrastructure is Down

Your funds are cryptographically safe. You can:

1. Wait for infrastructure to restore (check status page)
2. Self-host Photon RPC indexer (advanced):
   ```bash
   git clone https://github.com/Lightprotocol/light-protocol
   # Follow deployment guide
   ```
3. Emergency withdrawal using Light Protocol SDK directly

See full guide at: /docs/EMERGENCY_RECOVERY.md
```

## Success Criteria
- [ ] Status page live at uptime.ghostsol.io
- [ ] All components tracked (RPC, Forester, SDK)
- [ ] Historical uptime data displayed
- [ ] Subscription for updates works
- [ ] 3+ runbooks created and reviewed
- [ ] User recovery guide complete
- [ ] Incident communication template ready
- [ ] Status API returns correct data

## Reference Documentation
- `/workspace/docs/research/liveness-and-infra.md` (lines 356-409: Recovery & Escrow)
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 2, Week 4)

## Testing
1. Deploy status page to staging
2. Simulate component failure
3. Verify status page updates
4. Test user subscriptions
5. Walk through runbooks (dry run)

## Time Estimate
2-3 days (Week 3-4, DevOps)

## Notes
- Public status page builds user trust
- Runbooks are critical for 2am incidents
- Test runbooks before you need them!
```

---

## PHASE 3: Native SOL (Issues 11-12)

### Issue 11/15: Implement wSOL Wrapper Abstraction

**Title**: `[11/15] Implement wSOL Wrapper Abstraction`

**Labels**: `phase-3`, `privacy`, `native-sol`, `week-4`

**Description**:
```markdown
## Objective
Implement wSOL wrapper utilities that enable native SOL privacy by automatically wrapping/unwrapping SOL to/from wSOL. Users should never see "wSOL" in the UX.

## Branch
`feature/11-of-15-wsol-wrapper-abstraction`

## Dependencies
- ✅ Issues [1/15] through [7/15] MUST be merged (Phase 1 complete)
- ⚠️ DO NOT start until privacy mode is fully functional

## What to Build

### 1. Create `sdk/src/privacy/wsol-wrapper.ts`
Implement WsolWrapper class:

```typescript
class WsolWrapper {
  constructor(
    private connection: Connection,
    private wallet: WalletAdapter
  )
  
  // Wrap native SOL → wSOL
  async wrapSol(amountLamports: number): Promise<PublicKey> {
    // 1. Create wSOL account (associated token account)
    // 2. Transfer SOL to wSOL account
    // 3. Sync native (converts SOL to wSOL token)
    // 4. Return wSOL account address
  }
  
  // Unwrap wSOL → native SOL
  async unwrapSol(wsolAccount: PublicKey): Promise<string> {
    // 1. Close wSOL account
    // 2. SOL automatically returns to wallet
    // 3. Return transaction signature
  }
  
  // Get or create wSOL account
  async getOrCreateWsolAccount(): Promise<PublicKey> {
    // Returns existing wSOL account or creates new one
  }
  
  // Check if account is wSOL
  isWsolAccount(account: PublicKey): Promise<boolean>
  
  // Get wSOL balance
  async getWsolBalance(account: PublicKey): Promise<number>
  
  // Cleanup: close empty wSOL accounts
  async closeEmptyWsolAccounts(): Promise<string[]>
}
```

**Implementation Details:**
- Use `NATIVE_MINT` from `@solana/spl-token` for wSOL
- Create associated token account (ATA) for wSOL
- Use `syncNative()` to convert SOL → wSOL
- Closing account automatically unwraps wSOL → SOL

### 2. Create `sdk/test/privacy/wsol-wrapper.test.ts`
Write comprehensive tests:
- ✅ Test wrapping 1 SOL → wSOL
- ✅ Test wSOL account created correctly
- ✅ Test unwrapping wSOL → SOL
- ✅ Test balance queries work
- ✅ Test account cleanup (close empty accounts)
- ✅ Test edge case: wrap then immediately unwrap
- ✅ Test edge case: multiple wrap/unwrap cycles
- ✅ Verify no orphaned wSOL accounts left

## Technical Requirements

**Use SPL Token:**
```typescript
import {
  NATIVE_MINT,
  createAssociatedTokenAccount,
  closeAccount,
  syncNative
} from '@solana/spl-token';
```

**Account Management:**
- Always use associated token accounts (deterministic addresses)
- Clean up empty accounts to avoid rent costs
- Handle case where wSOL account already exists

## Success Criteria
- [ ] Can wrap SOL to wSOL successfully
- [ ] Can unwrap wSOL to SOL successfully
- [ ] wSOL account creation works
- [ ] Account cleanup removes empty accounts
- [ ] No orphaned wSOL accounts after tests
- [ ] Unit tests pass with >90% coverage
- [ ] Performance: wrap/unwrap <5 seconds

## Reference Documentation
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 3, Week 4)
- `/workspace/docs/research/confidential-transfers.md` (lines 696-725: Native SOL via wSOL)
- Solana wSOL docs: https://spl.solana.com/token#wrapping-sol

## Testing Strategy
**Full Wrap/Unwrap Cycle:**
1. Start with 1 SOL in wallet
2. Wrap 0.5 SOL → wSOL
3. Verify: wSOL account has 0.5 SOL, wallet has 0.5 SOL (minus rent)
4. Unwrap wSOL → SOL
5. Verify: wallet has ~1 SOL (minus fees), no wSOL account

## Time Estimate
2-3 days (Week 4, Days 1-3)

## Notes
- This is infrastructure for Phase 3 - doesn't change user-facing API yet
- Focus on correctness and cleanup (no orphaned accounts)
- Next issue (12) will integrate this into privacy operations
```

---

### Issue 12/15: Integrate Native SOL with Privacy Operations

**Title**: `[12/15] Integrate Native SOL with Privacy Operations`

**Labels**: `phase-3`, `privacy`, `native-sol`, `week-4`

**Description**:
```markdown
## Objective
Integrate wSOL wrapper into privacy operations (deposit/withdraw) so users can use native SOL in privacy mode. Users should never see "wSOL" - it's transparent.

## Branch
`feature/12-of-15-native-sol-integration`

## Dependencies
- ✅ Issue [11/15] MUST be merged (wSOL wrapper ready)
- ⚠️ DO NOT start until wSOL wrapper is tested and working

## What to Build

### 1. Update `sdk/src/privacy/ghost-sol-privacy.ts`
Integrate wSOL into deposit/withdraw:

```typescript
class GhostSolPrivacy {
  private wsolWrapper: WsolWrapper;
  
  async encryptedDeposit(amountLamports: number): Promise<string> {
    // NEW FLOW:
    // 1. Wrap SOL → wSOL automatically
    const wsolAccount = await this.wsolWrapper.wrapSol(amountLamports);
    
    // 2. Get or create confidential wSOL account (not native SOL)
    const confidentialAccount = await this.getOrCreateConfidentialAccount(
      NATIVE_MINT // wSOL mint
    );
    
    // 3. Deposit wSOL to confidential account (existing logic)
    const signature = await this.depositToConfidential(
      wsolAccount,
      confidentialAccount,
      amountLamports
    );
    
    // 4. Return signature
    // User sees: "Deposited 0.5 SOL" (wrapping hidden)
    return signature;
  }
  
  async encryptedWithdraw(
    amountLamports: number,
    destination?: PublicKey
  ): Promise<string> {
    // NEW FLOW:
    // 1. Withdraw from confidential wSOL account (existing logic)
    const wsolAccount = await this.withdrawFromConfidential(amountLamports);
    
    // 2. Unwrap wSOL → SOL automatically
    const signature = await this.wsolWrapper.unwrapSol(wsolAccount);
    
    // 3. Return signature
    // User sees: "Withdrew 0.5 SOL" (unwrapping hidden)
    return signature;
  }
  
  // Optional: Batch wrap + deposit in single transaction
  async optimizedDeposit(amountLamports: number): Promise<string> {
    // Try to batch wrap + deposit in one transaction
    // Fallback to two transactions if batching fails
  }
}
```

### 2. Update User-Facing Messages
Ensure users NEVER see "wSOL" in any messages:

```typescript
// ❌ BAD
console.log('Wrapping SOL to wSOL...');
console.log('Depositing wSOL to confidential account...');

// ✅ GOOD
console.log('Preparing SOL for private transfer...');
console.log('SOL now private');
```

### 3. Create `sdk/test/privacy/native-sol.test.ts`
Integration tests for native SOL flow:

```typescript
describe('Native SOL Privacy', () => {
  it('should deposit native SOL (via wSOL wrapper)', async () => {
    // User starts with 1 SOL
    const startBalance = await connection.getBalance(wallet.publicKey);
    
    // User deposits 0.5 SOL (should wrap automatically)
    await ghostSol.deposit(0.5);
    
    // Verify: Encrypted balance = 0.5 SOL
    const encryptedBalance = await ghostSol.decryptBalance();
    expect(encryptedBalance).toBe(0.5);
    
    // Verify: Native SOL balance decreased by ~0.5 (plus fees)
    const endBalance = await connection.getBalance(wallet.publicKey);
    expect(endBalance).toBeLessThan(startBalance - 0.5 * LAMPORTS_PER_SOL);
  });
  
  it('should withdraw to native SOL (via wSOL wrapper)', async () => {
    // Setup: User has 0.5 SOL encrypted
    await ghostSol.deposit(0.5);
    
    const startBalance = await connection.getBalance(wallet.publicKey);
    
    // Withdraw 0.3 SOL (should unwrap automatically)
    await ghostSol.withdraw(0.3);
    
    // Verify: Native SOL increased by ~0.3
    const endBalance = await connection.getBalance(wallet.publicKey);
    expect(endBalance).toBeGreaterThan(startBalance + 0.25 * LAMPORTS_PER_SOL);
    
    // Verify: Encrypted balance = 0.2 SOL
    const encryptedBalance = await ghostSol.decryptBalance();
    expect(encryptedBalance).toBeCloseTo(0.2);
  });
  
  it('should not leave orphaned wSOL accounts', async () => {
    // Full cycle: deposit → withdraw
    await ghostSol.deposit(1.0);
    await ghostSol.withdraw(1.0);
    
    // Verify: No wSOL accounts remaining
    const wsolAccounts = await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      { mint: NATIVE_MINT }
    );
    
    // Should be cleaned up
    expect(wsolAccounts.value.length).toBe(0);
  });
});
```

### 4. Transaction Batching (Optional Optimization)
Try to batch wrap + deposit in single transaction:

```typescript
// If possible, batch these operations:
// Transaction 1: wrap + deposit (saves time and fees)
// Instead of:
// Transaction 1: wrap
// Transaction 2: deposit
```

## Success Criteria
- [ ] Native SOL deposit works seamlessly
- [ ] Native SOL withdrawal works seamlessly
- [ ] Users never see "wSOL" in UX
- [ ] No orphaned wSOL accounts after operations
- [ ] Single-transaction deposit (if batching works)
- [ ] Integration tests pass
- [ ] Error handling for wrap/unwrap failures
- [ ] Documentation updated with native SOL examples

## User Experience Goals
**User perspective:**
```typescript
// User just wants to use SOL (doesn't know about wSOL)
await init({ privacy: { mode: 'privacy' } });
await deposit(0.5);  // User thinks: "Deposited 0.5 SOL"
await transfer(bob, 0.2);  // User thinks: "Transferred 0.2 SOL"
await withdraw(0.3); // User thinks: "Withdrew 0.3 SOL"

// wSOL wrapping is completely transparent!
```

## Reference Documentation
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 3, Week 4-5)
- `/workspace/docs/research/confidential-transfers.md` (lines 1069-1096: wSOL Abstraction)

## Time Estimate
2-3 days (Week 4-5, Days 4-7)

## Notes
- User experience is critical - hide all wSOL complexity
- Test account cleanup thoroughly (no orphans)
- After this, users can use native SOL in privacy mode! 🎉
```

---

## PHASE 4: Advanced Privacy (Issues 13-15)

### Issue 13/15: Implement Stealth Address Protocol

**Title**: `[13/15] Implement Stealth Address Protocol`

**Labels**: `phase-4`, `privacy`, `advanced`, `week-6`

**Description**:
```markdown
## Objective
Implement stealth address protocol using ECDH key exchange to enable true sender/recipient unlinkability. This is the core differentiator that makes GhostSOL provide true privacy.

## Branch
`feature/13-of-15-stealth-address-protocol`

## Dependencies
- ✅ Issues [1/15] through [12/15] MUST be merged (all previous phases complete)
- ⚠️ DO NOT start until native SOL privacy is working

## What to Build

### 1. Create `sdk/src/privacy/stealth-addresses.ts`
Implement StealthAddressManager class:

```typescript
class StealthAddressManager {
  // Generate stealth meta-address (published once, used forever)
  async generateStealthMetaAddress(): Promise<StealthMetaAddress> {
    // 1. Generate viewing key (for scanning incoming payments)
    const viewingKey = Keypair.generate();
    
    // 2. Generate spending key (for spending received funds)
    const spendingKey = Keypair.generate();
    
    // 3. Publish viewing key (public), keep spending key private
    return {
      viewingPublicKey: viewingKey.publicKey,
      spendingPublicKey: spendingKey.publicKey,
      viewingSecretKey: viewingKey.secretKey, // User keeps private
      spendingSecretKey: spendingKey.secretKey // User keeps private
    };
  }
  
  // Generate one-time stealth address for recipient
  async generateStealthAddress(
    recipientMetaAddress: StealthMetaAddress
  ): Promise<StealthAddress> {
    // 1. Generate ephemeral keypair (one-time use)
    const ephemeralKey = Keypair.generate();
    
    // 2. Compute shared secret via ECDH
    const sharedSecret = this.ecdh(
      ephemeralKey.secretKey,
      recipientMetaAddress.viewingPublicKey
    );
    
    // 3. Derive one-time stealth public key
    const stealthPublicKey = this.deriveStealthPublicKey(
      recipientMetaAddress.spendingPublicKey,
      sharedSecret
    );
    
    return {
      address: stealthPublicKey,
      ephemeralPublicKey: ephemeralKey.publicKey
    };
  }
  
  // Helper: ECDH key exchange
  private ecdh(secretKey: Uint8Array, publicKey: PublicKey): Uint8Array {
    // Elliptic curve Diffie-Hellman
    // sharedSecret = secretKey * publicKey (on curve25519)
  }
  
  // Helper: Derive stealth public key
  private deriveStealthPublicKey(
    spendingPublicKey: PublicKey,
    sharedSecret: Uint8Array
  ): PublicKey {
    // stealthPubKey = spendingPublicKey + hash(sharedSecret) * G
  }
  
  // Check if transaction is sent to user's stealth address
  async isTransactionForMe(
    tx: Transaction,
    metaAddress: StealthMetaAddress
  ): Promise<boolean> {
    // 1. Extract ephemeral public key from transaction
    // 2. Compute shared secret
    // 3. Derive expected stealth address
    // 4. Check if matches transaction destination
  }
}
```

### 2. Create Stealth Address Registry Program (Optional)
**File**: `programs/stealth-registry/src/lib.rs`

Simple on-chain registry for publishing stealth meta-addresses:

```rust
use anchor_lang::prelude::*;

#[program]
pub mod stealth_registry {
    pub fn register_stealth_meta_address(
        ctx: Context<Register>,
        viewing_key: Pubkey,
        spending_key: Pubkey
    ) -> Result<()> {
        let meta_address = &mut ctx.accounts.meta_address;
        meta_address.owner = ctx.accounts.authority.key();
        meta_address.viewing_key = viewing_key;
        meta_address.spending_key = spending_key;
        Ok(())
    }
}

#[account]
pub struct StealthMetaAddress {
    pub owner: Pubkey,
    pub viewing_key: Pubkey,
    pub spending_key: Pubkey,
}
```

### 3. Create `sdk/test/privacy/stealth-addresses.test.ts`
Write comprehensive tests:

```typescript
describe('Stealth Addresses', () => {
  it('should generate stealth meta-address', async () => {
    const metaAddress = await stealthManager.generateStealthMetaAddress();
    
    expect(metaAddress.viewingPublicKey).toBeDefined();
    expect(metaAddress.spendingPublicKey).toBeDefined();
  });
  
  it('should generate unique stealth address each time', async () => {
    const recipientMeta = await stealthManager.generateStealthMetaAddress();
    
    const stealth1 = await stealthManager.generateStealthAddress(recipientMeta);
    const stealth2 = await stealthManager.generateStealthAddress(recipientMeta);
    
    // Should be different (ephemeral keys are random)
    expect(stealth1.address.toBase58()).not.toBe(stealth2.address.toBase58());
  });
  
  it('should detect transaction sent to stealth address', async () => {
    const recipientMeta = await stealthManager.generateStealthMetaAddress();
    const stealthAddress = await stealthManager.generateStealthAddress(recipientMeta);
    
    // Simulate transaction to stealth address
    const tx = await sendToStealthAddress(stealthAddress, 0.5);
    
    // Recipient can detect it's for them
    const isForMe = await stealthManager.isTransactionForMe(tx, recipientMeta);
    expect(isForMe).toBe(true);
  });
  
  it('should verify unlinkability on-chain', async () => {
    // Generate 10 stealth addresses for same recipient
    const recipientMeta = await stealthManager.generateStealthMetaAddress();
    const stealthAddresses = await Promise.all(
      Array(10).fill(0).map(() => 
        stealthManager.generateStealthAddress(recipientMeta)
      )
    );
    
    // On-chain analysis should NOT be able to link them
    // (All addresses look random and independent)
    const uniqueAddresses = new Set(stealthAddresses.map(s => s.address.toBase58()));
    expect(uniqueAddresses.size).toBe(10); // All unique
  });
});
```

## Success Criteria
- [ ] Can generate stealth meta-address
- [ ] Can generate unique stealth addresses
- [ ] Recipient can detect payments to stealth addresses
- [ ] On-chain analysis cannot link stealth addresses
- [ ] Unit tests verify unlinkability
- [ ] ECDH key exchange works correctly
- [ ] Stealth key derivation works
- [ ] No privacy leaks in error messages

## Technical Requirements

**Use Solana's Curve25519:**
```typescript
import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';

// ECDH on curve25519
const sharedSecret = nacl.box.before(
  recipientPublicKey,
  ephemeralSecretKey
);
```

**Cryptographic Security:**
- Use cryptographically secure random number generator
- Never reuse ephemeral keys (generate new for each address)
- Protect spending keys (never expose in logs/errors)

## Reference Documentation
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 4, Week 6-7)
- `/workspace/docs/research/confidential-transfers.md` (lines 775-807: Stealth Addresses)
- Monero stealth addresses: https://www.getmonero.org/resources/moneropedia/stealthaddress.html

## Testing Strategy
**Unlinkability Test:**
1. Generate stealth meta-address for Bob
2. Alice generates 100 stealth addresses for Bob
3. Send 0.01 SOL to each stealth address
4. On-chain observer should NOT be able to:
   - Link addresses together
   - Determine they're all for Bob
   - Determine Alice sent them

## Time Estimate
4-5 days (Week 6-7, Days 1-5)

## Notes
- This is THE feature that provides true unlinkability
- Cryptography must be correct - review thoroughly
- Privacy depends on never reusing ephemeral keys
```

---

### Issue 14/15: Implement Payment Scanning Service

**Title**: `[14/15] Implement Payment Scanning Service`

**Labels**: `phase-4`, `privacy`, `scanning`, `week-7`

**Description**:
```markdown
## Objective
Implement background payment scanning service that allows users to discover incoming stealth payments. Users scan the blockchain to find transactions sent to their stealth addresses.

## Branch
`feature/14-of-15-payment-scanning-service`

## Dependencies
- ✅ Issue [13/15] MUST be merged (stealth addresses working)
- ⚠️ DO NOT start until stealth address protocol is tested

## What to Build

### 1. Create `sdk/src/privacy/payment-scanner.ts`
Implement PaymentScanner class:

```typescript
class PaymentScanner {
  constructor(
    private connection: Connection,
    private metaAddress: StealthMetaAddress
  )
  
  // Scan recent transactions for incoming stealth payments
  async scanForPayments(
    startSlot?: number,
    endSlot?: number
  ): Promise<StealthPayment[]> {
    const payments: StealthPayment[] = [];
    
    // 1. Get recent transactions (or specific slot range)
    const signatures = await this.connection.getSignaturesForAddress(
      // Scan all transactions (no specific address filter)
      new PublicKey('11111111111111111111111111111111'), // System program
      { limit: 1000 }
    );
    
    // 2. For each transaction, check if it's for me
    for (const sig of signatures) {
      const tx = await this.connection.getTransaction(sig.signature);
      if (!tx) continue;
      
      const payment = await this.checkTransaction(tx);
      if (payment) {
        payments.push(payment);
      }
    }
    
    return payments;
  }
  
  // Check if single transaction is stealth payment for me
  private async checkTransaction(tx: Transaction): Promise<StealthPayment | null> {
    // 1. Extract ephemeral public key from transaction
    const ephemeralKey = this.extractEphemeralKey(tx);
    if (!ephemeralKey) return null;
    
    // 2. Compute shared secret
    const sharedSecret = this.ecdh(
      this.metaAddress.viewingSecretKey,
      ephemeralKey
    );
    
    // 3. Derive expected stealth address
    const expectedStealthAddress = this.deriveStealthAddress(
      this.metaAddress.spendingPublicKey,
      sharedSecret
    );
    
    // 4. Check if transaction destination matches
    const destination = this.extractDestination(tx);
    if (destination.equals(expectedStealthAddress)) {
      return {
        signature: tx.signature,
        amount: this.extractAmount(tx),
        stealthAddress: expectedStealthAddress,
        blockTime: tx.blockTime,
        ephemeralKey
      };
    }
    
    return null;
  }
  
  // Start background scanning (continuous)
  async startBackgroundScan(
    onPaymentFound: (payment: StealthPayment) => void,
    intervalMs: number = 30000 // Scan every 30 seconds
  ): Promise<() => void> {
    let lastScannedSlot = await this.connection.getSlot();
    
    const interval = setInterval(async () => {
      const currentSlot = await this.connection.getSlot();
      const payments = await this.scanForPayments(lastScannedSlot, currentSlot);
      
      payments.forEach(onPaymentFound);
      lastScannedSlot = currentSlot;
    }, intervalMs);
    
    // Return stop function
    return () => clearInterval(interval);
  }
  
  // Optimized: Scan only specific program (faster)
  async scanProgramTransactions(
    programId: PublicKey,
    limit: number = 1000
  ): Promise<StealthPayment[]> {
    // Scan only transactions involving specific program
    // Much faster than scanning all transactions
  }
}
```

### 2. Integration with GhostSolPrivacy
**Update**: `sdk/src/privacy/ghost-sol-privacy.ts`

```typescript
class GhostSolPrivacy {
  private paymentScanner?: PaymentScanner;
  
  // Enable automatic payment scanning
  async enablePaymentScanning(
    onPaymentReceived: (payment: StealthPayment) => void
  ): Promise<void> {
    this.paymentScanner = new PaymentScanner(
      this.connection,
      this.stealthMetaAddress
    );
    
    // Start background scan
    await this.paymentScanner.startBackgroundScan(onPaymentReceived);
    
    console.log('Payment scanning enabled. You will be notified of incoming payments.');
  }
  
  // Manual scan
  async scanForPayments(): Promise<StealthPayment[]> {
    if (!this.paymentScanner) {
      throw new Error('Payment scanning not enabled');
    }
    
    return await this.paymentScanner.scanForPayments();
  }
}
```

### 3. Create `sdk/test/privacy/payment-scanner.test.ts`
Integration tests for scanning:

```typescript
describe('Payment Scanner', () => {
  it('should detect incoming stealth payment', async () => {
    // Setup: Generate stealth meta-address
    const recipient = await stealthManager.generateStealthMetaAddress();
    const scanner = new PaymentScanner(connection, recipient);
    
    // Sender generates stealth address and sends payment
    const stealthAddress = await stealthManager.generateStealthAddress(recipient);
    await sendToStealthAddress(stealthAddress, 0.5);
    
    // Wait for transaction to confirm
    await sleep(5000);
    
    // Recipient scans for payments
    const payments = await scanner.scanForPayments();
    
    // Should find the payment
    expect(payments.length).toBeGreaterThan(0);
    expect(payments[0].amount).toBe(0.5);
  });
  
  it('should not detect payments for other users', async () => {
    const alice = await stealthManager.generateStealthMetaAddress();
    const bob = await stealthManager.generateStealthMetaAddress();
    
    // Send payment to Alice
    const aliceStealth = await stealthManager.generateStealthAddress(alice);
    await sendToStealthAddress(aliceStealth, 0.5);
    
    // Bob scans (should not find Alice's payment)
    const bobScanner = new PaymentScanner(connection, bob);
    const bobPayments = await bobScanner.scanForPayments();
    
    expect(bobPayments.length).toBe(0);
  });
  
  it('should scan efficiently (<10s for 1000 transactions)', async () => {
    const recipient = await stealthManager.generateStealthMetaAddress();
    const scanner = new PaymentScanner(connection, recipient);
    
    const start = Date.now();
    await scanner.scanForPayments();
    const duration = Date.now() - start;
    
    // Should be fast enough for good UX
    expect(duration).toBeLessThan(10000); // <10 seconds
  });
  
  it('should handle background scanning', async () => {
    const recipient = await stealthManager.generateStealthMetaAddress();
    const scanner = new PaymentScanner(connection, recipient);
    
    const paymentsFound: StealthPayment[] = [];
    
    // Start background scan
    const stop = await scanner.startBackgroundScan(
      (payment) => paymentsFound.push(payment),
      5000 // Scan every 5 seconds
    );
    
    // Send payment while scanning
    const stealthAddress = await stealthManager.generateStealthAddress(recipient);
    await sendToStealthAddress(stealthAddress, 0.3);
    
    // Wait for scan to detect it
    await sleep(10000);
    
    // Should have found payment
    expect(paymentsFound.length).toBeGreaterThan(0);
    
    // Stop scanning
    stop();
  });
});
```

## Success Criteria
- [ ] Can scan for incoming stealth payments
- [ ] Scanning is reasonably fast (<10s per 1000 tx)
- [ ] Background scanning works continuously
- [ ] Only detects payments for correct recipient
- [ ] Does not detect other users' payments
- [ ] Integration tests pass
- [ ] Memory usage acceptable (no leaks)
- [ ] CPU usage acceptable (<10% during scan)

## Performance Targets
- Scan 1000 transactions: <10 seconds
- Background scan interval: 30 seconds (configurable)
- Memory usage: <100MB for scanner
- CPU usage: <10% average during scan

## Optimization Strategies

### 1. Filter by Program ID
Only scan transactions involving privacy program (faster):
```typescript
// Instead of scanning ALL transactions
await connection.getSignaturesForAddress(systemProgram); // Slow

// Scan only privacy program transactions
await connection.getSignaturesForAddress(privacyProgramId); // Fast
```

### 2. Parallel Scanning
Scan multiple transaction batches in parallel:
```typescript
const batches = chunkArray(transactions, 100);
const results = await Promise.all(
  batches.map(batch => scanBatch(batch))
);
```

### 3. Caching
Cache scanned slots to avoid re-scanning:
```typescript
const lastScannedSlot = localStorage.getItem('lastScannedSlot');
// Only scan new transactions
```

## Reference Documentation
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (Phase 4, Week 7-8)
- `/workspace/docs/research/confidential-transfers.md` (lines 787-807: Scanning)

## Time Estimate
3-4 days (Week 7-8, Days 1-4)

## Notes
- Scanning is necessary trade-off for unlinkability
- Optimize for performance (users won't wait >10s)
- Background scanning should be optional (battery/CPU)
- Document scanning overhead clearly
```

---

### Issue 15/15: Final Integration Testing & Launch Prep

**Title**: `[15/15] Final Integration Testing & Launch Preparation`

**Labels**: `phase-4`, `testing`, `launch`, `week-8`

**Description**:
```markdown
## Objective
Complete final end-to-end integration testing of ALL privacy features and prepare for mainnet launch. This includes security audit prep, performance validation, and final documentation.

## Branch
`feature/15-of-15-integration-final-testing`

## Dependencies
- ✅ ALL previous issues [1/15] through [14/15] MUST be merged
- ⚠️ This is the FINAL issue - everything must be complete

## What to Build

### 1. Create `sdk/test/e2e-complete-workflow.test.ts`
Comprehensive E2E test covering EVERYTHING:

```typescript
describe('Complete Privacy Workflow - All Features', () => {
  it('should complete full privacy lifecycle with all features', async () => {
    // ========================================
    // Setup: Alice and Bob with stealth addresses
    // ========================================
    const alice = Keypair.generate();
    const bob = Keypair.generate();
    
    await ghostSol.init({ wallet: alice, privacy: { mode: 'privacy' } });
    const aliceStealth = await ghostSol.generateStealthMetaAddress();
    
    await ghostSol.init({ wallet: bob, privacy: { mode: 'privacy' } });
    const bobStealth = await ghostSol.generateStealthMetaAddress();
    
    // ========================================
    // Test 1: Native SOL Deposit (wSOL wrapper)
    // ========================================
    console.log('Test 1: Native SOL deposit...');
    await ghostSol.init({ wallet: alice, privacy: { mode: 'privacy' } });
    await ghostSol.deposit(2.0); // Should wrap SOL → wSOL automatically
    
    const aliceBalance1 = await ghostSol.decryptBalance();
    expect(aliceBalance1).toBe(2.0);
    
    // ========================================
    // Test 2: Private Transfer with Stealth Address
    // ========================================
    console.log('Test 2: Private transfer with stealth address...');
    
    // Alice generates stealth address for Bob
    const bobStealthAddr = await ghostSol.generateStealthAddress(bobStealth);
    
    // Alice transfers to stealth address (unlinkable!)
    await ghostSol.transfer(bobStealthAddr.address.toBase58(), 0.7);
    
    // Verify Alice's balance
    const aliceBalance2 = await ghostSol.decryptBalance();
    expect(aliceBalance2).toBeCloseTo(1.3); // 2.0 - 0.7
    
    // ========================================
    // Test 3: Payment Scanning (Bob finds payment)
    // ========================================
    console.log('Test 3: Payment scanning...');
    
    await ghostSol.init({ wallet: bob, privacy: { mode: 'privacy' } });
    const payments = await ghostSol.scanForPayments();
    
    expect(payments.length).toBeGreaterThan(0);
    expect(payments[0].amount).toBeCloseTo(0.7);
    
    // ========================================
    // Test 4: Viewing Keys (Compliance)
    // ========================================
    console.log('Test 4: Viewing keys...');
    
    await ghostSol.init({ wallet: alice, privacy: { mode: 'privacy' } });
    const viewingKey = await ghostSol.generateViewingKey();
    
    // Auditor can decrypt balance
    const auditedBalance = await ghostSol.decryptBalance(viewingKey);
    expect(auditedBalance).toBeCloseTo(1.3);
    
    // ========================================
    // Test 5: Native SOL Withdrawal (wSOL unwrap)
    // ========================================
    console.log('Test 5: Native SOL withdrawal...');
    
    const aliceSOLBefore = await connection.getBalance(alice.publicKey);
    await ghostSol.withdraw(1.0); // Should unwrap wSOL → SOL
    const aliceSOLAfter = await connection.getBalance(alice.publicKey);
    
    expect(aliceSOLAfter).toBeGreaterThan(aliceSOLBefore + 0.9 * LAMPORTS_PER_SOL);
    
    // ========================================
    // Test 6: Verify Privacy Guarantees
    // ========================================
    console.log('Test 6: Verify privacy guarantees...');
    
    // Check Solana Explorer:
    // - Balances should be encrypted ✅
    // - Transfer amounts should be hidden ✅
    // - Stealth addresses should be unlinkable ✅
    
    const encryptedBalance = await ghostSol.getBalance();
    expect(encryptedBalance.exists).toBe(true);
    // Balance value should NOT be visible on-chain
    
    console.log('✅ All privacy features working!');
  });
});
```

### 2. Create `sdk/test/performance-benchmarks.test.ts`
Measure and validate performance:

```typescript
describe('Performance Benchmarks', () => {
  it('should meet all performance targets', async () => {
    const benchmarks = {
      proofGeneration: 0,
      depositTime: 0,
      transferTime: 0,
      withdrawTime: 0,
      balanceDecryption: 0,
      stealthAddressGen: 0,
      paymentScanning: 0
    };
    
    // Proof generation
    const start1 = Date.now();
    await generateTransferProof(/* ... */);
    benchmarks.proofGeneration = Date.now() - start1;
    
    // Deposit
    const start2 = Date.now();
    await ghostSol.deposit(1.0);
    benchmarks.depositTime = Date.now() - start2;
    
    // Transfer
    const start3 = Date.now();
    await ghostSol.transfer(recipient, 0.5);
    benchmarks.transferTime = Date.now() - start3;
    
    // ... measure all operations
    
    // Verify performance targets
    expect(benchmarks.proofGeneration).toBeLessThan(5000); // <5s CRITICAL
    expect(benchmarks.depositTime).toBeLessThan(10000); // <10s
    expect(benchmarks.transferTime).toBeLessThan(10000); // <10s
    expect(benchmarks.withdrawTime).toBeLessThan(10000); // <10s
    expect(benchmarks.balanceDecryption).toBeLessThan(1000); // <1s
    expect(benchmarks.stealthAddressGen).toBeLessThan(500); // <500ms
    expect(benchmarks.paymentScanning).toBeLessThan(10000); // <10s/1000tx
    
    console.log('Performance Benchmarks:', benchmarks);
  });
});
```

### 3. Create `sdk/test/security-audit.test.ts`
Security validation tests:

```typescript
describe('Security Audit Tests', () => {
  it('should not leak private keys in errors', async () => {
    try {
      await invalidOperation();
    } catch (error) {
      expect(error.message).not.toContain('secretKey');
      expect(error.message).not.toContain('privateKey');
    }
  });
  
  it('should reject invalid proofs', async () => {
    const invalidProof = generateInvalidProof();
    await expect(verifyProof(invalidProof)).rejects.toThrow();
  });
  
  it('should prevent negative balance attacks', async () => {
    await expect(transfer(recipient, -100)).rejects.toThrow();
  });
  
  it('should enforce viewing key permissions', async () => {
    const viewingKey = await alice.generateViewingKey({
      permissions: { allowedAccounts: [alice.publicKey] }
    });
    
    // Should not be able to decrypt Bob's balance
    await expect(
      bob.decryptBalance(viewingKey)
    ).rejects.toThrow();
  });
});
```

### 4. Update Documentation

**Create**: `docs/MAINNET_LAUNCH_CHECKLIST.md`
```markdown
# Mainnet Launch Checklist

## Pre-Launch (Week -1)
- [ ] All tests pass (unit, integration, E2E)
- [ ] Performance targets met (<5s proofs)
- [ ] Security audit complete (clean report)
- [ ] Documentation complete and reviewed
- [ ] Infrastructure deployed (Photon RPC, monitoring)
- [ ] Status page live (uptime.ghostsol.io)
- [ ] Emergency runbooks tested

## Launch Week
- [ ] Final code review
- [ ] Deploy to mainnet
- [ ] Smoke tests on mainnet
- [ ] Monitor for issues (24/7 on-call)
- [ ] Announce privacy mode launch

## Post-Launch (Week +1)
- [ ] Monitor performance metrics
- [ ] Track user adoption
- [ ] Collect feedback
- [ ] Iterate on UX improvements
```

**Create**: `docs/SECURITY.md`
```markdown
# Security Best Practices

## For Users
- Never share private keys
- Use viewing keys sparingly
- Verify encrypted balances regularly
- Enable payment scanning for stealth addresses

## For Developers
- Always validate proofs
- Never log private keys
- Use official crypto libraries
- Test security edge cases
```

## Success Criteria - MUST MEET ALL
- [ ] ✅ All E2E tests pass on devnet
- [ ] ✅ All performance targets met (<5s proofs CRITICAL)
- [ ] ✅ All security tests pass
- [ ] ✅ Test coverage >95% for privacy module
- [ ] ✅ Security audit scheduled (or complete)
- [ ] ✅ Documentation 100% complete
- [ ] ✅ Mainnet launch checklist ready
- [ ] ✅ No critical TODOs or FIXMEs in code
- [ ] ✅ Infrastructure deployed and monitored
- [ ] ✅ Team trained on runbooks
- [ ] ✅ Marketing materials ready

## Performance Targets (Final Validation)
```
MUST MEET ALL:
✅ Proof generation: <5 seconds (CRITICAL for UX)
✅ Deposit operation: <10 seconds end-to-end
✅ Transfer operation: <10 seconds end-to-end
✅ Withdraw operation: <10 seconds end-to-end
✅ Balance decryption: <1 second
✅ Stealth address generation: <500ms
✅ Payment scanning: <10 seconds per 1000 transactions
✅ Memory usage: <200MB for full SDK
✅ No memory leaks after 1000 operations
```

## Reference Documentation
- `/workspace/GHOSTSOL_IMPLEMENTATION_PLAN.md` (All phases)
- All previous issues [1/15] through [14/15]

## Time Estimate
3-4 days (Week 8, Days 5-7)

## Notes
- This is the final gate before mainnet - be thorough!
- If ANY performance target not met, optimize before launch
- Security is paramount - audit everything
- After this completes: READY FOR MAINNET! 🎉🎉🎉

## Deployment Steps (After This Issue Completes)
1. Tag release: `git tag v1.0.0-privacy`
2. Deploy to npm: `npm publish`
3. Deploy infrastructure to mainnet
4. Monitor closely for first 72 hours
5. Celebrate! 🎊
```

---

**End of Linear Issue Templates**

---

## Summary

Created 15 detailed Linear issue templates covering:

**Phase 1 (Issues 1-7): Core Privacy** - SPL Token 2022 Confidential Transfers
**Phase 2 (Issues 8-10): Infrastructure** - Photon RPC, Monitoring, Status Page
**Phase 3 (Issues 11-12): Native SOL** - wSOL wrapper integration
**Phase 4 (Issues 13-15): Advanced Privacy** - Stealth addresses, scanning, final testing

Each issue includes:
- Clear objective and success criteria
- Detailed implementation requirements
- Code examples and technical specs
- Testing strategy and performance targets
- Time estimates and dependencies
- Reference documentation links

**Total Timeline**: 8 weeks to production-ready privacy SDK

Copy each issue into Linear and assign to agents in order [1/15] → [2/15] → ... → [15/15]
