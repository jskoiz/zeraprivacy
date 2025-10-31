# Zera SDK Setup Guide

Complete setup guide for the Zera SDK and demo application.

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
git clone https://github.com/your-username/zera.git
cd zera
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
const { Zera } = require('./sdk/dist/index.js');
const { Keypair } = require('@solana/web3.js');

async function testSDK() {
  // Initialize SDK
  const ghostSol = new Zera();
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
import { Zera } from 'zera';

const ghostSol = new Zera();

await ghostSol.init({
  wallet: keypair,                    // Required: Wallet instance
  cluster: 'devnet',                  // Required: 'devnet' or 'mainnet-beta'
  rpcUrl: 'https://api.devnet.solana.com', // Optional: Custom RPC endpoint
  commitment: 'confirmed'              // Optional: Transaction commitment level
});
```

### 4. RPC Configuration

The Zera SDK uses Helius RPC endpoints for ZK Compression operations. These endpoints are pre-configured and include API keys for reliable access.

#### Supported Networks

- **Devnet**: `https://devnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`
- **Mainnet**: `https://mainnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`

#### Custom RPC Configuration

If you need to use a different RPC endpoint, you can specify it during initialization:

```typescript
import { Zera } from 'zera';

const ghostSol = new Zera();
await ghostSol.init({
  wallet: yourWallet,
  cluster: 'devnet',
  rpcUrl: 'https://your-custom-rpc-endpoint.com'
});
```

**Note**: ZK Compression operations require RPC endpoints that support Light Protocol methods. Standard Solana RPC endpoints may not work for compression operations.

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

## Funding Test Accounts

**Important**: The SDK no longer relies on problematic devnet airdrop. Instead:

1. **Run tests** to get a generated address
2. **Fund manually** using https://faucet.solana.com
3. **Reuse funded accounts** for multiple test runs

See [FUNDING.md](FUNDING.md) for detailed funding strategies.

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

#### 3. Operation Failures (Expected)

**Problem**: Compression/transfer operations fail
**Solutions**:
- This is expected with unfunded accounts
- Fund the test address using https://faucet.solana.com
- The SDK signing logic works correctly (as shown in error details)

#### 4. ZK Compression Failures

**Problem**: "failed to get recent blockhash" or "TypeError: Failed to fetch" errors
**Solutions**:
- The SDK now uses Helius RPC endpoints which should resolve connectivity issues
- Check your internet connection and firewall settings
- Verify that the Helius RPC endpoints are accessible from your network
- If issues persist, try using a different RPC endpoint in your configuration

**Problem**: "Method not found" errors
**Explanation**: This may occur if:
- The RPC endpoint doesn't support ZK Compression methods
- The Light Protocol library version is incompatible
- Network connectivity issues prevent proper RPC communication

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
export DEBUG=zera:*

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

GhostSOL includes a secure, centralized environment configuration system that validates all environment variables at initialization.

#### Setup

1. **Copy the example file:**
   ```bash
   cp env.example .env
   ```

2. **Fill in your configuration values** in `.env`

3. **For Next.js apps**, copy the example in the demo directory:
   ```bash
   cd examples/nextjs-demo
   cp env.example .env.local
   ```

#### Required Variables

- `SOLANA_CLUSTER` - Solana network (`devnet` or `mainnet-beta`)
- `SOLANA_RPC_URL` - Primary RPC endpoint URL

For Next.js apps, use public variables for client-side access:
- `NEXT_PUBLIC_CLUSTER` - Public cluster (accessible in browser)
- `NEXT_PUBLIC_RPC_URL` - Public RPC URL (accessible in browser)

#### Optional Variables

- `SOLANA_RPC_URL_FALLBACK` - Fallback RPC endpoint (used if primary fails)
- `HELIUS_API_KEY` - Helius API key (if using Helius RPC endpoints)

#### Example Configuration

**Development:**
```bash
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_CLUSTER=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

**Production:**
```bash
SOLANA_CLUSTER=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_CLUSTER=mainnet-beta
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
```

#### Security Features

The environment configuration system provides:

- ✅ **Automatic validation** - Invalid or missing variables detected at startup
- ✅ **Type safety** - TypeScript interfaces for all configuration values
- ✅ **Sensitive value masking** - Private keys and API keys never logged
- ✅ **Browser safety** - Server-only variables cannot be accessed client-side
- ✅ **HTTPS enforcement** - Production requires HTTPS endpoints
- ✅ **Clear error messages** - Helpful guidance when configuration is invalid

#### Security-Sensitive Variables

These variables should **NEVER** be prefixed with `NEXT_PUBLIC_` or exposed to the browser:

- `PRIVATE_KEY` - User wallet private key
- `AUDITOR_KEY` - Auditor key for viewing keys
- `ENCRYPTION_KEY` - Encryption keys for privacy features
- `HELIUS_API_KEY` - Helius API key

The SDK automatically validates that sensitive variables are not exposed to client-side code.

## Security Considerations

- **Never commit private keys** to version control
- **Use environment variables** for sensitive configuration (the SDK validates this automatically)
- **Never use NEXT_PUBLIC_ prefix** for sensitive variables (private keys, API keys)
- **Validate all inputs** before processing (handled by the SDK)
- **Test thoroughly** before mainnet deployment
- **Use proper error handling** to prevent information leakage (sensitive values are automatically masked)
- **Use HTTPS in production** (automatically enforced by the SDK)

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
