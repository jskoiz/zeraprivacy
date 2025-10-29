# GhostSOL User Recovery Guide

## Overview
This guide explains how to recover access to your funds if GhostSOL infrastructure is unavailable. **Your funds are always cryptographically safe on the Solana blockchain**, even if all GhostSOL services are down.

---

## 🔐 Your Funds Are Safe

**Important**: Due to the design of GhostSOL and Solana:
- ✅ Your funds are stored on the Solana blockchain (immutable and decentralized)
- ✅ Only you control your private key
- ✅ Funds can be accessed even if GhostSOL infrastructure fails
- ✅ No single point of failure can lock you out of your funds

---

## Quick Status Check

### Check GhostSOL Status
1. Visit our status page: **https://uptime.ghostsol.io**
2. Check which components are operational
3. View estimated recovery time

### If All Services Are Down
Don't panic! Follow the recovery options below.

---

## Recovery Option 1: Wait for Service Restoration (Easiest)

**Recommended for most users**

If the status page shows an incident:
1. ✅ Your funds remain safe on-chain
2. ✅ Check the status page for estimated recovery time
3. ✅ Subscribe to updates on the status page
4. ✅ Wait for service restoration (usually <1 hour)

**No action required** - Your funds will be accessible once service is restored.

---

## Recovery Option 2: Use Alternative RPC (Simple)

GhostSOL SDK automatically fails over to backup RPCs. If you want to manually specify an RPC:

### JavaScript/TypeScript SDK

```typescript
import { init, getBalance } from '@ghostsol/sdk';

// Initialize with custom RPC
await init({
  rpcUrl: 'https://api.devnet.solana.com', // Or Helius, Alchemy, etc.
  privacy: { mode: 'privacy' }
});

// Your balances will load from alternative RPC
const balance = await getBalance();
console.log('Your balance:', balance);
```

### Supported Alternative RPCs
- Helius: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`
- Alchemy: `https://solana-devnet.g.alchemy.com/v2/YOUR_KEY`
- Light Protocol: `https://rpc.lightprotocol.com`
- Public Solana: `https://api.devnet.solana.com`

**Note**: You may need an API key for some RPC providers.

---

## Recovery Option 3: Use Light Protocol SDK Directly (Intermediate)

GhostSOL is built on Light Protocol. You can use their SDK directly to access your funds:

### Installation

```bash
npm install @lightprotocol/sdk
```

### Usage

```typescript
import { LightProtocol } from '@lightprotocol/sdk';

// Initialize Light Protocol SDK
const sdk = new LightProtocol({
  rpc: 'https://api.devnet.solana.com',
  forester: 'https://forester.lightprotocol.com' // Light Protocol's Forester
});

// Connect your wallet
await sdk.connectWallet({
  publicKey: 'YOUR_PUBLIC_KEY',
  privateKey: 'YOUR_PRIVATE_KEY' // Keep this secure!
});

// Get balance
const balance = await sdk.getBalance();
console.log('Balance:', balance);

// Send transaction
const tx = await sdk.transfer({
  to: 'RECIPIENT_PUBLIC_KEY',
  amount: 1000000, // In lamports
});

console.log('Transaction:', tx);
```

### Resources
- Light Protocol Docs: https://docs.lightprotocol.com
- Light Protocol Discord: https://discord.gg/lightprotocol

---

## Recovery Option 4: Self-Host Photon Indexer (Advanced)

For advanced users who want complete independence from any third-party infrastructure:

### Requirements
- Technical expertise (DevOps/blockchain)
- Server or cloud instance (4GB+ RAM, 50GB+ storage)
- Time investment (~2-4 hours initial setup)

### Setup Steps

#### 1. Clone Light Protocol Repository
```bash
git clone https://github.com/Lightprotocol/light-protocol
cd light-protocol
```

#### 2. Install Dependencies
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install other dependencies
cargo build --release
```

#### 3. Configure Photon Indexer
```bash
# Create config file
cp config.example.yml config.yml

# Edit configuration
vim config.yml
```

**config.yml**:
```yaml
rpc_url: "https://api.devnet.solana.com"
websocket_url: "wss://api.devnet.solana.com"
database_url: "postgres://user:pass@localhost/photon"
```

#### 4. Start Photon Indexer
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Run migrations
./scripts/migrate.sh

# Start indexer
./target/release/photon-indexer --config config.yml
```

#### 5. Wait for Sync
```bash
# Monitor sync progress
./scripts/check-sync.sh

# Sync time depends on network:
# - Devnet: ~30 minutes to 2 hours
# - Mainnet: ~6-24 hours
```

#### 6. Update Your Application
```typescript
// Point your app to self-hosted indexer
await init({
  rpcUrl: 'http://localhost:8899', // Your self-hosted indexer
  privacy: { mode: 'privacy' }
});
```

### Resources
- Light Protocol Setup Guide: https://docs.lightprotocol.com/photon
- Community Support: Discord #self-hosting

---

## Recovery Option 5: Emergency Withdrawal Using Solana CLI (Advanced)

If you need immediate access and can't wait for any indexer:

### Requirements
- Solana CLI installed
- Your wallet keypair file

### Steps

#### 1. Install Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

#### 2. Import Your Wallet
```bash
# If you have your private key
solana-keygen recover 'prompt:' --outfile ~/my-wallet.json

# Enter your seed phrase when prompted
```

#### 3. Check Balance
```bash
solana balance -u devnet ~/my-wallet.json
```

#### 4. Transfer Funds
```bash
# Transfer SOL
solana transfer -u devnet \
  RECIPIENT_PUBKEY \
  1.5 \
  --from ~/my-wallet.json

# For compressed accounts (advanced):
# Use Light Protocol CLI tools
# See: https://docs.lightprotocol.com/cli
```

---

## FAQ

### Q: Can I lose my funds if GhostSOL shuts down permanently?
**A**: No. Your funds are on the Solana blockchain and controlled by your private key. You can always access them using:
- Light Protocol SDK
- Self-hosted infrastructure
- Direct Solana CLI

### Q: How long does it take to recover access?
**A**: Depends on method:
- GhostSOL restoration: Usually <1 hour
- Alternative RPC: Immediate (seconds)
- Light Protocol SDK: Immediate (seconds)
- Self-hosted indexer: 2-4 hours setup + sync time
- Solana CLI: Immediate (minutes)

### Q: What if I don't have my private key?
**A**: If you've lost your private key/seed phrase, funds **cannot be recovered** by anyone (including GhostSOL). This is fundamental to blockchain security.

**Always backup your private key/seed phrase securely!**

### Q: Are my funds insured?
**A**: GhostSOL does not provide insurance. However, your funds are cryptographically secured on Solana's blockchain. Loss scenarios:
- ✅ GhostSOL infrastructure fails → Funds safe, use recovery options
- ✅ Internet outage → Funds safe, accessible when online
- ❌ Lost private key → Funds permanently unrecoverable
- ❌ Sent to wrong address → Transaction irreversible

### Q: Can GhostSOL access my funds?
**A**: **No**. GhostSOL never has access to your private keys. We only provide:
- RPC infrastructure (read-only access to blockchain)
- Indexing services (query optimization)
- SDK tools (client-side operations)

Only you control your private key = only you control your funds.

### Q: What if the Forester service fails?
**A**: 
- ✅ Existing balances safe and readable
- ❌ Cannot submit new compressed transactions
- ✅ Can still send standard Solana transactions
- ✅ Can use Light Protocol's Forester directly

### Q: How do I export my transaction history?
**A**:
```typescript
import { getTransactionHistory, exportToCSV } from '@ghostsol/sdk';

// Get all transactions
const history = await getTransactionHistory();

// Export to CSV
exportToCSV(history, 'my-transactions.csv');
```

Or query directly from blockchain using a block explorer.

### Q: What's the difference between GhostSOL and Light Protocol?
**A**: 
- **Light Protocol**: Core blockchain protocol (like Ethereum)
- **GhostSOL**: Application layer / SDK built on Light Protocol (like MetaMask)

If GhostSOL is down, you can always use Light Protocol directly.

---

## Emergency Contacts

### GhostSOL Support
- **Status Page**: https://uptime.ghostsol.io
- **Email**: support@ghostsol.io
- **Discord**: https://discord.gg/ghostsol
- **Twitter**: @ghostsol

### Light Protocol Support
- **Docs**: https://docs.lightprotocol.com
- **Discord**: https://discord.gg/lightprotocol
- **Email**: support@lightprotocol.com

### Community Help
- **Discord**: #support channel
- **GitHub Issues**: https://github.com/ghostsol/sdk/issues
- **Stack Overflow**: Tag `ghostsol`

---

## Best Practices for Fund Security

### ✅ DO
- ✅ Backup your seed phrase/private key (write it down, store securely)
- ✅ Use hardware wallets for large amounts
- ✅ Test recovery procedures with small amounts first
- ✅ Keep multiple copies of backups in secure locations
- ✅ Understand that you are responsible for your private keys

### ❌ DON'T
- ❌ Share your private key with anyone (including GhostSOL support!)
- ❌ Store private keys digitally (email, cloud storage, screenshots)
- ❌ Use brain wallets or weak passphrases
- ❌ Reuse private keys across multiple wallets
- ❌ Trust anyone who asks for your private key

---

## Testing Your Recovery Plan

We recommend testing recovery procedures before you need them:

### Test Checklist
1. ☐ Create a test wallet with small amount (~$10)
2. ☐ Practice exporting private key
3. ☐ Test recovery using Light Protocol SDK
4. ☐ Test recovery using Solana CLI
5. ☐ Verify you can restore access after simulated failure
6. ☐ Document any issues or questions
7. ☐ Securely delete test wallet private keys after testing

---

## Advanced: Understanding GhostSOL Architecture

For technical users who want to understand how recovery works:

### Architecture Overview
```
┌─────────────┐
│   You/SDK   │ (Client-side, you control private keys)
└──────┬──────┘
       │
       ├──────── GhostSOL RPC ─────┐
       ├──────── Photon Indexer ────┤  Optional infrastructure
       └──────── Forester ──────────┘  (can be replaced)
       │
       ▼
┌──────────────────┐
│ Solana Blockchain│ (Source of truth, decentralized)
└──────────────────┘
```

**Key Points**:
- Solana blockchain is the source of truth
- GhostSOL infrastructure is optional middleware
- Your private key is the only requirement for fund access
- All infrastructure is replaceable

### Data Flow
1. **Write (Transaction)**: SDK → Forester → Solana Blockchain
2. **Read (Balance)**: SDK → Photon RPC → Database (indexed from blockchain)

**Recovery Insight**: If GhostSOL infrastructure fails, you can:
- Write: Use Light Protocol Forester or self-host
- Read: Query blockchain directly or use alternative indexer

---

## Conclusion

**Remember**: Your funds are always safe on the Solana blockchain. GhostSOL provides convenient infrastructure, but you're never locked in. You have multiple recovery options ranging from simple (wait for service) to advanced (self-host everything).

**Key Takeaway**: 🔑 **Control your private keys = Control your funds**

If you have questions or need help with recovery, contact our support team at support@ghostsol.io or join our Discord.

---

## Version History
- v1.0 (2025-10-29): Initial user recovery guide

Last updated: 2025-10-29
