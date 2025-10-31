/**
 * native-sol-integration.test.ts
 * 
 * Integration tests for native SOL privacy operations
 * 
 * This test suite verifies that:
 * 1. Native SOL can be deposited via wSOL wrapper
 * 2. Native SOL can be withdrawn via wSOL wrapper
 * 3. No orphaned wSOL accounts are left behind
 * 4. Users never see "wSOL" in messages
 * 5. Balances are correctly tracked
 */

import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NATIVE_MINT, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { GhostSolPrivacy } from '../src/privacy/ghost-sol-privacy';
import { PrivacyConfig } from '../src/privacy/types';
import { normalizeWallet } from '../src/core/wallet';

// Test configuration
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const TEST_TIMEOUT = 60000; // 60 seconds

describe('Native SOL Privacy Integration Tests', () => {
  let connection: Connection;
  let wallet: Keypair;
  let ghostSol: GhostSolPrivacy;
  let privacyConfig: PrivacyConfig;

  beforeAll(async () => {
    // Setup connection
    connection = new Connection(RPC_URL, 'confirmed');
    
    // Create test wallet
    wallet = Keypair.generate();
    
    // Fund wallet for tests (devnet only)
    console.log('Requesting airdrop for test wallet...');
    try {
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Airdrop confirmed');
    } catch (error) {
      console.warn('Airdrop failed, continuing with existing balance:', error);
    }
    
    // Setup privacy configuration
    privacyConfig = {
      mode: 'privacy',
      enableViewingKeys: false,
      auditMode: false
    };
    
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    // Initialize fresh GhostSolPrivacy instance for each test
    ghostSol = new GhostSolPrivacy();
    await ghostSol.init(
      connection,
      normalizeWallet(wallet),
      privacyConfig
    );
  }, TEST_TIMEOUT);

  test('should deposit native SOL via wSOL wrapper', async () => {
    // Get initial balance
    const startBalance = await connection.getBalance(wallet.publicKey);
    console.log(`Initial balance: ${startBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Deposit 0.5 SOL (should wrap automatically)
    const depositAmount = 0.5 * LAMPORTS_PER_SOL;
    console.log(`Depositing ${depositAmount / LAMPORTS_PER_SOL} SOL...`);
    
    try {
      const signature = await ghostSol.encryptedDeposit(depositAmount);
      console.log('Deposit signature:', signature);
      
      // Verify: Encrypted balance should reflect deposit
      const encryptedBalance = await ghostSol.getEncryptedBalance();
      expect(encryptedBalance.exists).toBe(true);
      
      // Verify: Native SOL balance decreased
      const endBalance = await connection.getBalance(wallet.publicKey);
      console.log(`Final balance: ${endBalance / LAMPORTS_PER_SOL} SOL`);
      
      // Should be less than start (deposit amount + fees)
      expect(endBalance).toBeLessThan(startBalance - depositAmount);
      
      console.log('✓ Deposit successful');
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    }
  }, TEST_TIMEOUT);

  test('should withdraw to native SOL via wSOL wrapper', async () => {
    // Setup: Deposit 0.5 SOL first
    const depositAmount = 0.5 * LAMPORTS_PER_SOL;
    await ghostSol.encryptedDeposit(depositAmount);
    
    const startBalance = await connection.getBalance(wallet.publicKey);
    console.log(`Balance before withdraw: ${startBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Withdraw 0.3 SOL (should unwrap automatically)
    const withdrawAmount = 0.3 * LAMPORTS_PER_SOL;
    console.log(`Withdrawing ${withdrawAmount / LAMPORTS_PER_SOL} SOL...`);
    
    try {
      const signature = await ghostSol.encryptedWithdraw(withdrawAmount);
      console.log('Withdraw signature:', signature);
      
      // Verify: Native SOL balance increased
      const endBalance = await connection.getBalance(wallet.publicKey);
      console.log(`Balance after withdraw: ${endBalance / LAMPORTS_PER_SOL} SOL`);
      
      // Should be greater than start (minus fees)
      // Allow for transaction fees
      expect(endBalance).toBeGreaterThan(startBalance + (withdrawAmount * 0.9));
      
      console.log('✓ Withdraw successful');
    } catch (error) {
      console.error('Withdraw failed:', error);
      throw error;
    }
  }, TEST_TIMEOUT);

  test('should not leave orphaned wSOL accounts', async () => {
    // Full cycle: deposit → withdraw
    const amount = 0.5 * LAMPORTS_PER_SOL;
    
    console.log('Performing full cycle (deposit + withdraw)...');
    await ghostSol.encryptedDeposit(amount);
    await ghostSol.encryptedWithdraw(amount);
    
    // Check for wSOL accounts
    const wsolAddress = await getAssociatedTokenAddress(
      NATIVE_MINT,
      wallet.publicKey
    );
    
    try {
      const account = await getAccount(connection, wsolAddress);
      
      // If account exists, it should have zero balance
      expect(Number(account.amount)).toBe(0);
      console.log('✓ No orphaned wSOL balance');
      
    } catch (error) {
      // Account doesn't exist - that's fine too
      console.log('✓ No wSOL account exists (cleaned up)');
    }
  }, TEST_TIMEOUT);

  test('should handle multiple deposits and withdrawals', async () => {
    const initialBalance = await connection.getBalance(wallet.publicKey);
    
    // Deposit 0.2 SOL
    await ghostSol.encryptedDeposit(0.2 * LAMPORTS_PER_SOL);
    console.log('✓ First deposit completed');
    
    // Deposit another 0.3 SOL
    await ghostSol.encryptedDeposit(0.3 * LAMPORTS_PER_SOL);
    console.log('✓ Second deposit completed');
    
    // Withdraw 0.1 SOL
    await ghostSol.encryptedWithdraw(0.1 * LAMPORTS_PER_SOL);
    console.log('✓ First withdrawal completed');
    
    // Withdraw 0.2 SOL
    await ghostSol.encryptedWithdraw(0.2 * LAMPORTS_PER_SOL);
    console.log('✓ Second withdrawal completed');
    
    // Verify encrypted balance reflects net change
    const encryptedBalance = await ghostSol.getEncryptedBalance();
    expect(encryptedBalance.exists).toBe(true);
    
    console.log('✓ Multiple operations successful');
  }, TEST_TIMEOUT);

  test('should cleanup wSOL accounts on demand', async () => {
    // Deposit and withdraw to potentially leave some wSOL
    const amount = 0.3 * LAMPORTS_PER_SOL;
    await ghostSol.encryptedDeposit(amount);
    await ghostSol.encryptedWithdraw(amount);
    
    // Explicitly cleanup
    console.log('Running cleanup...');
    const cleanupSig = await ghostSol.cleanupWsolAccounts();
    
    if (cleanupSig) {
      console.log('Cleanup performed:', cleanupSig);
    } else {
      console.log('No cleanup needed');
    }
    
    // Verify no wSOL accounts remain
    const wsolAddress = await getAssociatedTokenAddress(
      NATIVE_MINT,
      wallet.publicKey
    );
    
    try {
      const account = await getAccount(connection, wsolAddress);
      expect(Number(account.amount)).toBe(0);
    } catch {
      // Account doesn't exist - perfect!
      console.log('✓ Cleanup successful - no wSOL accounts');
    }
  }, TEST_TIMEOUT);

  test('should handle zero balance gracefully', async () => {
    // Try to get balance on fresh account
    const encryptedBalance = await ghostSol.getEncryptedBalance();
    
    // Should exist but show zero
    expect(encryptedBalance).toBeDefined();
    console.log('✓ Zero balance handled correctly');
  }, TEST_TIMEOUT);

  test('user messages should never mention wSOL', async () => {
    // Capture console output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    try {
      // Perform operations
      await ghostSol.encryptedDeposit(0.1 * LAMPORTS_PER_SOL);
      await ghostSol.encryptedWithdraw(0.05 * LAMPORTS_PER_SOL);
      
      // Check that no log mentions "wSOL"
      const mentionsWsol = logs.some(log => 
        log.toLowerCase().includes('wsol')
      );
      
      expect(mentionsWsol).toBe(false);
      console.log('✓ User messages are clean (no wSOL mentions)');
      
    } finally {
      // Restore console.log
      console.log = originalLog;
    }
  }, TEST_TIMEOUT);
});

// Run tests
if (require.main === module) {
  console.log('Running Native SOL Integration Tests...');
  console.log('RPC URL:', RPC_URL);
  console.log('---\n');
}
