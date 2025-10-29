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
# Install all workspace dependencies (root + sdk + examples)
npm install
```

### 3. Build the SDK and workspaces

```bash
npm run build --workspaces
```

## SDK Setup

### 1. Quick Start (Node)

Create a new file `quick-start.ts`:

```javascript
import { init, getAddress, getBalance, deposit, transfer, withdraw } from './sdk/dist/index.js';
import { Keypair } from '@solana/web3.js';

async function main() {
  await init({ wallet: Keypair.generate(), cluster: 'devnet' });

  console.log('Address:', getAddress());
  console.log('Balance:', await getBalance());

  // Optional operations depending on funding and RPC support
  // await deposit(0.1);
  // await transfer('<RECIPIENT_BASE58>', 0.01);
  // await withdraw(0.01);
}
main().catch(console.error);
```

### 2. Privacy Mode Quick Start (Node)

Create `privacy-quick-start.ts`:

```typescript
import { init, getAddress, getBalance, deposit, transfer, withdraw, decryptBalance, generateViewingKey } from './sdk/dist/index.js';
import { Keypair } from '@solana/web3.js';

async function main() {
  await init({
    wallet: Keypair.generate(),
    cluster: 'devnet',
    privacy: { mode: 'privacy', enableViewingKeys: true },
  });

  console.log('Address:', getAddress());
  const enc = await getBalance();
  console.log('Encrypted balance:', enc);
  console.log('Decrypted SOL:', await decryptBalance());

  // Note: Proof generation is stubbed; private ops may throw ProofGenerationError in early builds
  // await deposit(0.1);
  // await transfer('<RECIPIENT_BASE58>', 0.01);
  // await withdraw(0.01);

  const vk = await generateViewingKey();
  console.log('Viewing Key:', vk);
}

main().catch(console.error);
```

Limitations on devnet:
- Devnet airdrop helper is not available in privacy mode; fund manually (see `docs/FUNDING.md`).
- Proof generation/verification paths are not finalized and may throw `ProofGenerationError`.

### 3. Run SDK Tests

```bash
cd sdk

# Run functionality tests
npx tsx test/sdk-functionality-test.ts

# Run end-to-end tests (requires funded account)
npx tsx test/e2e-test.ts
```

### 4. SDK Configuration

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

### 4. RPC Configuration

The GhostSol SDK uses Helius RPC endpoints for ZK Compression operations. These endpoints are pre-configured and include API keys for reliable access.

#### Supported Networks

- **Devnet**: `https://devnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`
- **Mainnet**: `https://mainnet.helius-rpc.com/?api-key=7bab09d6-6b6b-4e9a-b0dd-7b2c7f6977bf`

#### Custom RPC Configuration

If you need to use a different RPC endpoint, you can specify it during initialization:

```typescript
import { GhostSol } from 'ghost-sol';

const ghostSol = new GhostSol();
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

### 1. Workspace Build and SDK Tests (recommended validation)

Run the following from the repository root to validate the setup:

```bash
npm install
npm run build --workspaces
npm test --workspace sdk
```

### 2. SDK Functionality Tests

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

### 3. End-to-End Tests

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

### 4. Demo Application Tests

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

See [FUNDING.md](FUNDING.md) for detailed funding strategies. In privacy mode, programmatic airdrop is not supported by the SDK entry points.

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
