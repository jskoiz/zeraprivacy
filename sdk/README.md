# GhostSOL SDK

Privacy-focused Solana SDK with ZK Compression and confidential transfers.

## Installation

```bash
npm install ghost-sol
```

## Quick Start

### 1. Configure API Keys (Optional but Recommended)

For better RPC reliability with automatic failover to Helius:

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Helius API key
# Get one for free at: https://helius.xyz
HELIUS_API_KEY=your_helius_api_key_here
```

**⚠️ SECURITY**: Never commit `.env` files or API keys to version control!

### 2. Initialize SDK

```typescript
import { GhostSol } from 'ghost-sol';

const ghostSol = new GhostSol();

await ghostSol.init({
  cluster: 'devnet',
  commitment: 'confirmed'
});
```

## RPC Failover

The SDK automatically fails over to backup RPC providers if the primary is unavailable:

1. **GhostSOL Primary** (Priority 1)
2. **Helius** (Priority 2) - *requires HELIUS_API_KEY*
3. **Light Protocol** (Priority 3)
4. **Solana Public** (Priority 4, devnet only)

### Without API Keys

If you don't set `HELIUS_API_KEY`, the SDK will skip Helius and use other providers:

```
✓ Connected to GhostSOL Primary
(or)
⚠ GhostSOL Primary unavailable, trying Light Protocol...
✓ Connected to Light Protocol
```

### Custom RPC

You can also specify a custom RPC URL:

```typescript
await ghostSol.init({
  cluster: 'devnet',
  rpcUrl: 'https://your-custom-rpc.example.com'
});
```

## Basic Usage

### Compress SOL

```typescript
const result = await ghostSol.compress({
  amount: 1.5, // SOL
  to: recipientPublicKey
});

console.log('Transaction:', result.signature);
```

### Transfer Compressed SOL

```typescript
const result = await ghostSol.transfer({
  to: recipientPublicKey,
  amount: 0.5 // SOL
});
```

### Decompress SOL

```typescript
const result = await ghostSol.decompress({
  amount: 1.0, // SOL
  to: recipientPublicKey
});
```

### Check Balance

```typescript
const balance = await ghostSol.getBalance();
console.log(`Balance: ${balance.sol} SOL`);
```

## Configuration Options

```typescript
interface GhostSolConfig {
  /** Wallet instance (Keypair or wallet adapter) */
  wallet?: Keypair | WalletAdapter;
  
  /** Custom RPC endpoint URL */
  rpcUrl?: string;
  
  /** Solana cluster */
  cluster?: 'devnet' | 'mainnet-beta';
  
  /** Transaction commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  
  /** Privacy configuration */
  privacy?: {
    mode: 'privacy' | 'efficiency';
    enableViewingKeys?: boolean;
    auditMode?: boolean;
  };
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `HELIUS_API_KEY` | Helius RPC API key for better reliability | No |

See [SECURITY.md](./SECURITY.md) for best practices on managing API keys.

## Security

**NEVER** commit API keys or secrets to version control!

- ✅ Use `.env` files (gitignored)
- ✅ Use environment variables in production
- ❌ Don't hardcode API keys in code
- ❌ Don't commit `.env` files

See [SECURITY.md](./SECURITY.md) for complete security guidelines.

## Documentation

- [API Documentation](../docs/API.md)
- [Privacy Architecture](../docs/research/privacy-architecture.md)
- [Infrastructure Guide](../infrastructure/RUNBOOK.md)

## Testing

```bash
npm test
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## License

See [LICENSE](../LICENSE)

## Support

- GitHub Issues: [github.com/ghostsol/ghostsol](https://github.com/ghostsol/ghostsol)
- Discord: [discord.gg/ghostsol](https://discord.gg/ghostsol)
- Email: support@ghostsol.io
