import { Keypair, PublicKey } from '@solana/web3.js';
import { ViewingKeyManager, InMemoryViewingKeyStore } from '../src/privacy/viewing-keys';
import { ExtendedWalletAdapter } from '../src/core/types';
import { EncryptedBalance } from '../src/privacy/types';

class LocalWallet implements ExtendedWalletAdapter {
  constructor(public kp: Keypair) {}
  get publicKey() { return this.kp.publicKey; }
  async signTransaction(tx: any) { tx.partialSign(this.kp); return tx; }
  async signAllTransactions(txs: any[]) { return txs.map((t) => { t.partialSign(this.kp); return t; }); }
  get rawKeypair() { return this.kp; }
}

(async () => {
  console.log('🔐 Viewing Keys Flow Test');
  const owner = Keypair.generate();
  const wallet = new LocalWallet(owner);
  const store = new InMemoryViewingKeyStore();
  const vkm = new ViewingKeyManager(wallet, store);

  // Fake confidential account address
  const account = Keypair.generate().publicKey;

  // 1) Generate
  const vk = await vkm.generateViewingKey(account);
  console.log('Generated VK pub:', vk.publicKey.toBase58());

  // 2) Store/List
  const list1 = await vkm.getViewingKeys(account);
  if (list1.length !== 1) throw new Error('Viewing key not stored/listed correctly');

  // 3) Use for decryptBalance/decryptAmount (placeholders return 0)
  const fakeBalance: EncryptedBalance = { ciphertext: new Uint8Array(64), commitment: new Uint8Array(32), lastUpdated: Date.now(), exists: true };
  const bal = await vkm.decryptBalance(fakeBalance, vk);
  if (bal !== 0) throw new Error('decryptBalance placeholder should be 0');

  const fakeAmt = new Uint8Array(64);
  const amt = await vkm.decryptAmount(fakeAmt, vk);
  if (amt !== 0) throw new Error('decryptAmount placeholder should be 0');

  // 4) Revoke
  await vkm.revokeViewingKey(account, vk.publicKey);
  const list2 = await vkm.getViewingKeys(account);
  if (list2.length !== 0) throw new Error('Viewing key not revoked');

  console.log('✅ Viewing keys flow: generate, store, use, revoke');
})();
