# Zera v1.0.0 - NPM Publish Checklist

This document provides a comprehensive checklist and instructions for publishing Zera v1.0.0 to npm.

---

## ✅ Pre-Publish Checklist

### Code Quality
- [x] All TypeScript errors resolved
- [x] Build successful (CJS + ESM + DTS)
- [x] All tests passing
- [x] Linter warnings addressed
- [x] No console.log or debug statements in production code
- [x] Code reviewed and approved

### Version Management
- [x] Version updated to `1.0.0` in `sdk/package.json`
- [x] Version updated to `1.0.0` in root `package.json`
- [x] CHANGELOG.md updated with v1.0.0 release notes
- [x] All version references consistent across files

### Documentation
- [x] README.md up to date
- [x] API documentation complete
- [x] Examples working and tested
- [x] Migration guide prepared (if needed)
- [x] GitHub release notes drafted
- [x] Launch announcement drafted

### Package Configuration
- [x] package.json metadata correct (name, description, keywords, author, license)
- [x] Repository URL correct
- [x] Homepage URL set
- [x] Bugs URL set
- [x] Package exports configured correctly
- [x] Files array includes all necessary files
- [x] .npmignore configured (or using files whitelist)

### Build Artifacts
- [x] Clean build completed successfully
- [x] dist/ folder contains all required files
- [x] Type definitions (.d.ts) generated correctly
- [x] Source maps generated (for debugging)
- [x] No development artifacts in dist/

### Security
- [ ] npm audit run (no high/critical vulnerabilities)
- [ ] Dependencies reviewed and up to date
- [ ] No sensitive data in code or config
- [ ] .env and secrets not included in package
- [ ] Security documentation reviewed

### Legal
- [x] LICENSE file present
- [ ] License compatible with dependencies
- [ ] No proprietary code included
- [ ] Attribution for third-party code complete

---

## 📋 Pre-Publish Commands

Run these commands before publishing:

### 1. Clean and Install Dependencies
```bash
cd /workspace
rm -rf node_modules package-lock.json
npm install
```

### 2. Run Security Audit
```bash
npm audit
npm audit fix  # If safe fixes available
```

### 3. Build the Package
```bash
cd /workspace/sdk
npm run build
```

### 4. Verify Build Output
```bash
ls -la dist/
# Should see:
# - index.js, index.mjs, index.d.ts
# - react/index.js, react/index.mjs, react/index.d.ts
# - All necessary chunks and source maps
```

### 5. Test Package Locally
```bash
# Pack the package locally
npm pack

# This creates: zera-1.0.0.tgz
# Test installation in a separate project:
# npm install /path/to/zera-1.0.0.tgz
```

### 6. Verify Package Contents
```bash
tar -tzf zera-1.0.0.tgz | head -20

# Should see:
# package/package.json
# package/dist/...
# package/README.md
# (etc)
```

---

## 🚀 Publishing Steps

### Step 1: Login to npm

```bash
npm login

# You'll be prompted for:
# - Username
# - Password
# - Email
# - OTP (if 2FA enabled)
```

**Important**: Make sure you're logged in as the correct npm user with publish permissions.

### Step 2: Dry Run (Recommended)

```bash
cd /workspace/sdk
npm publish --dry-run

# This shows what would be published without actually publishing
# Review the output carefully
```

### Step 3: Publish to npm

```bash
cd /workspace/sdk
npm publish --access public

# For scoped packages:
# npm publish --access public

# The package will be published with the "latest" tag by default
```

**Expected Output**:
```
+ zera@1.0.0
```

### Step 4: Verify Publication

```bash
# Check on npmjs.com
open https://www.npmjs.com/package/zera

# Or use npm view
npm view zera

# Should show:
# zera@1.0.0 | MIT | deps: 7 | versions: X
```

### Step 5: Test Installation

```bash
# In a fresh directory
mkdir test-install && cd test-install
npm init -y
npm install zera@1.0.0

# Verify it installed correctly
node -e "console.log(require('zera'))"
```

---

## 🏷️ Post-Publish: Create GitHub Release

### Step 1: Create Git Tag

```bash
cd /workspace
git tag -a v1.0.0 -m "Release v1.0.0: First stable release"
git push origin v1.0.0
```

### Step 2: Create GitHub Release

**Using GitHub CLI**:
```bash
gh release create v1.0.0 \
  --title "Zera v1.0.0 - Stable Release" \
  --notes-file docs/deployment/GITHUB_RELEASE_v1.0.0.md \
  --latest
```

**Using GitHub Web Interface**:
1. Go to https://github.com/jskoiz/ghostsol/releases/new
2. Select tag: `v1.0.0`
3. Release title: `Zera v1.0.0 - Stable Release`
4. Copy contents from `docs/deployment/GITHUB_RELEASE_v1.0.0.md`
5. Mark as "Set as the latest release"
6. Click "Publish release"

---

## 📢 Post-Publish: Announcements

### Social Media Announcements

#### Twitter/X
```
🎉 Zera v1.0.0 is LIVE! 

Build privacy-preserving Solana apps with just 3 lines of code:

✅ Stealth Addresses
✅ Viewing Keys  
✅ ZK Compression
✅ React Support

npm install zera@1.0.0

📚 Docs: github.com/jskoiz/ghostsol

#Solana #Web3 #Privacy #Blockchain
```

#### LinkedIn
```
Excited to announce the v1.0.0 release of Zera SDK!

Zera makes it easy for developers to add privacy features to Solana applications using ZK Compression, stealth addresses, and viewing keys.

Key features:
• Simple 3-line API for private transfers
• Stealth addresses for receiver privacy
• Viewing keys for compliance
• Full TypeScript support
• React integration

Check it out: https://github.com/jskoiz/ghostsol

#Blockchain #Privacy #Solana #DeFi #Web3
```

#### Reddit (r/solana, r/solanadev)
```
Title: [Release] Zera v1.0.0 - Privacy SDK for Solana

Body:
Hey Solana devs! 👋

I'm excited to share Zera v1.0.0, a privacy-focused SDK that makes it easy to add privacy features to your Solana applications.

Features:
• ZK Compression for private transfers
• Stealth addresses for receiver privacy
• Viewing keys for compliance
• Simple API (3 lines of code)
• Full TypeScript and React support

npm install zera@1.0.0

Docs: https://github.com/jskoiz/ghostsol

Would love your feedback!
```

### Community Announcements

#### Discord Communities
- Solana Discord (#developers)
- Light Protocol Discord
- Web3 Privacy Discord servers

#### Forums
- Solana Stack Exchange
- Dev.to
- Hashnode

---

## 🔍 Post-Publish Verification

### npm Package Verification

```bash
# Check latest version
npm view zera version
# Should return: 1.0.0

# Check package info
npm view zera

# Check downloads
npm view zera downloads

# Check dist-tags
npm dist-tag ls zera
# Should show: latest: 1.0.0
```

### Installation Testing

Test installation in different environments:

#### Node.js
```bash
mkdir test-node && cd test-node
npm init -y
npm install zera
node -e "const gs = require('zera'); console.log(gs)"
```

#### TypeScript
```bash
mkdir test-ts && cd test-ts
npm init -y
npm install zera typescript @types/node
echo 'import * as gs from "zera"; console.log(gs);' > test.ts
npx tsc test.ts && node test.js
```

#### React
```bash
npx create-react-app test-react --template typescript
cd test-react
npm install zera
# Add import to App.tsx and verify
```

### Documentation Verification

- [ ] npm package page displays correctly
- [ ] README renders properly on npmjs.com
- [ ] Links in README work
- [ ] GitHub release page looks good
- [ ] Documentation site updated (if applicable)

---

## 🎯 Success Criteria

All of these should be ✅ before considering the release complete:

- [x] Version updated to 1.0.0
- [x] Build successful with no errors
- [ ] Published to npm with "latest" tag
- [ ] GitHub release created (v1.0.0)
- [ ] Git tag pushed (v1.0.0)
- [ ] Installation tested in multiple environments
- [ ] Documentation updated and accessible
- [ ] Community announcements posted
- [ ] Team notified of release
- [ ] Monitoring/analytics configured (if applicable)

---

## 🆘 Troubleshooting

### Issue: "You must be logged in to publish packages"
**Solution**: Run `npm login` and enter credentials

### Issue: "You do not have permission to publish"
**Solution**: Verify npm username has publish access to the package

### Issue: "Version already exists"
**Solution**: Package version cannot be republished. Increment version and try again

### Issue: "Package name already taken"
**Solution**: Use a scoped package name (e.g., @yourorg/zera)

### Issue: Build files missing from package
**Solution**: Check `files` array in package.json and .npmignore

### Issue: TypeScript definitions not working
**Solution**: Verify `types` field in package.json points to correct .d.ts file

---

## 📊 Post-Release Monitoring

### Week 1
- [ ] Monitor npm downloads daily
- [ ] Check GitHub issues for problems
- [ ] Respond to community feedback
- [ ] Monitor error tracking (if configured)
- [ ] Review analytics data

### Week 2-4
- [ ] Gather usage feedback
- [ ] Plan bug fix release if needed
- [ ] Update documentation based on questions
- [ ] Start planning next minor version

---

## 🔄 Rollback Plan (If Needed)

If critical issues are found after publishing:

### Option 1: Deprecate Version
```bash
npm deprecate zera@1.0.0 "Critical bug found. Please use 1.0.1"
```

### Option 2: Unpublish (within 24 hours only)
```bash
# Only works within 24 hours of publishing
npm unpublish zera@1.0.0
```

**Note**: Unpublishing is discouraged by npm. Prefer publishing a fix instead.

### Option 3: Publish Patch Version
```bash
# Fix the issue
# Update version to 1.0.1
npm publish
```

---

## 📝 Notes

### npm Tags
- `latest`: Current stable release (1.0.0)
- `beta`: Beta releases (e.g., 1.1.0-beta.1)
- `next`: Upcoming features (e.g., 1.1.0-alpha.1)

### Semantic Versioning
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backwards compatible
- **PATCH** (1.0.1): Bug fixes, backwards compatible

### Best Practices
1. Always test package locally before publishing
2. Use semantic versioning strictly
3. Update CHANGELOG.md for every release
4. Create GitHub releases for all versions
5. Never republish the same version
6. Deprecate instead of unpublish when possible

---

## ✅ Final Checklist

Before you publish, ensure:

- [x] Code is production-ready
- [x] All tests pass
- [x] Documentation is complete
- [x] Version numbers are correct
- [x] CHANGELOG is updated
- [ ] Security audit completed
- [ ] Package tested locally
- [ ] Ready to support users

---

**Ready to publish?**

```bash
cd /workspace/sdk
npm publish --access public
```

**After publishing:**
- Create GitHub release
- Post announcements
- Monitor for issues
- Celebrate! 🎉

---

*Last updated: 2025-10-31*
*Release version: 1.0.0*
*Status: Ready for publication*
