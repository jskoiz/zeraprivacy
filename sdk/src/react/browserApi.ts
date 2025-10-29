import { GhostSol } from '../core/ghost-sol';
import type { GhostSolConfig } from '../core/types';

let sdk: GhostSol | null = null;

export async function init(config: GhostSolConfig): Promise<void> {
  sdk = new GhostSol();
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

// ----------------------
// Privacy-mode lightweight stubs
// These provide non-crashing placeholders suitable for browser demos
// without importing heavy privacy crypto modules.

export type EncryptedBalanceLite = {
  exists: boolean;
  lastUpdated: number;
  ciphertextPreview: string; // hex preview for UI only
};

export async function getEncryptedBalance(): Promise<EncryptedBalanceLite> {
  // Return a harmless placeholder to demonstrate UI without heavy crypto
  return {
    exists: true,
    lastUpdated: Date.now(),
    ciphertextPreview: '0xenc...balance',
  };
}

export async function generateViewingKey(): Promise<string> {
  // Generate a demo-friendly pseudo viewing key string
  const rand = Math.random().toString(36).slice(2, 10);
  return `vk_demo_${rand}`;
}

export async function privacyDeposit(_amount: number): Promise<never> {
  // Prototype-only in this browser demo
  throw new Error('Privacy deposit not available in browser demo');
}

export async function privacyTransfer(_to: string, _amount: number): Promise<never> {
  throw new Error('Privacy transfer not available in browser demo');
}

export async function privacyWithdraw(_amount: number): Promise<never> {
  throw new Error('Privacy withdraw not available in browser demo');
}
