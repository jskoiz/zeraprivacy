# GhostSol Improvement Plan: Native Privacy & Security

This document outlines the steps to upgrade GhostSol (Zera) to use **Native Solana Privacy (SPL Token 2022)** and fix critical security vulnerabilities.

## Strategy
1.  **Remove Compression:** Delete all Light Protocol dependencies.
2.  **Native ZK Privacy:** Implement **SPL Token 2022 Confidential Transfers**. This uses Twisted ElGamal encryption and Sigma protocols (ZK proofs) natively on Solana.
3.  **Secure Stealth Addresses:** Fix the critical `verifyStealthAddress` vulnerability.

---

## Part 1: Cleanup (Remove Compression)

Remove unused dependencies to reduce bloat and confusion.

*   **Action:** Uninstall `@lightprotocol/stateless.js` and `@lightprotocol/compressed-token`.
*   **Result:** A clean, standard Solana SDK dependency tree.

---

## Part 2: Implementing Real SPL Confidential Transfers

We will replace the "simulated" methods in `ConfidentialTransferManager` with the actual SPL Token 2022 instructions.

### 1. Architecture
*   **Standard:** Use `@solana/spl-token` to build Confidential Transfer instructions.
*   **ZK Layer:** The SPL Token 2022 program *is* the ZK verifier. The client must provide encrypted balances and proofs.

### 2. Implementation Details

#### A. Setup (Mint & Account)
We must initialize the mint and accounts with the `ConfidentialTransfer` extension.

```typescript
// sdk/src/privacy/confidential-transfer.ts

import { 
  ExtensionType, 
  createInitializeMintInstruction, 
  createInitializeAccountInstruction,
  createInitializeConfidentialTransferMintInstruction, // Need to verify availability or construct manually
  // ... other SPL imports
} from '@solana/spl-token';

// Inside createConfidentialMint:
// 1. SystemProgram.createAccount (space for Mint + Extension)
// 2. createInitializeConfidentialTransferMintInstruction(...)
// 3. createInitializeMintInstruction(...)
```

#### B. Shielding (Deposit)
This is a `Deposit` instruction in the Confidential Transfer extension.

```typescript
async deposit(account: PublicKey, mint: PublicKey, amount: number) {
  // 1. Create Deposit Instruction
  // This converts Public Balance -> Confidential (Encrypted) Balance
  
  const ix = createDepositInstruction(
    account, // Confidential Token Account
    mint,
    amount,
    decimals,
    // ... proof data (if required by the specific instruction version)
  );
  
  return await this._sendTransaction(new Transaction().add(ix));
}
```

#### C. Private Transfer
This is the core "ZK" operation. It requires generating a Twisted ElGamal encryption of the amount and a validity proof.

*   **Challenge:** Generating the ZK proof in pure JS/TS is complex.
*   **Solution for SDK:** We will structure the SDK to build the *correct instruction*. If the client-side proof generation libraries are missing from the environment, we will document that the transaction will fail on-chain *unless* a proof server or WASM module is hooked up.
*   **Improvement:** We can implement the **ElGamal Encryption** part in TS (using `@noble/curves`) so the *data* is correctly encrypted, even if the *proof* (validity) is a placeholder for the hackathon demo. This is "Honest Implementation" vs "Fake Simulation".

---

## Part 3: Fixing Stealth Addresses (CRITICAL)

The current `verifyStealthAddress` returns `true`. We must implement the math.

### 1. The Fix
We need to verify that: `StealthAddr == SpendKey + Hash(SharedSecret) * G`

```typescript
// sdk/src/privacy/stealth-address.ts

verifyStealthAddress(
  stealthAddress: PublicKey,
  metaAddress: StealthMetaAddress,
  ephemeralPublicKey: PublicKey
): boolean {
  // 1. We need the Shared Secret. 
  // IF we are the SENDER, we know Ephemeral Private Key.
  // IF we are the RECEIVER, we know View Private Key.
  
  // Since this is likely a utility for the Receiver to validate an incoming payment:
  // We need the View Private Key to be passed in, OR we assume the context has it.
  
  // Updated Signature:
  // verifyStealthAddress(stealthAddress, metaAddress, ephemeralPublicKey, viewPrivateKey)
  
  try {
    const sharedSecret = this.computeSharedSecret(ephemeralPublicKey, viewPrivateKey);
    const derivedKey = this.deriveStealthPublicKey(metaAddress.spendPublicKey, sharedSecret);
    return derivedKey.equals(stealthAddress);
  } catch {
    return false;
  }
}
```

---

## Part 4: Execution Plan

1.  **Dependencies:** Remove Light Protocol.
2.  **Stealth Address Fix:**
    *   Update `verifyStealthAddress` signature and logic.
    *   Add unit test to prove it fails on invalid addresses.
3.  **Confidential Transfer Refactor:**
    *   Rewrite `createConfidentialMint` to actually add the `ConfidentialTransferMint` extension.
    *   Rewrite `deposit` to use `createDepositInstruction` (or manual construction if helper missing).
    *   Rewrite `transfer` to use `createTransferInstruction` (with encrypted payloads).
4.  **Demo Update:**
    *   Update `cli-demo.ts` to reflect the new Native SPL flow.
