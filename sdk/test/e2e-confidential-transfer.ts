import { Connection, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { GhostSolPrivacy } from '../src/privacy/ghost-sol-privacy';
import { ExtendedWalletAdapter } from '../src/core/types';

async function airdrop(connection: Connection, kp: Keypair, sol = 2) {
  const sig = await connection.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, 'confirmed');
}

class LocalWallet implements ExtendedWalletAdapter {
  publicKey = this.kp.publicKey;
  constructor(public kp: Keypair) {}
  async signTransaction(tx: any) { tx.partialSign(this.kp); return tx; }
  async signAllTransactions(txs: any[]) { return txs.map((t) => { t.partialSign(this.kp); return t; }); }
  get rawKeypair() { return this.kp; }
}

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'), { commitment: 'confirmed' });

  // Create sender and recipient wallets
  const sender = Keypair.generate();
  const recipient = Keypair.generate();
  await Promise.all([airdrop(connection, sender), airdrop(connection, recipient)]);

  const senderWallet = new LocalWallet(sender);
  const recipientWallet = new LocalWallet(recipient);

  // Initialize privacy SDK for sender
  const privacy = new GhostSolPrivacy();
  await privacy.init(connection, senderWallet, {
    mode: 'privacy',
    enableViewingKeys: true,
  } as any);

  // Create recipient confidential account under same mint
  const recipientPrivacy = new GhostSolPrivacy();
  await recipientPrivacy.init(connection, recipientWallet, {
    mode: 'privacy',
    enableViewingKeys: false,
  } as any);

  const mintAddr = privacy['confidentialMint']!.address; // access for test
  await recipientPrivacy.createConfidentialAccount(mintAddr);

  console.log('Mint:', mintAddr.toBase58());
  console.log('Sender account:', privacy['confidentialAccount']!.address.toBase58());
  console.log('Recipient account:', recipientPrivacy['confidentialAccount']!.address.toBase58());

  // Attempt an encrypted transfer (may fail until ZK proof + full CT wiring is complete)
  try {
    const res = await privacy.privateTransfer(recipient.publicKey.toBase58(), 1);
    console.log('Private transfer signature:', res.signature);
  } catch (e) {
    console.warn('Private transfer not completed (expected in prototype):', (e as Error).message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


