# Security Policy

## API Keys and Secrets Management

### Never Commit API Keys

**DO NOT** commit API keys, secrets, or sensitive credentials to the repository.

### Proper API Key Configuration

The GhostSOL SDK requires API keys for optional third-party RPC providers. Here's how to configure them securely:

#### 1. Environment Variables (Recommended)

```bash
# Create a .env file (this file is gitignored)
cp .env.example .env

# Edit .env and add your API keys
HELIUS_API_KEY=your_actual_helius_api_key_here
```

#### 2. Runtime Configuration

```typescript
// In Node.js applications
process.env.HELIUS_API_KEY = 'your_api_key';

// Initialize SDK (it will use the environment variable)
const ghostSol = new GhostSol();
await ghostSol.init({
  cluster: 'devnet',
  commitment: 'confirmed'
});
```

#### 3. Custom RPC URL (No API Key Needed)

```typescript
// Use your own RPC endpoint
await ghostSol.init({
  cluster: 'devnet',
  rpcUrl: 'https://your-custom-rpc.example.com'
});
```

## RPC Provider Failover Without API Keys

If you don't set `HELIUS_API_KEY`, the SDK will automatically skip Helius in the failover chain:

1. GhostSOL Primary RPC (Priority 1)
2. ~~Helius (skipped - no API key)~~
3. Light Protocol (Priority 3)
4. Solana Public RPC (Priority 4, devnet only)

The SDK will log a warning but continue to work with available providers.

## Obtaining API Keys

### Helius

1. Visit [https://helius.xyz](https://helius.xyz)
2. Sign up for a free or paid account
3. Create an API key in your dashboard
4. Add to `.env` file: `HELIUS_API_KEY=your_key`

## Security Best Practices

### Development

- ✅ Use `.env` files for local development
- ✅ Add `.env` to `.gitignore`
- ✅ Use `.env.example` as a template (no real keys)
- ❌ Never commit `.env` files
- ❌ Never hardcode API keys in source code

### Production

- ✅ Use environment variables
- ✅ Use secret management services (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate API keys regularly
- ✅ Use least-privilege access
- ❌ Never log API keys
- ❌ Never expose API keys in client-side code

### CI/CD

```yaml
# GitHub Actions example
env:
  HELIUS_API_KEY: ${{ secrets.HELIUS_API_KEY }}
```

```bash
# GitLab CI example
variables:
  HELIUS_API_KEY: $HELIUS_API_KEY  # Set in CI/CD settings
```

## Revoking Compromised Keys

If an API key is accidentally committed:

1. **Immediately revoke the key** in the provider's dashboard
2. **Generate a new key**
3. **Update your environment variables**
4. **Rewrite git history** (if necessary):
   ```bash
   # Remove file from git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch path/to/file" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (WARNING: coordinate with team)
   git push origin --force --all
   ```

## Reporting Security Issues

If you discover a security vulnerability, please email security@ghostsol.io instead of creating a public issue.

## Vulnerability Disclosure Policy

- **Response Time**: We aim to respond within 24 hours
- **Fix Timeline**: Critical issues will be patched within 7 days
- **Public Disclosure**: After fix is deployed and users have time to update

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Security Audits

This project has not yet undergone a formal security audit. Use in production at your own risk.

## Dependencies

We regularly update dependencies to patch security vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## License

See LICENSE file for security-related terms and conditions.

---

**Last Updated**: 2025-10-29  
**Document Version**: 1.0
