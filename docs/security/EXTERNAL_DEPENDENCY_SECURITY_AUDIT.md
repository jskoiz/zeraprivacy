# GhostSOL External Dependency Security Audit
**Date**: 2025-10-31  
**Issue**: AVM-29 - External Dependency Check  
**Status**: ⚠️ CRITICAL SECURITY ISSUE FOUND

---

## Executive Summary

This audit identifies all external dependencies, API keys, and accounts required for GhostSOL. A **critical security vulnerability** has been identified: Helius RPC API keys are hardcoded in the source code and committed to the repository.

### Critical Findings
- 🔴 **CRITICAL**: Helius API keys hardcoded in `sdk/src/core/types.ts` (lines 135-136)
- 🟡 **WARNING**: No environment variable configuration system in place
- 🟢 **GOOD**: No private keys or secrets committed to repository
- 🟢 **GOOD**: Proper `.gitignore` configuration for `.env` files

---

## 1. CRITICAL SECURITY ISSUES

### 1.1 Hardcoded Helius API Keys ⚠️ IMMEDIATE ACTION REQUIRED

**Location**: `sdk/src/core/types.ts` lines 135-136

```typescript
export const LIGHT_PROTOCOL_RPC_ENDPOINTS = {
  devnet: 'https://devnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf',
  mainnet: 'https://mainnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf'
};
```

**Severity**: CRITICAL

**Risks**:
- API key is public in version control history
- Anyone can use these keys, potentially exhausting rate limits
- Financial costs if keys are abused
- Service disruption for all GhostSOL users
- Security audit trail cannot track who made which requests

**Impact**: HIGH - Affects all SDK users on both devnet and mainnet

**Remediation Required**: YES - IMMEDIATE

---

## 2. External Dependencies Identified

### 2.1 RPC Infrastructure

#### Helius RPC Service
- **Purpose**: ZK Compression indexing and query operations
- **Current Status**: ⚠️ Hardcoded API keys (insecure)
- **Networks**: Devnet and Mainnet
- **Account Required**: YES
- **Cost**: ~$500-2000/month for production usage

**Recommended Actions**:
1. Create dedicated Helius account for GhostSOL project
2. Generate separate API keys for dev/staging/production
3. Implement environment variable configuration
4. Rotate existing compromised keys immediately
5. Set up usage alerts and rate limiting

#### Solana RPC Endpoints
- **Purpose**: Standard Solana blockchain operations
- **Current Status**: ✅ Using public endpoints (no keys required)
- **Networks**: 
  - Devnet: `https://api.devnet.solana.com`
  - Mainnet: `https://api.mainnet-beta.solana.com`
- **Account Required**: NO (public endpoints)
- **Cost**: FREE (rate-limited)

### 2.2 NPM Dependencies

#### Critical Dependencies
All dependencies are properly managed through package.json:

**Light Protocol Stack**:
- `@lightprotocol/stateless.js@^0.21.0`
- `@lightprotocol/compressed-token@^0.21.0`

**Solana Stack**:
- `@solana/web3.js@^1.98.0`
- `@solana/spl-token@^0.4.0`
- `@coral-xyz/anchor@^0.30.1`

**Cryptography Stack**:
- `@noble/curves@^1.4.0`
- `@noble/hashes@^1.4.0`

**Status**: ✅ All dependencies properly declared
**Account Required**: NO (public npm registry)
**Security**: ✅ Using semantic versioning with caret ranges

### 2.3 Wallet Adapters (Browser)

**Solana Wallet Adapters**:
- `@solana/wallet-adapter-base@^0.9.27`
- `@solana/wallet-adapter-react@^0.15.39`
- `@solana/wallet-adapter-react-ui@^0.9.39`
- `@solana/wallet-adapter-wallets@^0.19.37`

**Status**: ✅ Client-side only, no server credentials required
**Account Required**: NO
**User Requirement**: Users need Phantom or compatible wallet

### 2.4 Development & Build Tools

**Build Tools**:
- TypeScript: `^5.5.0`
- tsup: `^8.0.0` (SDK bundler)
- Next.js: `16.0.0` (demo app)

**Status**: ✅ All development dependencies properly configured
**Account Required**: NO

### 2.5 Infrastructure Services (Future/Optional)

#### Mentioned but Not Yet Required:
- **AWS/GCP**: For self-hosted Photon RPC (future deployment)
- **Vercel**: For demo app deployment (optional)
- **Netlify**: Alternative deployment option (optional)

**Current Status**: Not actively used
**Account Required**: Only if deploying infrastructure
**When Needed**: Phase 2 (6-12 months according to docs)

---

## 3. Required Accounts & API Keys

### 3.1 IMMEDIATE REQUIREMENTS

#### ✅ GitHub Account
- **Purpose**: Version control, CI/CD
- **Status**: Already configured
- **Repository**: `https://github.com/jskoiz/ghostsol`
- **Access Control**: Ensure proper team access controls

#### ⚠️ Helius RPC Account (PRIORITY)
- **Purpose**: ZK Compression RPC operations
- **Status**: NEEDS NEW ACCOUNT & API KEYS
- **Action Required**: 
  1. Create account at https://helius.dev
  2. Generate API keys for:
     - Development/Testing (devnet)
     - Staging (devnet)
     - Production (mainnet)
  3. Configure usage alerts
  4. Set up rate limiting
- **Estimated Cost**: 
  - Free tier: Limited requests
  - Developer: $99/month
  - Professional: $499/month
  - Enterprise: Custom pricing
- **Required For**: Core SDK functionality

#### ✅ NPM Registry
- **Purpose**: Package distribution
- **Status**: Using public registry (no auth needed for install)
- **Publishing**: Requires npm account only if publishing updates
- **Current Access**: Package is private (not published yet)

### 3.2 OPTIONAL/FUTURE ACCOUNTS

#### Solana Devnet Faucets
- **Solana Official Faucet**: https://faucet.solana.com
  - Requires: GitHub account with public repos
- **QuickNode Faucet**: https://faucet.quicknode.com/solana/devnet
  - Requires: No account
- **Purpose**: Testing SOL acquisition
- **Account Required**: GitHub account (for official faucet)

#### Cloud Infrastructure (Phase 2)
- **AWS or GCP Account**
  - Purpose: Self-hosted Photon RPC indexer
  - Required: Only for Phase 2 (6-12 months out)
  - Estimated Cost: $1000-1500/month
  - Specifications:
    - 16+ CPU cores
    - 32GB+ RAM
    - 2TB+ NVMe SSD
    - 1Gbps+ network

#### Deployment Platforms (Optional)
- **Vercel Account**
  - Purpose: Demo application hosting
  - Free tier available
  - Account Required: Only if deploying public demo
- **Netlify Account**
  - Purpose: Alternative deployment platform
  - Free tier available
  - Account Required: Only if using Netlify

---

## 4. Security Configuration Checklist

### 4.1 IMMEDIATE ACTIONS REQUIRED ⚠️

- [ ] **CRITICAL**: Rotate Helius API keys immediately
  - [ ] Create new Helius account or verify existing
  - [ ] Generate new API keys (dev, staging, prod)
  - [ ] Revoke/deactivate exposed keys (`7bab09d6-...`)
  
- [ ] **HIGH**: Implement environment variable configuration
  - [ ] Create `.env.example` template files
  - [ ] Add environment variable loading to SDK
  - [ ] Update documentation with env var setup
  - [ ] Verify `.env` files are in `.gitignore` (✅ Already done)
  
- [ ] **HIGH**: Remove hardcoded API keys from codebase
  - [ ] Update `sdk/src/core/types.ts` to read from environment
  - [ ] Provide fallback mechanism for missing keys
  - [ ] Add clear error messages for missing configuration
  
- [ ] **MEDIUM**: Set up Helius monitoring
  - [ ] Configure usage alerts (80%, 90%, 100% thresholds)
  - [ ] Set up rate limiting
  - [ ] Enable logging for security audit trail
  
- [ ] **MEDIUM**: Document credential management
  - [ ] Create SECURITY.md with key rotation procedures
  - [ ] Document environment variable setup
  - [ ] Add credential management to team onboarding

### 4.2 Security Best Practices

#### Implemented ✅
- `.gitignore` properly configured for `.env` files
- No private keys committed to repository
- No wallet seed phrases in code
- Proper dependency version management
- TypeScript for type safety

#### Needs Implementation ⚠️
- Environment variable configuration system
- API key rotation policy
- Secrets management documentation
- Security incident response plan
- Rate limiting and monitoring

---

## 5. Recommended Environment Variable Structure

### 5.1 Proposed `.env` Structure

Create `.env.example`:

```bash
# Helius RPC Configuration
HELIUS_API_KEY_DEVNET=your_devnet_api_key_here
HELIUS_API_KEY_MAINNET=your_mainnet_api_key_here

# Optional: Custom RPC Endpoints
CUSTOM_RPC_URL_DEVNET=https://api.devnet.solana.com
CUSTOM_RPC_URL_MAINNET=https://api.mainnet-beta.solana.com

# Optional: Alternative Helius Keys (for fallback/rotation)
HELIUS_API_KEY_DEVNET_BACKUP=your_backup_devnet_key
HELIUS_API_KEY_MAINNET_BACKUP=your_backup_mainnet_key

# SDK Configuration
SDK_ENVIRONMENT=development # development | staging | production
SDK_LOG_LEVEL=info # error | warn | info | debug

# Demo App Configuration (Next.js)
NEXT_PUBLIC_CLUSTER=devnet # devnet | mainnet-beta
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### 5.2 Code Changes Required

**Update `sdk/src/core/types.ts`**:

```typescript
/**
 * Light Protocol ZK Compression RPC endpoints
 * Load from environment variables for security
 */
export const LIGHT_PROTOCOL_RPC_ENDPOINTS = {
  devnet: process.env.HELIUS_API_KEY_DEVNET 
    ? `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY_DEVNET}`
    : undefined,
  mainnet: process.env.HELIUS_API_KEY_MAINNET 
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY_MAINNET}`
    : undefined
};
```

**Add validation in `sdk/src/core/rpc.ts`**:

```typescript
const lightProtocolRpcUrl = LIGHT_PROTOCOL_RPC_ENDPOINTS[cluster];
if (!lightProtocolRpcUrl) {
  throw new Error(
    `Helius RPC endpoint not configured for ${cluster}. ` +
    `Please set HELIUS_API_KEY_${cluster.toUpperCase().replace('-', '_')} environment variable.`
  );
}
```

---

## 6. Cost Estimates

### 6.1 Current Requirements

| Service | Type | Estimated Cost | Priority |
|---------|------|----------------|----------|
| Helius RPC (Development) | Subscription | $99-499/month | CRITICAL |
| GitHub Repository | Free (public) | $0 | CURRENT |
| NPM Registry | Free (public) | $0 | CURRENT |
| Solana Devnet | Free | $0 | CURRENT |

**Total Current Monthly**: $99-499/month

### 6.2 Future Infrastructure (Phase 2)

| Service | Type | Estimated Cost | Timeline |
|---------|------|----------------|----------|
| AWS/GCP Forester Nodes | Infrastructure | $1000/month | 6-12 months |
| AWS/GCP Photon RPC | Infrastructure | $500-1000/month | 6-12 months |
| Monitoring & Logging | Service | $50-100/month | 6-12 months |

**Total Phase 2 Monthly**: $1,550-2,100/month

### 6.3 Optional Services

| Service | Type | Estimated Cost | Priority |
|---------|------|----------------|----------|
| Vercel Deployment | Hosting | $0-20/month | LOW |
| Domain Name | Registration | $10-15/year | LOW |
| SSL Certificates | Security | $0 (Let's Encrypt) | LOW |

---

## 7. Security Recommendations

### 7.1 Immediate (Week 1)
1. **CRITICAL**: Rotate Helius API keys
2. **CRITICAL**: Implement environment variable configuration
3. **HIGH**: Remove hardcoded credentials from codebase
4. **HIGH**: Set up Helius usage monitoring and alerts
5. **MEDIUM**: Create security documentation (SECURITY.md)

### 7.2 Short-term (Month 1)
1. Implement API key rotation policy (every 90 days)
2. Set up separate keys for dev/staging/production
3. Configure rate limiting and DDoS protection
4. Implement request logging for security auditing
5. Add automated security scanning (Dependabot, Snyk)

### 7.3 Long-term (Months 2-6)
1. Evaluate secrets management solution (AWS Secrets Manager, HashiCorp Vault)
2. Implement multi-provider RPC fallback (Helius → Alchemy → QuickNode)
3. Plan migration to self-hosted Photon RPC (Phase 2)
4. Set up SOC 2 compliance monitoring
5. Conduct external security audit

---

## 8. Compliance & Privacy Notes

### 8.1 Privacy Architecture
- **User Privacy**: Protected by ZK Compression and SPL Token 2022 cryptography
- **Infrastructure Trust**: Helius RPC can see query patterns but NOT decrypt balances
- **Key Management**: All user private keys remain client-side (browser/app)

### 8.2 Data Privacy
- No user credentials stored on servers
- No transaction history logged by SDK
- RPC queries may be logged by Helius (see their privacy policy)
- Consider self-hosted Photon RPC for maximum privacy (Phase 2)

### 8.3 Regulatory Considerations
- Ensure Helius RPC usage complies with ToS
- Monitor usage for potential abuse
- Implement rate limiting for fair use
- Consider data residency requirements for different regions

---

## 9. Action Items Summary

### Team Lead / Project Owner
- [ ] Create Helius account at https://helius.dev
- [ ] Generate API keys (dev, staging, prod)
- [ ] Share keys securely with development team (use password manager)
- [ ] Set up billing alerts
- [ ] Review Helius SLA and pricing tiers
- [ ] Approve security implementation budget

### Development Team
- [ ] Implement environment variable configuration system
- [ ] Update `sdk/src/core/types.ts` to remove hardcoded keys
- [ ] Add proper error handling for missing configuration
- [ ] Update documentation with setup instructions
- [ ] Create `.env.example` template files
- [ ] Test SDK with new configuration system
- [ ] Update CI/CD pipeline with environment variables

### DevOps / Security Team
- [ ] Revoke/rotate exposed Helius API keys
- [ ] Set up Helius monitoring and alerts
- [ ] Configure rate limiting
- [ ] Implement logging for security audits
- [ ] Set up automated security scanning
- [ ] Create incident response procedures

### Documentation Team
- [ ] Create SECURITY.md file
- [ ] Update SETUP.md with environment variable instructions
- [ ] Document API key rotation procedures
- [ ] Add troubleshooting guide for configuration issues
- [ ] Update team onboarding documentation

---

## 10. Additional Resources

### Account Creation Links
- **Helius**: https://helius.dev
- **Solana Faucet**: https://faucet.solana.com
- **QuickNode**: https://faucet.quicknode.com/solana/devnet
- **AWS**: https://aws.amazon.com
- **GCP**: https://cloud.google.com
- **Vercel**: https://vercel.com

### Documentation
- **Helius Documentation**: https://docs.helius.dev
- **Light Protocol**: https://docs.lightprotocol.com
- **Solana Documentation**: https://docs.solana.com
- **SPL Token 2022**: https://spl.solana.com/token-2022

### Security Resources
- **OWASP API Security**: https://owasp.org/www-project-api-security/
- **Solana Security Best Practices**: https://docs.solana.com/developing/programming-model/security
- **GitHub Security Best Practices**: https://docs.github.com/en/code-security

---

## Appendix A: Current Hardcoded Keys

**Location**: `sdk/src/core/types.ts:135-136`

**Exposed API Key**: `7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`

**Used In**:
- Devnet endpoint: `https://devnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`
- Mainnet endpoint: `https://mainnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`

**Also Documented In**:
- `docs/SETUP.md` (lines 124-125)
- `docs/research/liveness-and-infra.md` (line 384)

**Remediation**: 
1. Immediately verify if this key is active
2. Revoke key if it belongs to your organization
3. Generate new keys with proper access controls
4. Update codebase to use environment variables

---

## Appendix B: Verified Secure Practices

✅ **No Private Keys Committed**
- Searched entire codebase
- No wallet private keys found
- No seed phrases in code

✅ **Proper .gitignore Configuration**
- `.env` files excluded
- `.env.local` excluded
- `.env.*` patterns excluded
- Private key patterns excluded (`.key`, `.pem`)

✅ **No Process.env Usage Yet**
- No environment variables currently used (good - easier to implement cleanly)
- No risk of leaked env vars in client-side code

✅ **Dependency Management**
- All dependencies properly declared in package.json
- Using semantic versioning
- No suspicious or untrusted packages
- Regular npm packages from official registry

---

**Report Generated**: 2025-10-31  
**Auditor**: Cursor AI Security Audit  
**Next Review**: After implementing immediate actions (Week 1)
