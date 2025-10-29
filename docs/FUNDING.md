# Devnet Funding Guide

## Problem: Devnet Airdrop Rate Limiting

Solana's devnet airdrop service has strict rate limits that cause frequent failures:
- **24 SOL per day** maximum
- **2 SOL per hour** maximum  
- **IP-based limiting** affects shared networks
- **429 "Too Many Requests"** errors are common

## Recommended Funding Methods

### 1. Solana Official Faucet (Best Option)
Visit **https://faucet.solana.com**:
- Requires GitHub account with public repositories
- More reliable than programmatic airdrop
- Higher daily limits
- Web interface is user-friendly

### 2. Command Line Airdrop
If you have Solana CLI installed:
```bash
# Airdrop to your address
solana airdrop 2 YOUR_ADDRESS_HERE --url devnet

# Check balance
solana balance YOUR_ADDRESS_HERE --url devnet
```

### 3. Manual Transfer
If you have another funded devnet wallet:
```bash
# Transfer from funded account to test account
solana transfer --from FUNDED_KEYPAIR.json RECIPIENT_ADDRESS 2 --url devnet
```

### 4. Alternative Faucets
- **QuickNode Faucet**: https://faucet.quicknode.com/solana/devnet
- **Solana Cookbook**: https://solanacookbook.com/references/local-development.html#airdrop

## SDK Usage Without Airdrop

The GhostSol SDK works perfectly without the airdrop function:

```typescript
import { init, compress, transfer, decompress } from 'ghost-sol';
import { Keypair } from '@solana/web3.js';

// Initialize with pre-funded keypair
const wallet = Keypair.fromSecretKey(/* your funded keypair */);
await init({ wallet, cluster: 'devnet' });

// Use core functions (no airdrop needed)
const signature = await compress(0.1 * 1e9); // 0.1 SOL
```

## Testing Strategy

### For Development
1. **Generate test keypair** once
2. **Fund it manually** using methods above
3. **Reuse the same keypair** for multiple test runs
4. **Don't rely on airdrop** in automated tests

### Test Account Setup
```typescript
// Save this keypair for reuse
const testKeypair = Keypair.generate();
console.log('Address:', testKeypair.publicKey.toBase58());
console.log('Private Key:', Array.from(testKeypair.secretKey));

// Fund it once using faucet.solana.com
// Then reuse for all tests
```

## Why Remove Airdrop Dependency?

### Problems with Programmatic Airdrop:
- ❌ **Hangs on 429 errors** due to @solana/web3.js retry logic
- ❌ **Rate limiting** makes it unreliable
- ❌ **Test failures** unrelated to SDK functionality  
- ❌ **IP-based restrictions** affect teams/CI systems

### Benefits of Manual Funding:
- ✅ **Reliable testing** with predictable balance
- ✅ **No hanging tests** or timeout issues
- ✅ **Focus on SDK features** not devnet limitations
- ✅ **Better CI/CD** compatibility
- ✅ **Real-world usage patterns** (users fund their own accounts)

## Production Considerations

In production (mainnet-beta), users will:
- Fund their own wallets with real SOL
- Connect existing wallet adapters (Phantom, etc.)
- Never need airdrop functionality

Therefore, **airdrop is purely a testing convenience** and shouldn't be a core dependency.
