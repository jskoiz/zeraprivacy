# Zera Demo

A Next.js demo application showcasing private SOL swaps on Solana using ZK Compression technology.

## Features

- **Wallet Integration**: Connect with Phantom, Solflare, and other Solana wallets
- **Private SOL Operations**: 
  - Compress (shield) SOL into private accounts
  - Transfer SOL privately between accounts
  - Decompress (unshield) SOL back to regular accounts
- **Devnet Testing**: Built for Solana devnet testing
- **Transaction History**: View all operations with Solana Explorer links
- **Modern UI**: Clean, responsive interface with Tailwind CSS

## Prerequisites

- Node.js 18+ 
- A Solana wallet (Phantom recommended)
- Solana devnet SOL for testing

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

4. **Connect your wallet** using the wallet connection button

5. **Start testing**:
   - Click "Airdrop 2 SOL" to get devnet SOL
   - Use "Compress" to shield SOL into private accounts
   - Use "Transfer" to send private SOL to other addresses
   - Use "Decompress" to unshield SOL back to regular accounts

## How It Works

### Step 1: Fund Account
Request devnet SOL from the Solana faucet for testing purposes.

### Step 2: Compress SOL
Shield SOL into a compressed (private) account using ZK Compression. This makes the SOL balance private and untraceable.

### Step 3: Private Transfer
Send compressed SOL to another address privately. The transaction details are hidden using zero-knowledge proofs.

### Step 4: Decompress SOL
Unshield compressed SOL back to a regular Solana account, making it visible on the blockchain again.

## Technical Details

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Wallet Integration**: @solana/wallet-adapter-react
- **SDK**: zera (local package)
- **Network**: Solana Devnet
- **Privacy Technology**: ZK Compression by Light Protocol

## Troubleshooting

### Wallet Connection Issues
- Make sure you have a Solana wallet installed (Phantom, Solflare, etc.)
- Ensure your wallet is set to Devnet mode
- Try refreshing the page and reconnecting

### Transaction Failures
- Check that you have sufficient SOL balance
- Ensure you're connected to Devnet
- Verify the recipient address is valid
- Check the Solana Explorer for transaction details

### RPC Issues
- The demo uses Solana's public devnet RPC
- If you experience rate limiting, try again later
- For production use, consider using a dedicated RPC provider

### ZK Compression Limitations
- **Important**: Standard Solana devnet RPC does not support ZK Compression methods
- Compression, transfer, and decompression operations will fail with "Method not found" errors
- This is expected behavior - a dedicated Light Protocol RPC endpoint is required for full functionality
- The demo showcases the UI and SDK integration, but actual ZK operations require proper infrastructure

## Development

### Project Structure
```
src/
├── app/
│   ├── layout.tsx          # Root layout with wallet providers
│   ├── page.tsx            # Main dashboard component
│   ├── providers.tsx       # Wallet connection providers
│   └── globals.css         # Global styles
```

### Key Components
- `WalletConnectionProvider`: Sets up Solana wallet adapters
- `Dashboard`: Main application component with all functionality
- `DashboardContent`: Core UI with balance display and action buttons

### Environment Variables
No environment variables are required for the demo. The app uses:
- Solana devnet RPC endpoint
- Public wallet adapter configuration
- Local zera SDK package

## Learn More

- [Solana Documentation](https://docs.solana.com/)
- [Light Protocol ZK Compression](https://zkcompression.com/)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [Next.js Documentation](https://nextjs.org/docs)

## License

This demo is for educational and testing purposes only.