# Migration Guide

This guide helps you migrate between major versions of the Ghost Sol SDK.

## Table of Contents

- [General Migration Strategy](#general-migration-strategy)
- [Beta to v1.0.0 (Upcoming)](#beta-to-v100-upcoming)
- [Migration Best Practices](#migration-best-practices)
- [Breaking Changes Policy](#breaking-changes-policy)
- [Getting Help](#getting-help)

---

## General Migration Strategy

### Before You Migrate

1. **Read the CHANGELOG**: Review `CHANGELOG.md` for the target version
2. **Check Breaking Changes**: Look for breaking changes marked with ⚠️
3. **Review Deprecation Warnings**: Update deprecated APIs before migrating
4. **Test on Devnet**: Always test migrations on devnet first
5. **Backup Data**: Ensure you have backups of any important keys or data

### Migration Steps

1. **Update Dependencies**
   ```bash
   npm install ghost-sol@latest
   ```

2. **Update Imports** (if changed)
   ```typescript
   // Check if import paths have changed
   import { init, compress, transfer } from 'ghost-sol';
   ```

3. **Update Configuration** (if changed)
   ```typescript
   // Review initialization options
   await init({
     wallet: keypair,
     cluster: 'devnet',
     // Check for new or changed options
   });
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

5. **Update Production** (after thorough testing)

---

## Beta to v1.0.0 (Upcoming)

> **Status**: Future migration - v1.0.0 not yet released

This section will be updated when v1.0.0 is released. Expected changes:

### Expected Breaking Changes

#### 1. ElGamal Encryption Implementation
**Change**: Replace prototype ElGamal with production-ready, audited implementation

**Beta (v0.1.0-beta)**:
```typescript
// Prototype encryption - for testing only
import { encryptBalance } from 'ghost-sol';
const encrypted = await encryptBalance(balance);
```

**v1.0.0 (Expected)**:
```typescript
// Production encryption with additional security parameters
import { encryptBalance } from 'ghost-sol';
const encrypted = await encryptBalance(balance, {
  // May require additional configuration
  encryptionLevel: 'standard' // or 'high'
});
```

**Migration Steps**:
1. Review updated encryption API documentation
2. Update encryption calls with new parameters
3. Re-encrypt any stored encrypted data
4. Update test fixtures with new encryption format

#### 2. Blockchain Scanning API
**Change**: Add automated blockchain scanning for stealth addresses

**Beta (v0.1.0-beta)**:
```typescript
// Manual ephemeral key collection required
const ephemeralKeys = [...]; // Manual collection
const payments = await GhostSol.scanForPayments(
  metaAddress,
  viewPrivateKey,
  ephemeralKeys
);
```

**v1.0.0 (Expected)**:
```typescript
// Automated scanning with indexer
const payments = await GhostSol.scanBlockchainForPayments(
  metaAddress,
  viewPrivateKey,
  {
    fromBlock: 0,           // Optional: scan from specific block
    toBlock: 'latest',      // Optional: scan to specific block
    indexerUrl: '...'       // Optional: custom indexer URL
  }
);
```

**Migration Steps**:
1. Remove manual ephemeral key collection code
2. Update scanning calls with new automated API
3. Configure indexer endpoint if using custom infrastructure
4. Test scanning performance and adjust parameters

#### 3. Configuration Structure
**Change**: Enhanced configuration options for production

**Beta (v0.1.0-beta)**:
```typescript
await init({
  wallet: keypair,
  cluster: 'devnet',
  privacy: { mode: 'privacy' }
});
```

**v1.0.0 (Expected)**:
```typescript
await init({
  wallet: keypair,
  cluster: 'mainnet-beta',
  privacy: { 
    mode: 'privacy',
    // New configuration options
    encryption: {
      provider: 'production-elgamal',
      level: 'standard'
    },
    scanning: {
      indexerUrl: 'https://indexer.ghostsol.io',
      autoSync: true
    }
  }
});
```

**Migration Steps**:
1. Review new configuration options
2. Update initialization code
3. Configure indexer and encryption settings
4. Test with production configuration on devnet

#### 4. Error Handling
**Change**: More specific error types and error codes

**Beta (v0.1.0-beta)**:
```typescript
try {
  await compress(amount);
} catch (error) {
  console.error('Compression failed:', error);
}
```

**v1.0.0 (Expected)**:
```typescript
import { GhostSolError, ErrorCode } from 'ghost-sol';

try {
  await compress(amount);
} catch (error) {
  if (error instanceof GhostSolError) {
    switch (error.code) {
      case ErrorCode.INSUFFICIENT_BALANCE:
        // Handle insufficient balance
        break;
      case ErrorCode.ENCRYPTION_FAILED:
        // Handle encryption failure
        break;
      default:
        // Handle other errors
    }
  }
}
```

**Migration Steps**:
1. Import new error types
2. Update error handling logic
3. Add specific error case handling
4. Update error messages for users

### Expected New Features (Non-Breaking)

These features will be added without breaking existing APIs:

- **Transaction History API**: Query past private transactions
- **SPL Token Support**: Privacy for any Solana token
- **Hardware Wallet Support**: Ledger integration
- **Performance Optimizations**: Faster operations
- **Mainnet Support**: Production-ready for mainnet-beta

---

## Migration Best Practices

### 1. Version Pinning

During beta, pin to specific versions to avoid unexpected changes:

```json
{
  "dependencies": {
    "ghost-sol": "0.1.0-beta"
  }
}
```

Before v1.0.0, use exact versions rather than semver ranges.

### 2. Testing Strategy

**Test Migration in Stages**:

1. **Development Environment**
   ```bash
   npm install ghost-sol@next
   npm run test
   ```

2. **Staging/Testnet**
   ```bash
   # Deploy to staging
   # Run integration tests
   # Manual QA testing
   ```

3. **Production** (after v1.0.0)
   ```bash
   # Gradual rollout
   # Monitor error rates
   # Be ready to rollback
   ```

### 3. Deprecation Handling

When APIs are deprecated:

```typescript
// Old API (deprecated)
await oldFunction(); // ⚠️ Deprecation warning in console

// New API (recommended)
await newFunction(); // ✅ No warnings
```

**Best Practice**: Update to new APIs as soon as possible, even if old APIs still work.

### 4. Data Migration

If data format changes:

```typescript
// Example: Migrating encrypted balances
async function migrateEncryptedData(oldEncrypted: OldFormat): Promise<NewFormat> {
  // 1. Decrypt with old format
  const decrypted = await decryptWithOldFormat(oldEncrypted);
  
  // 2. Re-encrypt with new format
  const newEncrypted = await encryptWithNewFormat(decrypted);
  
  return newEncrypted;
}
```

### 5. Rollback Plan

Always have a rollback strategy:

```json
{
  "dependencies": {
    "ghost-sol": "0.1.0-beta"  // Known working version
  }
}
```

Keep previous version available:
```bash
npm install ghost-sol@0.1.0-beta --save-exact
```

---

## Breaking Changes Policy

### Semantic Versioning

Ghost Sol SDK follows [Semantic Versioning](https://semver.org/):

- **Major version** (x.0.0): Breaking changes
- **Minor version** (0.x.0): New features, backward compatible
- **Patch version** (0.0.x): Bug fixes, backward compatible

### Beta Versions (0.x.x-beta)

During beta:
- **Minor versions may include breaking changes**
- **APIs are subject to change without notice**
- **Not recommended for production use**

### Stable Versions (1.0.0+)

After v1.0.0:
- **Breaking changes only in major versions**
- **Deprecation warnings before removal**
- **6-month deprecation period minimum**
- **Clear migration path provided**

### Deprecation Process

1. **Announcement**: Feature marked as deprecated in documentation
2. **Warning**: Console warnings in code
3. **Documentation**: Migration guide updated
4. **Deprecation Period**: Minimum 6 months (stable versions)
5. **Removal**: Feature removed in next major version

---

## Getting Help

### Migration Support

If you encounter issues during migration:

1. **Check Documentation**
   - Review `CHANGELOG.md` for the target version
   - Read API documentation in `/sdk/README.md`
   - Check this migration guide

2. **Search Issues**
   - GitHub Issues: Search for similar problems
   - Look for migration-related issues

3. **Community Support**
   - Discord: [Join our Discord]
   - GitHub Discussions: Ask questions
   - Twitter: [@ghostsol]

4. **Report Problems**
   - Open GitHub Issue with:
     - Current version
     - Target version
     - Code example
     - Error messages
     - Expected vs actual behavior

### Common Migration Issues

#### Issue: Build Errors After Update

**Solution**:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist
npm run build
```

#### Issue: Type Errors

**Solution**:
```bash
# Update TypeScript types
npm install @types/node@latest --save-dev

# Check TypeScript version compatibility
npm list typescript
```

#### Issue: Runtime Errors

**Solution**:
1. Check breaking changes in CHANGELOG
2. Review deprecation warnings in console
3. Update configuration format
4. Verify wallet adapter compatibility

---

## Version-Specific Guides

### Migrating from v0.1.0-beta to v0.2.0-beta

> **Status**: v0.2.0-beta not yet released

This section will be populated when v0.2.0-beta is released.

### Migrating from v0.x.x-beta to v1.0.0

> **Status**: v1.0.0 not yet released

This section will be populated when v1.0.0 is released. Expected changes include:
- Production-ready ElGamal encryption
- Automated blockchain scanning
- Mainnet support
- Enhanced error handling
- Transaction history API

---

## Feedback

This migration guide is a living document. If you have suggestions for improvement:

- Open a GitHub Issue
- Submit a Pull Request
- Discuss in Discord

Your feedback helps us improve the migration experience for all users!

---

**Last Updated**: 2025-10-31 (v0.1.0-beta release)

**Next Review**: When v0.2.0-beta or v1.0.0 is released
