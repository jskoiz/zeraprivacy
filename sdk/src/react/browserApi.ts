import { Zera } from '../core/zera';
import type { ZeraConfig } from '../core/types';

let sdk: Zera | null = null;

export async function init(config: ZeraConfig): Promise<void> {
  sdk = new Zera();
  await sdk.init({ ...config, privacy: undefined });
}

export function isInitialized(): boolean {
  return sdk !== null;
}

export function getAddress(): string {
  if (!sdk) throw new Error('SDK not initialized');
  return sdk.getAddress();
}

export async function getBalance(): Promise<number> {
  if (!sdk) throw new Error('SDK not initialized');
  return sdk.getBalance();
}

export async function compress(amount: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  return sdk.compress(amount);
}

export async function transfer(to: string, amount: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  return sdk.transfer(to, amount);
}

export async function decompress(amount: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  return sdk.decompress(amount);
}

export async function fundDevnet(lamports?: number): Promise<string> {
  if (!sdk) throw new Error('SDK not initialized');
  return sdk.fundDevnet(lamports);
}

