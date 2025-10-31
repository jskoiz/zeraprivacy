# GhostSOL Security Assumptions

**Version**: 1.0.0  
**Date**: 2025-10-31  
**Purpose**: Document security assumptions and trust boundaries for the GhostSOL SDK

---

## Executive Summary

This document explicitly states all security assumptions made by the GhostSOL SDK. Understanding these assumptions is critical for:
1. **Security auditors** evaluating the implementation
2. **Developers** integrating the SDK into applications
3. **Users** understanding the security properties and limitations

⚠️ **IMPORTANT**: Violations of these assumptions may compromise the security properties of the SDK.

---

## 1. Cryptographic Assumptions

### 1.1 Elliptic Curve Discrete Logarithm Problem (ECDLP)

**Assumption**: The discrete logarithm problem is computationally hard on:
- **secp256k1** (used for stealth addresses)
- **Ristretto255** / ed25519 (used for encryption)

**Implication**: 
- Stealth addresses provide unlinkability
- Encrypted balances remain confidential
- Private keys cannot be derived from public keys

**Risk**: Quantum computers may break ECDLP in the future

**Mitigation**: Future versions will support post-quantum cryptography

---

### 1.2 Decisional Diffie-Hellman (DDH) Assumption

**Assumption**: Given (g, g^a, g^b, g^c), it is hard to distinguish whether c = ab or c is random

**Used In**:
- ElGamal encryption (Twisted ElGamal over Ristretto255)
- ECDH for stealth addresses
- ECDH for viewing key encryption

**Implication**:
- Encrypted amounts are semantically secure
- Stealth address shared secrets are indistinguishable from random
- Viewing key encryption is secure against eavesdroppers

**Breaking this assumption**: Would allow decryption of encrypted balances without private keys

---

### 1.3 Hash Function Security

**Assumption**: SHA-256 and SHA-512 are:
- **Collision resistant**: Hard to find x ≠ y such that H(x) = H(y)
- **Pre-image resistant**: Given H(x), hard to find x
- **Second pre-image resistant**: Given x, hard to find y ≠ x such that H(x) = H(y)

**Used In**:
- Key derivation functions (KDF)
- Pedersen commitment blinding factors
- Domain separation in cryptographic protocols
- Account-specific viewing key derivation
- Ephemeral key hashing in stealth addresses

**Risk**: SHA-256/SHA-512 collision attacks would compromise key derivation and commitments

**Mitigation**: Well-established hash functions with no known practical attacks

---

### 1.4 AES-GCM Security

**Assumption**: AES-256-GCM provides:
- **Confidentiality**: Ciphertext reveals no information about plaintext
- **Authenticity**: Tampering with ciphertext is detected
- **Nonce uniqueness**: Each encryption uses a unique nonce (IV)

**Used In**:
- Symmetric encryption of amounts in Twisted ElGamal
- Viewing key encryption for auditors

**Critical Requirement**: **NEVER reuse nonce with same key**

**Current Implementation**: Uses `crypto.getRandomValues()` for 12-byte IV generation

**Risk**: Nonce reuse catastrophically breaks AES-GCM security

**Mitigation**: 
- Random IV generation using CSPRNG
- 12-byte IV provides 2^96 possible values (collision probability negligible)

---

## 2. Randomness Assumptions

### 2.1 Cryptographically Secure Random Number Generator (CSPRNG)

**Assumption**: The platform-provided RNG is cryptographically secure:
- **Browser**: `crypto.getRandomValues()` (Web Crypto API)
- **Node.js**: `crypto.getRandomValues()` (Node.js crypto module)

**Used For**:
- Ephemeral keypair generation (stealth addresses)
- AES-GCM IV/nonce generation
- ElGamal encryption randomness
- Keypair generation (via Solana web3.js)

**Critical Property**: Outputs are unpredictable and uniformly distributed

**Risk**: Weak RNG breaks ALL cryptographic security properties

**Mitigation**: 
- Rely on OS-level entropy sources
- No custom RNG implementations
- Platform crypto libraries used exclusively

---

### 2.2 No Randomness Reuse

**Assumption**: Random values are never reused across different cryptographic operations

**Examples of Reuse Vulnerabilities**:
- ❌ Reusing ephemeral key `r` in stealth addresses → Links payments
- ❌ Reusing AES-GCM nonce → Breaks confidentiality and authenticity
- ❌ Reusing ElGamal randomness → Allows ciphertext comparison attacks

**Current Implementation**: Fresh randomness generated for each operation

**Verification**: Auditors should verify no global or cached random values

---

## 3. Key Management Assumptions

### 3.1 Private Key Secrecy

**Assumption**: User private keys remain secret and are never exposed

**User Responsibilities**:
- ✅ Secure wallet storage (hardware wallet, encrypted storage)
- ✅ Seed phrase backup and protection
- ✅ No sharing of private keys or seed phrases
- ✅ Protection against keyloggers and malware

**SDK Responsibilities**:
- ✅ Never log or transmit private keys
- ✅ Keep keys in memory only when needed
- ✅ No serialization of private keys to disk
- ✅ No inclusion of keys in error messages

**Risk**: Private key compromise allows attacker to:
- Spend user funds
- Decrypt all encrypted balances
- Generate valid viewing keys
- Impersonate user

**NOT Protected Against**:
- ❌ Malware on user's device
- ❌ Physical access to unlocked wallet
- ❌ Memory dumps or process inspection
- ❌ Side-channel attacks on user's hardware

---

### 3.2 Key Derivation Uniqueness

**Assumption**: Different accounts and purposes derive distinct keys

**Stealth Addresses**:
- View key and spend key are independently generated
- No key reuse between different meta-addresses

**Viewing Keys**:
- Each account has unique viewing key (derived from account address)
- Viewing keys for different accounts are unlinkable

**Security Property**: Compromise of one key does not affect other keys

**Verification**: Key derivation paths use account-specific salt/domain separation

---

### 3.3 Viewing Key Access Control

**Assumption**: Viewing keys are distributed only to authorized auditors

**User Responsibilities**:
- ✅ Generate viewing keys only for trusted auditors
- ✅ Use time-limited viewing keys (expiration)
- ✅ Revoke viewing keys when no longer needed
- ✅ Monitor viewing key usage

**SDK Guarantees**:
- ✅ Viewing keys cannot spend funds (read-only)
- ✅ Viewing keys are account-specific (no cross-account access)
- ✅ Expiration is enforced before decryption
- ✅ Permissions checked before allowing access

**Limitation**: 
- ⚠️ Viewing key revocation is client-side only (not enforced on-chain)
- ⚠️ Copied viewing keys cannot be remotely revoked

---

## 4. Protocol Assumptions

### 4.1 Stealth Address Protocol

**Assumption 1: Ephemeral Key Published On-Chain**
- Sender must publish ephemeral public key R = r*G in transaction memo
- Recipient scans blockchain for ephemeral keys to detect payments

**Risk**: Blockchain scanning reveals recipient's view key to RPC provider

**Mitigation**: Run local RPC node for maximum privacy (future work)

**Assumption 2: View Key and Spend Key Separation**
- View key detects payments (no spending authority)
- Spend key is required to spend detected payments

**Security Property**: View key compromise does NOT allow theft of funds

**Assumption 3: Unlinkability**
- Each stealth address is unique and unlinkable to recipient
- Requires fresh ephemeral key for each payment

**Risk**: Ephemeral key reuse links multiple payments to same recipient

---

### 4.2 Viewing Key Protocol

**Assumption 1: Account-Specific Derivation**
- Viewing keys are derived deterministically from account address
- XOR-based key derivation allows key recovery

**Security Property**: Same viewing key regenerated for same account

**Risk**: XOR mask predictability could allow unauthorized key recovery

**Assumption 2: Auditor Public Key Authenticity**
- When encrypting viewing key for auditor, auditor's public key is authentic
- No man-in-the-middle during key exchange

**User Responsibility**: Verify auditor's public key through secure channel

**Risk**: MITM attacker could receive viewing key instead of legitimate auditor

**Assumption 3: Client-Side Permission Enforcement**
- Viewing key expiration and permissions checked client-side
- No on-chain enforcement of viewing key validity

**Limitation**: Malicious client could bypass permission checks

**Future Work**: On-chain viewing key registry for revocation

---

### 4.3 ZK Compression Protocol

**Assumption 1: Light Protocol Correctness**
- ZK Compression indexer (Photon) correctly indexes compressed accounts
- State tree updates are properly synchronized
- RPC endpoints return accurate data

**Trust Model**: SDK trusts Light Protocol infrastructure

**Risk**: Corrupted indexer could show incorrect balances or miss transactions

**Mitigation**: Future support for running local Photon indexer

**Assumption 2: SPL Token 2022 Security**
- Token-2022 program is secure and audited
- Confidential transfer extension works as documented
- On-chain state transitions are valid

**Trust Model**: SDK trusts Solana runtime and deployed programs

**Assumption 3: RPC Endpoint Honesty**
- RPC endpoints (Helius, public) return correct blockchain data
- No censorship or transaction filtering

**Privacy Limitation**: RPC provider can see query patterns (metadata leakage)

---

## 5. Implementation Assumptions

### 5.1 Platform Assumptions

**Assumption 1: JavaScript Engine Security**
- Browser JavaScript engine is not compromised
- Node.js runtime is not compromised
- No malicious code injection into SDK execution

**Assumption 2: Web Crypto API Correctness**
- AES-GCM implementation is correct and secure
- Random number generator is cryptographically secure
- No implementation bugs in platform crypto libraries

**Assumption 3: Memory Safety**
- No memory corruption vulnerabilities in JavaScript runtime
- No memory leaks exposing sensitive data
- Garbage collector properly clears unreferenced memory

**Limitation**: JavaScript is not a memory-safe language for key material

**Future Work**: Consider WebAssembly for security-critical operations

---

### 5.2 Dependency Assumptions

**Assumption 1: Noble Crypto Libraries**
- `@noble/curves` and `@noble/hashes` are secure and correctly implemented
- No backdoors or vulnerabilities in library code
- Semantic versioning updates do not introduce breaking changes

**Verification**: Noble libraries are well-audited and open source

**Assumption 2: Solana Libraries**
- `@solana/web3.js` correctly implements Solana protocol
- `@solana/spl-token` correctly interacts with Token programs
- No vulnerabilities in transaction signing logic

**Assumption 3: Light Protocol Libraries**
- `@lightprotocol/stateless.js` correctly implements ZK Compression protocol
- `@lightprotocol/compressed-token` securely handles compressed tokens
- No vulnerabilities in proof generation or verification

**Supply Chain Risk**: Compromised dependency could undermine all security

**Mitigation**: 
- Use lockfile for reproducible builds
- Monitor security advisories
- Enable Dependabot for automated updates

---

## 6. Operational Assumptions

### 6.1 Network Assumptions

**Assumption 1: TLS/SSL Security**
- RPC connections use HTTPS with valid certificates
- No man-in-the-middle attacks on RPC traffic
- Certificate validation is properly enforced

**Assumption 2: RPC Endpoint Availability**
- RPC endpoints remain available and responsive
- No persistent downtime or service disruption
- Fallback RPC endpoints provide continuity

**Limitation**: RPC provider can:
- ✅ See transaction patterns (metadata)
- ✅ Censor or delay transactions
- ❌ Cannot decrypt encrypted balances (requires private key)

**Assumption 3: Network Latency**
- Blockchain confirmations occur within expected time
- No long-term network partitions
- Reorg handling is correct

---

### 6.2 User Environment Assumptions

**Assumption 1: Secure User Device**
- User's device is free from malware
- No keyloggers or screen capture software
- Operating system is up to date with security patches

**NOT Protected Against**:
- ❌ Compromised device with root/admin access
- ❌ Browser extensions stealing data
- ❌ Physical access to unlocked device

**Assumption 2: Secure Wallet Storage**
- Browser wallet extensions (Phantom, etc.) are secure
- Hardware wallets properly protect private keys
- Wallet backup/recovery is handled securely by user

**Assumption 3: User Awareness**
- Users verify recipient addresses before transfers
- Users understand privacy properties and limitations
- Users follow best practices for key management

---

## 7. Beta Software Limitations

### 7.1 Prototype Components

**⚠️ NOT PRODUCTION-READY**:

1. **ElGamal Encryption** (`sdk/src/privacy/encryption.ts`)
   - Prototype implementation for testing only
   - Range proofs are placeholder (not cryptographically secure)
   - ZK proof generation not fully implemented

2. **Stealth Address Fallback** (`sdk/src/privacy/stealth-address.ts`)
   - Fallback to hash-based shared secret if secp256k1 fails
   - Fallback undermines unlinkability (should be removed for production)

3. **Viewing Key Revocation**
   - Client-side only (not enforced on-chain)
   - Copied viewing keys cannot be remotely invalidated

**Assumption**: Users understand these are beta limitations and do not rely on them for production security

---

### 7.2 Testing-Only Assumptions

**Devnet Environment**:
- ✅ Beta software tested on devnet only
- ✅ No mainnet deployment recommended
- ✅ Test funds only (no real value)

**Assumption**: Users do NOT use this SDK with real funds on mainnet until v1.0.0 stable release

**Security Audit**: Professional security audit required before mainnet use

---

## 8. Threat Model

### 8.1 Threats We Protect Against

**✅ Protected Against**:
1. **Transaction Linkability**: Stealth addresses prevent linking payments to recipient
2. **Balance Disclosure**: Encrypted balances hide amounts from blockchain observers
3. **Unauthorized Viewing**: Viewing keys require explicit authorization
4. **Passive Network Observer**: HTTPS encryption protects RPC traffic
5. **Replay Attacks**: Transaction nonces and blockhash expiration prevent replays

**✅ Partially Protected**:
1. **Metadata Leakage**: RPC provider sees query patterns but not decrypted data
2. **Timing Analysis**: Some timing side-channels may exist (library-dependent)

---

### 8.2 Threats We Do NOT Protect Against

**❌ Out of Scope**:
1. **Compromised User Device**: Malware with keylogger access
2. **Physical Access**: Attacker with access to unlocked wallet
3. **Social Engineering**: Phishing or fraud targeting users
4. **Quantum Computers**: Future quantum attacks on elliptic curves
5. **Malicious RPC Provider**: Censorship or transaction filtering
6. **Browser Extensions**: Malicious extensions stealing wallet data
7. **Memory Inspection**: Process memory dumps revealing keys
8. **Side-Channel Attacks**: Timing, power, or EM analysis of cryptographic operations

**Mitigation (Future)**:
- Post-quantum cryptography (long-term)
- Local RPC node support (privacy)
- Hardware wallet integration (key protection)

---

## 9. Breaking Assumptions: Impact Analysis

| Assumption Violated | Impact | Severity |
|---------------------|--------|----------|
| ECDLP hardness | All privacy lost | CRITICAL |
| DDH hardness | Encrypted balances decryptable | CRITICAL |
| Hash function collision | Key derivation compromised | CRITICAL |
| AES-GCM security | Encrypted amounts decryptable | CRITICAL |
| CSPRNG security | Predictable keys, nonces | CRITICAL |
| Private key secrecy | Funds stolen, privacy lost | CRITICAL |
| Ephemeral key uniqueness | Payments linkable | HIGH |
| Viewing key access control | Unauthorized balance disclosure | HIGH |
| Noble library security | Variable (depends on vulnerability) | HIGH |
| RPC endpoint honesty | Incorrect balances, censorship | MEDIUM |
| TLS/SSL security | Metadata exposure | MEDIUM |
| User device security | Key theft, malware | HIGH |

---

## 10. Security Assumptions for Auditors

### 10.1 Audit Scope

**Assumptions Within Audit Scope**:
- ✅ Cryptographic implementation correctness
- ✅ Key derivation and management
- ✅ Protocol design and security properties
- ✅ Input validation and error handling
- ✅ Random number generation usage

**Assumptions Outside Audit Scope**:
- ❌ Platform crypto library implementations (Web Crypto, Noble)
- ❌ Solana blockchain security
- ❌ Light Protocol infrastructure security
- ❌ Hardware and OS-level security

---

### 10.2 Recommended Verification

**Auditors Should Verify**:
1. ✅ All randomness comes from CSPRNG
2. ✅ No nonce/IV reuse in AES-GCM
3. ✅ Ephemeral keys generated fresh for each stealth address
4. ✅ Private key arithmetic is correct (modulo curve order)
5. ✅ Point validation for all public keys
6. ✅ Domain separation in hash-based protocols
7. ✅ Error handling does not leak sensitive information
8. ✅ Viewing keys cannot spend funds
9. ✅ Fallback encryption methods are secure or removed

---

## 11. Assumptions Summary

### Critical Assumptions (Breaking these is catastrophic)
1. ECDLP is hard on secp256k1 and Ristretto255
2. DDH assumption holds for ElGamal encryption
3. SHA-256/SHA-512 are collision-resistant
4. AES-GCM is secure with unique nonces
5. CSPRNG provides unpredictable randomness
6. User private keys remain secret

### Important Assumptions (Breaking these degrades security)
7. Ephemeral keys are never reused (stealth addresses)
8. Viewing keys distributed only to authorized auditors
9. Noble crypto libraries are secure and correct
10. RPC endpoints return honest data

### Operational Assumptions (Breaking these affects usability)
11. TLS/SSL protects RPC traffic
12. User device is free from malware
13. Wallet software is secure and trusted

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-31 | GhostSOL Team | Initial security assumptions documentation |

---

**Related Documents**:
- [SECURITY_AUDIT_PREPARATION.md](./SECURITY_AUDIT_PREPARATION.md) - Audit preparation guide
- [AUDIT_CHECKLIST.md](./AUDIT_CHECKLIST.md) - Auditor checklist
- [EXTERNAL_DEPENDENCY_SECURITY_AUDIT.md](./EXTERNAL_DEPENDENCY_SECURITY_AUDIT.md) - Dependency audit

---

**Note for Users**: If any of these assumptions are violated in your environment, the security properties of GhostSOL may be compromised. Please report security concerns via GitHub Security Advisories.
