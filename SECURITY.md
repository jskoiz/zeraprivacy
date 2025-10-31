# Security Policy

## Security Status

⚠️ **BETA SOFTWARE**: Ghost Sol SDK is currently in public beta (v0.1.0-beta). This software has **NOT been professionally audited** and is **NOT recommended for production use with real funds**.

### Current Security Status

| Component | Status | Notes |
|-----------|--------|-------|
| ZK Compression | ✅ Production | Uses audited Light Protocol infrastructure |
| Stealth Addresses | 🟡 Beta | Functional, needs security review |
| Viewing Keys | 🟡 Beta | Functional, client-side enforcement only |
| ElGamal Encryption | 🟡 Prototype | For testing only, production version in progress |
| Range Proofs | ⚠️ Placeholder | Not cryptographically secure |

### Supported Environments

- ✅ **Devnet**: Recommended for development and testing
- ⚠️ **Mainnet**: Not recommended until v1.0.0 stable release

## Security Features

### Implemented Privacy Protections

- ✅ **ZK Compression**: Hide transaction amounts and balances on-chain
- ✅ **Stealth Addresses**: Unlinkable one-time payment addresses using ECDH (secp256k1)
- ✅ **Viewing Keys**: Selective disclosure for regulatory compliance
- ✅ **Encrypted Balances**: Twisted ElGamal encryption over Ristretto255
- ✅ **Domain Separation**: Cryptographic domain separation prevents protocol collisions

### Security Assumptions

- Elliptic Curve Discrete Logarithm Problem (ECDLP) is hard on secp256k1 and Ristretto255
- Decisional Diffie-Hellman (DDH) assumption holds for ElGamal encryption
- SHA-256 and SHA-512 are collision-resistant and pre-image resistant
- AES-GCM provides authenticated encryption with unique nonces
- Platform CSPRNG (crypto.getRandomValues) provides secure randomness
- User private keys remain confidential and are never exposed

### Known Security Limitations

- ⚠️ Range proofs are placeholder only (no cryptographic proof of amount validity)
- ⚠️ Viewing key revocation is client-side only (not enforced on-chain)
- ⚠️ No explicit point validation for secp256k1 public keys
- ⚠️ No secure memory clearing for cryptographic key material
- ⚠️ RPC providers can observe query patterns (metadata leakage)
- ⚠️ Beta software - not audited for production use

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. **Use GitHub Security Advisories** (preferred): [Report a vulnerability](https://github.com/jskoiz/ghostsol/security/advisories/new)
3. **Include in your report**:
   - Detailed description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact and severity assessment
   - Suggested fix (if available)
   - Your contact information for follow-up

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Initial Assessment**: We will provide an initial assessment within 1 week
- **Communication**: We will keep you informed of our progress
- **Credit**: We will credit you in the security advisory (unless you prefer anonymity)
- **Disclosure Timeline**: We request 90 days for responsible disclosure

### Scope

**In Scope for Security Reports**:
- ✅ Cryptographic implementation vulnerabilities
- ✅ Key management or storage issues
- ✅ Input validation bypasses
- ✅ Authentication or authorization flaws
- ✅ Information disclosure vulnerabilities
- ✅ Denial of service vulnerabilities
- ✅ Code injection or execution vulnerabilities

**Out of Scope**:
- ❌ Social engineering attacks
- ❌ Physical security issues
- ❌ Third-party vulnerabilities (Light Protocol, Solana, Noble Crypto)
- ❌ Browser or operating system vulnerabilities
- ❌ Issues in example code or demo applications
- ❌ Theoretical attacks without practical exploitation

## Security Best Practices

### For Developers

- ✅ Never expose private keys or seed phrases in code, logs, or error messages
- ✅ Always verify recipient addresses before transfers
- ✅ Use environment variables for sensitive configuration (never commit `.env` files)
- ✅ Validate all user input before cryptographic operations
- ✅ Test thoroughly on devnet before any mainnet usage
- ✅ Keep viewing keys secure and revoke when no longer needed
- ✅ Keep all dependencies up to date
- ✅ Use TypeScript strict mode for type safety

### For Users

- ✅ Use hardware wallets when possible for key protection
- ✅ Verify recipient addresses through multiple channels
- ✅ Understand beta limitations before using the SDK
- ✅ Never share private keys, seed phrases, or viewing keys
- ✅ Keep wallet software and browser up to date
- ✅ Be aware that RPC providers can see query patterns
- ✅ Only use trusted RPC endpoints

### For Auditors

- 📁 Review cryptographic implementations in `sdk/src/privacy/` directory
- 🔍 Check security comments marked with "SECURITY CRITICAL" and "⚠️"
- ⚠️ Verify no insecure fallback behaviors in production code
- 🧪 Test with invalid inputs and malformed cryptographic parameters
- 📝 Review error handling for information leakage
- 🎲 Validate randomness sources and nonce uniqueness
- 📖 See [`docs/security/SECURITY_AUDIT_PREPARATION.md`](./docs/security/SECURITY_AUDIT_PREPARATION.md) for detailed audit guide

## Threat Model

### Protected Against

- ✅ Transaction linkability (stealth addresses prevent linking)
- ✅ Balance disclosure (encrypted balances hide amounts)
- ✅ Unauthorized viewing (viewing keys require explicit authorization)
- ✅ Passive network observers (HTTPS encryption on RPC traffic)
- ✅ Replay attacks (transaction nonces and blockhash expiration)

### NOT Protected Against (Out of Scope)

- ❌ Compromised user device with malware or keyloggers
- ❌ Physical access to unlocked wallet
- ❌ Social engineering or phishing attacks
- ❌ Quantum computer attacks (future threat)
- ❌ Malicious RPC provider censorship
- ❌ Browser extensions stealing wallet data
- ❌ Memory inspection or process dumps
- ❌ Side-channel attacks (timing, power, EM analysis)

## Security Roadmap

### v0.2.0-beta (Next Release)

- [ ] Remove insecure fallback behaviors
- [ ] Add explicit point validation for all public keys
- [ ] Implement constant-time comparison utilities
- [ ] Add secure memory clearing for key material
- [ ] Improve error messages (prevent information leakage)

### v0.3.0-beta

- [ ] Implement proper range proofs (Bulletproofs)
- [ ] On-chain viewing key registry for revocation
- [ ] ZK proof generation for confidential transfers
- [ ] Formal verification of key protocols

### v1.0.0 (Stable Release)

- [ ] Complete professional security audit
- [ ] All critical security issues resolved
- [ ] Production-ready cryptographic implementations
- [ ] Comprehensive security testing
- [ ] Mainnet deployment approved

## Security Documentation

Comprehensive security documentation is available for auditors and security researchers:

- [Security Audit Preparation](./docs/security/SECURITY_AUDIT_PREPARATION.md) - Complete guide for security auditors
- [Security Assumptions](./docs/security/SECURITY_ASSUMPTIONS.md) - Cryptographic and operational assumptions
- [Audit Checklist](./docs/security/AUDIT_CHECKLIST.md) - Systematic security review checklist
- [External Dependency Security](./docs/security/EXTERNAL_DEPENDENCY_SECURITY_AUDIT.md) - External dependencies analysis

## Compliance and Privacy

Ghost Sol SDK is designed with privacy-preserving features while maintaining regulatory compatibility:

- **Viewing Keys**: Allow selective disclosure for compliance and auditing
- **Stealth Addresses**: Provide transaction privacy while maintaining auditability
- **On-Chain Data**: All transactions are recorded on Solana blockchain
- **No Data Collection**: SDK does not collect or transmit user data to our servers

## Contact

For security-related questions or concerns:
- 🔒 Security Issues: Use GitHub Security Advisories
- 💬 General Questions: Open a GitHub Discussion
- 📧 Security Contact: [To be added]

---

**Last Updated**: 2025-10-31  
**Version**: 1.0.0 (for SDK v0.1.0-beta)
