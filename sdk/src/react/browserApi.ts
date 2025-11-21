import { ZeraPrivacy } from '../privacy/zera-privacy';
import type { ZeraConfig } from '../core/types';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

let sdk: ZeraPrivacy | null = null;
let connection: Connection | null = null;

export async function init(config: ZeraConfig): Promise<void> {
  sdk = new ZeraPrivacy();

  // Create connection if not provided in config (though ZeraConfig usually has it or rpcUrl)
  // We need to handle the config format expected by ZeraPrivacy.init
  // ZeraPrivacy.init takes (Connection, WalletAdapter, PrivacyConfig)

  // We need to reconstruct the connection from config if needed
  const rpcUrl = config.rpcUrl || (config.cluster === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com');

  connection = new Connection(rpcUrl, config.commitment || 'confirmed');

  if (!config.wallet) {
    throw new Error("Wallet required for initialization");
  }

  await sdk.init(
    connection,
    config.wallet as any, // Cast to ExtendedWalletAdapter
    config.privacy || { mode: 'privacy' }
  );
}

export function isInitialized(): boolean {
  return sdk !== null;
}

export function getAddress(): string {
  if (!sdk) throw new Error('SDK not initialized');
  // @ts-ignore - Accessing private wallet for now
  return sdk.wallet.publicKey.toBase58();
}

export async function getBalance(): Promise<number> {
  if (!sdk) throw new Error('SDK not initialized');
  // This returns public balance usually? Or confidential?
  // The old API implied public balance maybe?
  // Let's return public balance for now using connection
  if (!connection || !sdk) return 0;
  // @ts-ignore
  return await connection.getBalance(sdk.wallet.publicKey);
}

export async function compress(amount: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  // Map compress to deposit (shield)
  // We need a mint. The old API didn't specify mint. 
  // This implies the old Zera class managed a default mint or something.
  // For now, we'll throw or use a hardcoded mint if we had one.
  // Since we don't have a default mint in ZeraPrivacy, this is tricky.
  throw new Error("Compress requires a mint address in the new API. Please use deposit(account, mint, amount).");
}

export async function transfer(to: string, amount: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  // We need a mint.
  throw new Error("Transfer requires a mint address in the new API.");
}

export async function decompress(amount: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  // Map decompress to withdraw (unshield)
  throw new Error("Decompress requires a mint address in the new API.");
}

export async function fundDevnet(lamports: number = LAMPORTS_PER_SOL): Promise<string> {
  if (!connection || !sdk) throw new Error('SDK not initialized');
  // @ts-ignore
  const pubkey = sdk.wallet.publicKey;
  const sig = await connection.requestAirdrop(pubkey, lamports);
  await connection.confirmTransaction(sig);
  return sig;
}


