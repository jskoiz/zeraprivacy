# NPM Publishing Guide

This guide explains how to publish the Ghost Sol SDK to npm, both manually and using automation.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Publishing Beta Releases](#publishing-beta-releases)
- [Publishing Stable Releases](#publishing-stable-releases)
- [Automated Publishing with GitHub Actions](#automated-publishing-with-github-actions)
- [Version Management](#version-management)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### 1. npm Account Setup

1. **Create an npm account** (if you don't have one):
   - Visit https://www.npmjs.com/signup
   - Or run: `npm adduser`

2. **Login to npm**:
   ```bash
   npm login
   ```
   This will prompt you for:
   - Username
   - Password
   - Email (will be public)
   - One-time password (if 2FA is enabled)

3. **Verify login**:
   ```bash
   npm whoami
   ```

4. **Enable 2FA (Recommended)**:
   ```bash
   npm profile enable-2fa auth-and-writes
   ```

### 2. Organization Access

If publishing under an organization:
- Ensure you have publish permissions for the `ghost-sol` package
- Contact the organization owner if you need access

### 3. Environment Setup

Ensure you have:
- Node.js >= 18.0.0
- npm >= 8.0.0
- Access to the repository
- A clean working directory (no uncommitted changes)

## Publishing Beta Releases

Beta releases are used for testing and early access before a stable release.

### Using the Publish Script (Recommended)

The easiest way to publish a beta release:

```bash
# From repository root
./scripts/publish-beta.sh
```

The script will:
1. ✅ Verify npm authentication
2. ✅ Display current version and suggest next version
3. ✅ Clean and build the SDK
4. ✅ Run tests (if available)
5. ✅ Show package contents for verification
6. ✅ Publish to npm with `beta` tag
7. ✅ Provide next steps for git tagging

**Beta Version Format**: `X.Y.Z-beta.N`
- Example: `0.1.0-beta.0`, `0.1.0-beta.1`, `0.2.0-beta.0`

### Manual Beta Publishing

If you prefer to publish manually:

```bash
# Navigate to SDK directory
cd sdk

# Clean previous build
rm -rf dist

# Build the package
npm run build

# Update version (choose one)
npm version 0.1.0-beta.0 --no-git-tag-version  # Specific version
npm version prerelease --preid=beta --no-git-tag-version  # Auto-increment

# Verify package contents
npm pack --dry-run

# Publish with beta tag
npm publish --tag beta --access public

# Go back to root
cd ..
```

### Installing Beta Releases

Users can install beta releases using:

```bash
# Install latest beta
npm install ghost-sol@beta

# Install specific beta version
npm install ghost-sol@0.1.0-beta.0
```

## Publishing Stable Releases

Stable releases should only be published after thorough testing of beta releases.

### Using the Publish Script

```bash
# From repository root
./scripts/publish-beta.sh

# When prompted for version, enter stable version without -beta suffix
# Example: 0.1.0, 1.0.0, 1.2.3
```

### Manual Stable Publishing

```bash
cd sdk

# Clean and build
rm -rf dist
npm run build

# Update to stable version
npm version 0.1.0 --no-git-tag-version

# Verify package contents
npm pack --dry-run

# Publish as latest
npm publish --access public

cd ..
```

### Installing Stable Releases

```bash
# Install latest stable version (default)
npm install ghost-sol

# Install specific version
npm install ghost-sol@0.1.0
```

## Automated Publishing with GitHub Actions

The repository includes a GitHub Actions workflow for automated publishing.

### Setup GitHub Actions

1. **Create npm access token**:
   ```bash
   npm token create
   ```
   - Choose "Automation" type for GitHub Actions
   - Copy the token (it starts with `npm_`)

2. **Add token to GitHub secrets**:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste the npm token
   - Click "Add secret"

3. **Enable workflow**:
   - The workflow file is at `.github/workflows/publish-beta.yml`
   - It triggers automatically on push to version tags

### Publishing via GitHub Actions

#### Option 1: Manual Workflow Trigger

1. Go to repository → Actions → "Publish Beta to npm"
2. Click "Run workflow"
3. Select branch
4. Enter version (e.g., `0.1.0-beta.1`)
5. Click "Run workflow"

#### Option 2: Git Tag Trigger

```bash
# Update version in sdk/package.json
cd sdk
npm version 0.1.0-beta.1 --no-git-tag-version
cd ..

# Commit the version change
git add sdk/package.json
git commit -m "chore: bump version to 0.1.0-beta.1"

# Create and push tag
git tag v0.1.0-beta.1
git push origin main --tags

# GitHub Actions will automatically build and publish
```

### Workflow Features

The GitHub Actions workflow:
- ✅ Builds the SDK
- ✅ Runs tests
- ✅ Publishes to npm
- ✅ Creates GitHub release
- ✅ Posts status notifications

## Version Management

### Semantic Versioning

Ghost Sol follows [Semantic Versioning (SemVer)](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features (backwards compatible)
- **PATCH** (0.0.X): Bug fixes (backwards compatible)

### Beta Version Lifecycle

1. **Development**: Work on new features in feature branches
2. **Beta Testing**: 
   - Release `X.Y.Z-beta.0`
   - Gather feedback
   - Fix issues
   - Release `X.Y.Z-beta.1`, `X.Y.Z-beta.2`, etc.
3. **Stable Release**: When ready, release `X.Y.Z`

### Version Bumping Commands

```bash
# Patch: 0.1.0 → 0.1.1
npm version patch --no-git-tag-version

# Minor: 0.1.1 → 0.2.0
npm version minor --no-git-tag-version

# Major: 0.2.0 → 1.0.0
npm version major --no-git-tag-version

# Beta: 0.1.0 → 0.1.0-beta.0
npm version prerelease --preid=beta --no-git-tag-version

# Next beta: 0.1.0-beta.0 → 0.1.0-beta.1
npm version prerelease --preid=beta --no-git-tag-version
```

## Package Configuration

### package.json Key Fields

```json
{
  "name": "ghost-sol",
  "version": "0.1.0",
  "description": "Privacy SDK for Solana developers using ZK Compression",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.mjs"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "require": "./dist/react/index.js",
      "import": "./dist/react/index.mjs"
    }
  },
  "files": [
    "dist"
  ]
}
```

### .npmignore

The `.npmignore` file excludes:
- Source files (`src/`, `test/`)
- Configuration files (`tsconfig.json`, `tsup.config.ts`)
- Development files (`*.test.ts`, `.env`)
- Build artifacts (`node_modules/`, `coverage/`)

Only the `dist/` directory and essential files are published.

## Pre-Publishing Checklist

Before publishing, ensure:

- [ ] All tests pass: `cd sdk && npm test`
- [ ] Build succeeds: `cd sdk && npm run build`
- [ ] Version is updated correctly
- [ ] CHANGELOG.md is updated (if exists)
- [ ] README.md is current
- [ ] No sensitive data in code or config
- [ ] Dependencies are correct in package.json
- [ ] Package contents verified: `npm pack --dry-run`

## Verifying Published Package

After publishing:

1. **Check npm registry**:
   ```bash
   npm view ghost-sol
   npm view ghost-sol@beta
   ```

2. **Test installation**:
   ```bash
   # In a test directory
   mkdir test-install && cd test-install
   npm init -y
   npm install ghost-sol@beta
   ```

3. **Verify exports**:
   ```bash
   node -e "console.log(require('ghost-sol'))"
   ```

4. **Check on npmjs.com**:
   - Visit https://www.npmjs.com/package/ghost-sol
   - Verify version, description, and README display correctly

## Troubleshooting

### "You must be logged in to publish packages"

**Solution**: Run `npm login` and enter your credentials.

### "You do not have permission to publish"

**Solutions**:
- Verify package name is available: `npm view ghost-sol`
- Check organization membership if using scoped package
- Contact package owner for access

### "Package name too similar to existing package"

**Solution**: Choose a more unique name or request name transfer from npm support.

### "402 Payment Required"

**Solution**: This is a confusing error that usually means authentication failed. Try:
```bash
npm logout
npm login
```

### Build or tests fail before publishing

**Solution**:
- Fix errors locally first
- Ensure `npm run build` completes successfully
- Verify tests pass: `npm test`
- Check for TypeScript errors

### Wrong files included in package

**Solution**:
- Review `.npmignore` and `"files"` in package.json
- Use `npm pack --dry-run` to preview contents
- Ensure only `dist/` and necessary files are included

### Beta tag not working

**Solution**:
- Beta releases must use `--tag beta` flag
- Verify version format: `X.Y.Z-beta.N`
- Check tag exists: `npm dist-tag ls ghost-sol`

### Cannot publish over existing version

**Solution**:
- npm doesn't allow republishing same version
- Increment version number
- For beta: use next beta number (e.g., beta.1 → beta.2)

## npm Commands Reference

```bash
# View package info
npm view ghost-sol
npm view ghost-sol versions
npm view ghost-sol dist-tags

# Manage tags
npm dist-tag ls ghost-sol
npm dist-tag add ghost-sol@0.1.0-beta.1 beta
npm dist-tag rm ghost-sol beta

# Unpublish (only within 72 hours)
npm unpublish ghost-sol@0.1.0-beta.1

# Check what will be published
npm pack --dry-run

# Login/logout
npm login
npm logout
npm whoami

# Token management
npm token list
npm token create
npm token revoke <token-id>
```

## Best Practices

1. **Always test beta versions** before stable release
2. **Use semantic versioning** consistently
3. **Update documentation** before publishing
4. **Create git tags** for published versions
5. **Keep CHANGELOG** updated
6. **Test package installation** after publishing
7. **Use 2FA** for added security
8. **Review package contents** before publishing
9. **Communicate breaking changes** clearly
10. **Monitor npm for issues** after release

## Support

For questions or issues with publishing:
- Open an issue on GitHub
- Contact the maintainers
- Check [npm documentation](https://docs.npmjs.com/)

## Related Documentation

- [Version Management Guide](../workflow/BRANCH_WORKFLOW_GUIDE.md)
- [Contributing Guidelines](../../README.md#contributing)
- [Setup Documentation](../SETUP.md)
