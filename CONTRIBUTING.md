# Contributing to Ghost Sol SDK

Thank you for your interest in contributing to Ghost Sol SDK! We welcome contributions from the community.

## 🎯 Project Goals

Ghost Sol SDK aims to provide a **simple, secure, and production-ready** privacy SDK for Solana developers. Our core principles:

- **Simplicity**: 3-line API for private transfers
- **Security**: Cryptographic best practices and thorough testing
- **Modularity**: Well-organized, reusable code with clear separation of concerns
- **Performance**: Optimized for real-world applications
- **Documentation**: Comprehensive docs and examples

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm or yarn
- Git
- TypeScript knowledge
- Basic understanding of Solana and cryptography (for core contributions)

### Setup Development Environment

1. **Fork and clone the repository**:
```bash
git clone https://github.com/YOUR_USERNAME/ghostsol.git
cd ghostsol
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the SDK**:
```bash
cd sdk
npm run build
```

4. **Run tests** (requires funded devnet wallet):
```bash
npm run test
```

5. **Set up environment variables**:
```bash
cp env.example .env
# Edit .env with your configuration (for local testing only)
```

## 🏗️ Development Workflow

### Branch Strategy

- `main` - Stable releases only
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `cursor/*` - Cursor AI-assisted development branches

### Making Changes

1. **Create a branch** from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following our coding standards (see below)

3. **Test your changes**:
```bash
npm run test
npm run build
```

4. **Commit your changes** with a descriptive message:
```bash
git commit -m "feat: add new stealth address feature"
```

5. **Push to your fork**:
```bash
git push origin feature/your-feature-name
```

6. **Open a Pull Request** with a clear description

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions or changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

Examples:
```
feat: add viewing key revocation support
fix: correct stealth address derivation bug
docs: update quick start guide
test: add e2e tests for compress/decompress
```

## 📝 Coding Standards

### TypeScript Style

- Use **TypeScript strict mode**
- Provide **type annotations** for all public APIs
- Use **interfaces** for complex types
- Prefer **const** over let, avoid var
- Use **async/await** over promises when possible

### Code Organization

```typescript
// 1. Imports (external, then internal)
import { Connection } from '@solana/web3.js';
import { WalletAdapter } from '../types';

// 2. Types and interfaces
export interface GhostSolConfig {
  wallet: WalletAdapter;
  cluster: 'devnet' | 'mainnet-beta';
}

// 3. Constants
const DEFAULT_COMMITMENT = 'confirmed';

// 4. Main class/functions
export class GhostSol {
  // Implementation
}

// 5. Helper functions (private/internal)
function privateHelper() {
  // Implementation
}
```

### Naming Conventions

- **Classes**: PascalCase (`GhostSol`, `StealthAddress`)
- **Functions**: camelCase (`generateStealthAddress`, `scanPayments`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_RPC_URL`)
- **Interfaces**: PascalCase with descriptive names (`StealthMetaAddress`)
- **Files**: kebab-case (`stealth-address.ts`, `viewing-keys.ts`)

### Documentation

- Add **JSDoc comments** for all public APIs:
```typescript
/**
 * Generate a stealth address for private payments.
 * 
 * @param spendingPublicKey - Recipient's spending public key
 * @param viewingPublicKey - Recipient's viewing public key
 * @returns Stealth address and ephemeral key
 * @throws {Error} If public keys are invalid
 */
export function generateStealthAddress(
  spendingPublicKey: PublicKey,
  viewingPublicKey: PublicKey
): StealthAddress {
  // Implementation
}
```

- Add inline comments for **complex logic**
- Update **README** and docs for new features
- Include **examples** for new APIs

### Error Handling

- Use **custom error classes** for specific error types
- Provide **helpful error messages**
- Never expose sensitive information in errors
- Log errors appropriately (never log private keys!)

```typescript
// Good
if (!isValidPublicKey(pubKey)) {
  throw new Error('Invalid public key format');
}

// Bad - exposes sensitive data
if (!isValidPrivateKey(privKey)) {
  throw new Error(`Invalid private key: ${privKey}`);
}
```

### Security Considerations

- **Never log or expose** private keys, seed phrases, or secrets
- **Validate all inputs** before cryptographic operations
- Use **cryptographically secure random** sources
- Follow **cryptographic best practices**
- Mark security-critical sections with comments:
```typescript
// SECURITY CRITICAL: Verify point is on curve
const isValid = validatePoint(publicKey);
```

## 🧪 Testing

### Test Requirements

All contributions should include tests:

- **Unit tests** for individual functions
- **Integration tests** for component interactions
- **E2E tests** for complete workflows

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npx tsx test/stealth-address.test.ts

# Run E2E tests (requires funded devnet account)
npx tsx test/e2e-test.ts
```

### Writing Tests

```typescript
import { generateStealthAddress } from '../src/privacy/stealth-address';

describe('Stealth Address', () => {
  it('should generate valid stealth address', () => {
    const spending = Keypair.generate();
    const viewing = Keypair.generate();
    
    const result = generateStealthAddress(
      spending.publicKey,
      viewing.publicKey
    );
    
    expect(result.stealthAddress).toBeDefined();
    expect(result.ephemeralKey).toBeDefined();
  });
});
```

## 📚 Documentation

### Documentation Structure

- `README.md` - Main project documentation
- `sdk/README.md` - SDK API documentation
- `docs/guides/` - User guides and tutorials
- `docs/security/` - Security documentation
- `docs/research/` - Research and design documents
- `examples/` - Example applications

### Updating Documentation

When making changes:
1. Update relevant markdown files
2. Update code examples if APIs change
3. Update CHANGELOG.md for version changes
4. Keep documentation in sync with code

## 🐛 Bug Reports

### Before Submitting

1. Check if the issue already exists
2. Test on the latest version
3. Verify it's not an environment issue

### Creating a Bug Report

Include:
- **Clear title** and description
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (Node.js version, OS, etc.)
- **Error messages** or logs (without sensitive data!)
- **Code snippet** demonstrating the issue

## 💡 Feature Requests

We welcome feature suggestions! Please:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** - why is this needed?
3. **Propose a solution** - how would it work?
4. **Consider alternatives** - are there other approaches?
5. **Discuss before implementing** - open an issue first for large changes

## 🔒 Security Contributions

For security-related contributions:

1. **Read SECURITY.md** first
2. **Report vulnerabilities privately** via GitHub Security Advisories
3. **Follow security best practices** in code
4. **Add security tests** for security features
5. **Document security assumptions** clearly

## 📋 Pull Request Process

### Before Submitting PR

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Commits follow convention
- [ ] No merge conflicts with main
- [ ] No sensitive data in commits

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, maintainers will merge
4. Your contribution will be credited in CHANGELOG

## 🎨 Code Review Guidelines

### For Contributors

- Respond to feedback professionally
- Ask questions if feedback is unclear
- Make requested changes promptly
- Keep discussion focused on code

### For Reviewers

- Be respectful and constructive
- Focus on code, not the person
- Explain the "why" behind suggestions
- Acknowledge good practices

## 📦 Release Process

Releases are handled by maintainers:

1. Version bump in package.json
2. Update CHANGELOG.md
3. Create git tag
4. Publish to npm
5. Create GitHub release

## 🙏 Recognition

Contributors will be:
- Listed in CHANGELOG for their contributions
- Credited in release notes
- Added to GitHub contributors list

## 💬 Getting Help

- 📖 Read the [documentation](./README.md)
- 💡 Check [GitHub Discussions](https://github.com/jskoiz/ghostsol/discussions)
- 🐛 Search [existing issues](https://github.com/jskoiz/ghostsol/issues)
- 💬 Join our Discord (coming soon)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Ghost Sol SDK!** 🎉

Every contribution, no matter how small, helps make privacy more accessible on Solana.
