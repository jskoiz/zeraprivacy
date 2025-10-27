# GhostSol SDK Setup Guide

Complete setup guide for the GhostSol SDK and demo application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [SDK Setup](#sdk-setup)
- [Demo Application Setup](#demo-application-setup)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Git**: For cloning the repository

### Browser Requirements

- **Modern Browser**: Chrome, Firefox, Safari, or Edge
- **Wallet Extension**: Phantom wallet (recommended) or other Solana wallet

### Development Tools (Optional)

- **TypeScript**: For type checking
- **VS Code**: Recommended IDE with TypeScript support

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ghost-sol.git
cd ghost-sol
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install SDK dependencies
cd sdk
npm install

# Install demo dependencies
cd ../examples/nextjs-demo
npm install
```

### 3. Build the SDK

```bash
cd sdk
npm run build
```

## SDK Setup

### 1. Basic SDK Usage

Create a new file `test-sdk.js`:

```javascript
const { GhostSol } = require('./sdk/dist/index.js');
const { Keypair } = require('@solana/web3.js');

async function testSDK() {
  // Initialize SDK
  const ghostSol = new GhostSol();
  await ghostSol.init({
    wallet: Keypair.generate(),
    cluster: 'devnet'
  });

  // Test basic functionality
  console.log('Address:', ghostSol.getAddress());
  console.log('Balance:', await ghostSol.getBalance());
}

testSDK().catch(console.error);
```

### 2. Run SDK Tests

```bash
cd sdk

# Run functionality tests
npx tsx test/sdk-functionality-test.ts

# Run end-to-end tests (requires funded account)
npx tsx test/e2e-test.ts
```

### 3. SDK Configuration

The SDK can be configured with various options:

```typescript
import { GhostSol } from 'ghost-sol';

const ghostSol = new GhostSol();

await ghostSol.init({
  wallet: keypair,                    // Required: Wallet instance
  cluster: 'devnet',                  // Required: 'devnet' or 'mainnet-beta'
  rpcUrl: 'https://api.devnet.solana.com', // Optional: Custom RPC endpoint
  commitment: 'confirmed'              // Optional: Transaction commitment level
});
```

## Demo Application Setup

### 1. Start the Development Server

```bash
cd examples/nextjs-demo
npm run dev
```

### 2. Open the Application

Navigate to `http://localhost:3000` in your browser.

### 3. Connect Your Wallet

1. Click "Select Wallet" button
2. Choose Phantom (or your preferred wallet)
3. Approve the connection in your wallet
4. Ensure your wallet is set to Devnet mode

### 4. Test the Application

1. **Fund Account**: Click "Airdrop 2 Devnet SOL" (may be rate limited)
2. **Compress SOL**: Enter amount and click "Compress SOL"
3. **Transfer**: Enter recipient address and amount, click "Transfer Compressed SOL"
4. **Decompress**: Enter amount and click "Decompress SOL"

## Testing

### 1. SDK Functionality Tests

These tests verify the SDK works correctly without requiring actual blockchain operations:

```bash
cd sdk
npx tsx test/sdk-functionality-test.ts
```

**Expected Output:**
```
✅ Keypair normalization works correctly
✅ Normalized wallet has required signing methods
✅ SDK initialization successful
✅ Address retrieval works correctly
⚠️ Compression failed as expected: Method not found
⚠️ Transfer failed as expected: Method not found
⚠️ Decompression failed as expected: Method not found
✅ Compression correctly fails before initialization
✅ Transfer correctly fails before initialization
✅ Decompression correctly fails before initialization
```

### 2. End-to-End Tests

These tests attempt full blockchain operations (may fail due to RPC limitations):

```bash
cd sdk
npx tsx test/e2e-test.ts
```

**Expected Output:**
```
✅ SDK initialized successfully
⚠️ Airdrop failed (this is common on devnet): Rate limited
⚠️ Insufficient balance for testing. Please fund the account manually
```

### 3. Demo Application Tests

1. **Build Test**: Verify the application builds correctly
   ```bash
   cd examples/nextjs-demo
   npm run build
   ```

2. **Runtime Test**: Verify the application runs without errors
   ```bash
   npm run dev
   # Open http://localhost:3000 and test wallet connection
   ```

## Troubleshooting

### Common Issues

#### 1. Build Errors

**Problem**: TypeScript compilation errors
**Solution**: 
```bash
cd sdk
npm run build
# Check for TypeScript errors and fix them
```

#### 2. Wallet Connection Issues

**Problem**: Wallet not connecting
**Solutions**:
- Ensure Phantom wallet is installed and unlocked
- Check that wallet is set to Devnet mode
- Try refreshing the page and reconnecting
- Check browser console for error messages

#### 3. Airdrop Failures

**Problem**: "429 Too Many Requests" error
**Solutions**:
- This is common on devnet - try again later
- Use manual funding from https://faucet.solana.com
- Check if you've reached daily airdrop limits

#### 4. ZK Compression Failures

**Problem**: "Method not found" errors
**Explanation**: This is expected behavior
- Standard Solana devnet RPC does not support ZK Compression methods
- A dedicated Light Protocol RPC endpoint is required for full functionality
- The demo showcases UI and SDK integration, not actual ZK operations

#### 5. Dependency Issues

**Problem**: Missing dependencies or version conflicts
**Solutions**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for version conflicts
npm ls
```

### Debug Mode

Enable debug logging by setting environment variables:

```bash
# Enable debug logging
export DEBUG=ghost-sol:*

# Run your application
npm run dev
```

### Getting Help

1. **Check Logs**: Look at browser console and terminal output
2. **Verify Setup**: Ensure all prerequisites are met
3. **Test Components**: Test SDK and demo separately
4. **Community**: Open an issue on GitHub for support

## Production Deployment

### 1. Build for Production

```bash
cd examples/nextjs-demo
npm run build
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### 3. Environment Variables

For production deployment, consider setting:

```bash
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_CLUSTER=mainnet-beta
```

## Security Considerations

- **Never commit private keys** to version control
- **Use environment variables** for sensitive configuration
- **Validate all inputs** before processing
- **Test thoroughly** before mainnet deployment
- **Use proper error handling** to prevent information leakage

## Next Steps

1. **Explore the Code**: Review the SDK source code in `sdk/src/`
2. **Customize the Demo**: Modify the demo application for your needs
3. **Integrate SDK**: Use the SDK in your own applications
4. **Contribute**: Submit issues and pull requests to improve the project

## Support

- **Documentation**: Check the API documentation in `docs/API.md`
- **Examples**: Review the demo application in `examples/nextjs-demo/`
- **Issues**: Open an issue on GitHub for bugs or feature requests
- **Community**: Join discussions in the project's community channels
