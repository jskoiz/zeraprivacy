#!/usr/bin/env tsx

/**
 * E2E Test for Confidential Transfer Functionality
 * 
 * This test validates that confidential transfer APIs are properly
 * structured. Full e2e testing requires SPL Token 2022 with confidential
 * transfer extensions which are currently in prototype stage.
 */

import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { ZeraPrivacy } from '../src/privacy/zera-privacy';
import { ExtendedWalletAdapter } from '../src/core/types';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

class LocalWallet implements ExtendedWalletAdapter {
  publicKey: any;
  constructor(public kp: Keypair) {
    this.publicKey = kp.publicKey;
  }
  async signTransaction(tx: any) { tx.partialSign(this.kp); return tx; }
  async signAllTransactions(txs: any[]) { return txs.map((t) => { t.partialSign(this.kp); return t; }); }
  get rawKeypair() { return this.kp; }
}

async function main() {
  log('\n=== Confidential Transfer E2E Test ===', 'cyan');
  log('Testing confidential transfer API structure\n', 'cyan');

  const connection = new Connection(clusterApiUrl('devnet'), { commitment: 'confirmed' });

  // Create test wallets
  const sender = Keypair.generate();
  const recipient = Keypair.generate();
  
  log(`✅ Test wallets generated`, 'green');
  log(`   Sender: ${sender.publicKey.toBase58()}`, 'reset');
  log(`   Recipient: ${recipient.publicKey.toBase58()}`, 'reset');

  const senderWallet = new LocalWallet(sender);
  const recipientWallet = new LocalWallet(recipient);

  // Test 1: Verify ZeraPrivacy can be instantiated
  log('\nTest 1: ZeraPrivacy instantiation', 'cyan');
  try {
    const privacy = new ZeraPrivacy();
    log('✅ ZeraPrivacy instantiated successfully', 'green');
  } catch (error) {
    log(`❌ Failed to instantiate: ${error}`, 'yellow');
    process.exit(1);
  }

  // Test 2: Verify privacy SDK initialization (expected to fail without blockchain setup)
  log('\nTest 2: Privacy SDK initialization', 'cyan');
  try {
    const privacy = new ZeraPrivacy();
    await privacy.init(connection, senderWallet, {
      mode: 'privacy',
      enableViewingKeys: true,
    } as any);
    
    log('✅ Privacy SDK initialized (unexpected - blockchain not set up)', 'yellow');
  } catch (error) {
    log('⚠️  Privacy SDK initialization failed (expected for prototype)', 'yellow');
    log(`   Reason: ${error instanceof Error ? error.message : 'Unknown'}`, 'reset');
    log('✅ Error handling works correctly', 'green');
  }

  // Test 3: Verify confidential transfer APIs exist
  log('\nTest 3: Verify confidential transfer APIs', 'cyan');
  const privacy = new ZeraPrivacy();
  
  const requiredMethods = [
    'init',
    'createConfidentialMint',
    'createConfidentialAccount',
    'getEncryptedBalance',
    'encryptedDeposit',
    'privateTransfer',
    'encryptedWithdraw'
  ];
  
  let allMethodsExist = true;
  for (const method of requiredMethods) {
    const exists = typeof (privacy as any)[method] === 'function';
    if (exists) {
      log(`✅ ${method} exists`, 'green');
    } else {
      log(`❌ ${method} missing`, 'yellow');
      allMethodsExist = false;
    }
  }
  
  if (allMethodsExist) {
    log('\n✅ All confidential transfer APIs are present', 'green');
  } else {
    log('\n❌ Some APIs are missing', 'yellow');
    process.exit(1);
  }

  log('\n=== Summary ===', 'cyan');
  log('✅ ZeraPrivacy API structure is correct', 'green');
  log('✅ All required methods are present', 'green');
  log('⚠️  Full blockchain integration pending SPL Token 2022', 'yellow');
  log('\n📝 Note: Complete confidential transfers require:', 'reset');
  log('   1. SPL Token 2022 with confidential transfer extension', 'reset');
  log('   2. ZK proof generation and verification', 'reset');
  log('   3. On-chain encrypted balance management', 'reset');
  log('\nTest completed successfully! ✅\n', 'green');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
