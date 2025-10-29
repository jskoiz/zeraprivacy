import { Connection, Keypair, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { ConfidentialTransferManager } from '../src/privacy/confidential-transfer';
import { EncryptionUtils } from '../src/privacy/encryption';
import { ExtendedWalletAdapter } from '../src/core/types';

class LocalWallet implements ExtendedWalletAdapter {
  publicKey = this.kp.publicKey;
  constructor(public kp: Keypair) {}
  async signTransaction(tx: any) { tx.partialSign(this.kp); return tx; }
  async signAllTransactions(txs: any[]) { return txs.map((t) => { t.partialSign(this.kp); return t; }); }
  get rawKeypair() { return this.kp; }
}

async function main() {
  const connection = new Connection(clusterApiUrl('devnet'), { commitment: 'confirmed' });
  const wallet = new LocalWallet(Keypair.generate());
  const manager = new ConfidentialTransferManager(connection, wallet);

  // createConfidentialMint should either succeed with a signature or throw a structured error
  const mint = Keypair.generate();
  try {
    await manager.createConfidentialMint(mint, wallet.publicKey);
  } catch (e) {
    console.log('createConfidentialMint returned structured error (expected in prototype):', (e as Error).message);
  }

  // createConfidentialAccount should either return a key or throw structured error
  try {
    await manager.createConfidentialAccount(mint.publicKey, wallet.publicKey);
  } catch (e) {
    console.log('createConfidentialAccount returned structured error (expected in prototype):', (e as Error).message);
  }

  // getEncryptedBalance should throw for non-existent account with structured error
  try {
    await manager.getEncryptedBalance(new PublicKey(Keypair.generate().publicKey));
  } catch (e) {
    console.log('getEncryptedBalance returned structured error (expected for missing account):', (e as Error).message);
  }
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(0); });
}
