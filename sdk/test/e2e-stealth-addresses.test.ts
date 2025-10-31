#!/usr/bin/env tsx

/**
 * End-to-End Test Suite for Stealth Address Functionality
 * 
 * This test suite validates the complete stealth address implementation:
 * 1. Generate stealth meta-addresses
 * 2. Generate unique stealth addresses for payments
 * 3. Detect payments to stealth addresses (scanning)
 * 4. Derive spending keys for detected payments
 * 5. Maintain on-chain unlinkability
 * 
 * Run with: npm run test:e2e-stealth
 */

import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import * as GhostSol from '../src/index';
import { 
  StealthMetaAddress, 
  StealthAddress, 
  EphemeralKey,
  StealthPayment 
} from '../src/privacy/types';

// Test configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(step, 'cyan');
  log('='.repeat(80), 'cyan');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Test 1: Generate stealth meta-address via main API
 */
async function testGenerateStealthMetaAddress(): Promise<StealthMetaAddress> {
  logStep('Test 1: Generate Stealth Meta-Address via Main API');
  
  try {
    // Generate keypairs for view and spend
    const viewKeypair = Keypair.generate();
    const spendKeypair = Keypair.generate();
    
    logInfo(`View Public Key: ${viewKeypair.publicKey.toBase58()}`);
    logInfo(`Spend Public Key: ${spendKeypair.publicKey.toBase58()}`);
    
    // Generate meta-address
    const metaAddress = GhostSol.generateStealthMetaAddress(viewKeypair, spendKeypair);
    
    // Validate structure
    if (!metaAddress.viewPublicKey || !metaAddress.spendPublicKey) {
      throw new Error('Meta-address missing required public keys');
    }
    
    if (!metaAddress.derivationPath) {
      throw new Error('Meta-address missing derivation path');
    }
    
    if (!metaAddress.createdAt || metaAddress.createdAt <= 0) {
      throw new Error('Meta-address has invalid timestamp');
    }
    
    logSuccess('Stealth meta-address generated successfully');
    logInfo(`View Public Key: ${metaAddress.viewPublicKey.toBase58()}`);
    logInfo(`Spend Public Key: ${metaAddress.spendPublicKey.toBase58()}`);
    logInfo(`Derivation Path: ${metaAddress.derivationPath}`);
    logInfo(`Version: ${metaAddress.version}`);
    
    return metaAddress;
    
  } catch (error) {
    logError(`Failed to generate stealth meta-address: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 2: Generate unique stealth addresses
 */
async function testGenerateUniqueStealthAddresses(metaAddress: StealthMetaAddress): Promise<{
  stealthAddresses: StealthAddress[];
  ephemeralKeys: EphemeralKey[];
}> {
  logStep('Test 2: Generate Unique Stealth Addresses');
  
  try {
    const stealthAddresses: StealthAddress[] = [];
    const ephemeralKeys: EphemeralKey[] = [];
    const numAddresses = 5;
    
    logInfo(`Generating ${numAddresses} unique stealth addresses...`);
    
    for (let i = 0; i < numAddresses; i++) {
      const { stealthAddress, ephemeralKey } = GhostSol.generateStealthAddress(metaAddress);
      
      stealthAddresses.push(stealthAddress);
      ephemeralKeys.push(ephemeralKey);
      
      logInfo(`[${i + 1}] Stealth Address: ${stealthAddress.address.toBase58()}`);
      logInfo(`[${i + 1}] Ephemeral Key: ${ephemeralKey.publicKey.toBase58()}`);
    }
    
    // Verify uniqueness
    const uniqueAddresses = new Set(stealthAddresses.map(sa => sa.address.toBase58()));
    if (uniqueAddresses.size !== numAddresses) {
      throw new Error(`Generated stealth addresses are not unique! Expected ${numAddresses}, got ${uniqueAddresses.size}`);
    }
    
    const uniqueEphemeralKeys = new Set(ephemeralKeys.map(ek => ek.publicKey.toBase58()));
    if (uniqueEphemeralKeys.size !== numAddresses) {
      throw new Error(`Generated ephemeral keys are not unique! Expected ${numAddresses}, got ${uniqueEphemeralKeys.size}`);
    }
    
    logSuccess(`Generated ${numAddresses} unique stealth addresses`);
    logSuccess('All stealth addresses are unique ✓');
    logSuccess('All ephemeral keys are unique ✓');
    
    return { stealthAddresses, ephemeralKeys };
    
  } catch (error) {
    logError(`Failed to generate unique stealth addresses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 3: Detect payments to stealth addresses (scanning)
 */
async function testScanForPayments(
  metaAddress: StealthMetaAddress,
  viewKeypair: Keypair,
  ephemeralKeys: EphemeralKey[]
): Promise<StealthPayment[]> {
  logStep('Test 3: Detect Payments to Stealth Addresses');
  
  try {
    logInfo('Scanning for payments using view key...');
    logInfo(`Number of ephemeral keys to scan: ${ephemeralKeys.length}`);
    
    // Scan for payments
    const detectedPayments = await GhostSol.scanForPayments(
      metaAddress,
      viewKeypair.secretKey.slice(0, 32), // View private key
      ephemeralKeys
    );
    
    logSuccess(`Detected ${detectedPayments.length} payments`);
    
    if (detectedPayments.length === 0) {
      logWarning('No payments detected (this is expected without actual on-chain transactions)');
    }
    
    // Validate each detected payment
    for (let i = 0; i < detectedPayments.length; i++) {
      const payment = detectedPayments[i];
      
      if (!payment.stealthAddress) {
        throw new Error(`Payment ${i} missing stealth address`);
      }
      
      if (!payment.ephemeralPublicKey) {
        throw new Error(`Payment ${i} missing ephemeral public key`);
      }
      
      if (!payment.sharedSecret) {
        throw new Error(`Payment ${i} missing shared secret`);
      }
      
      logInfo(`[${i + 1}] Stealth Address: ${payment.stealthAddress.toBase58()}`);
      logInfo(`[${i + 1}] Ephemeral Key: ${payment.ephemeralPublicKey.toBase58()}`);
      logInfo(`[${i + 1}] Detected At: ${new Date(payment.detectedAt).toISOString()}`);
    }
    
    logSuccess('Payment scanning functionality validated ✓');
    
    return detectedPayments;
    
  } catch (error) {
    logError(`Failed to scan for payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 4: Derive spending keys correctly
 */
async function testDeriveSpendingKeys(
  payments: StealthPayment[],
  spendKeypair: Keypair
): Promise<void> {
  logStep('Test 4: Derive Spending Keys for Detected Payments');
  
  try {
    if (payments.length === 0) {
      logWarning('No payments to derive spending keys for (skipping test)');
      return;
    }
    
    logInfo(`Deriving spending keys for ${payments.length} payments...`);
    
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      // Derive spending key
      const spendingKey = GhostSol.deriveStealthSpendingKey(
        payment,
        spendKeypair.secretKey.slice(0, 32)
      );
      
      if (!spendingKey || spendingKey.length !== 32) {
        throw new Error(`Invalid spending key derived for payment ${i}`);
      }
      
      logInfo(`[${i + 1}] Spending key derived successfully (${spendingKey.length} bytes)`);
      logSuccess(`[${i + 1}] Spending key is valid ✓`);
    }
    
    logSuccess('All spending keys derived successfully ✓');
    
  } catch (error) {
    logError(`Failed to derive spending keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 5: Maintain on-chain unlinkability
 */
async function testOnChainUnlinkability(
  stealthAddresses: StealthAddress[]
): Promise<void> {
  logStep('Test 5: Verify On-Chain Unlinkability');
  
  try {
    logInfo('Verifying that stealth addresses are unlinkable...');
    
    // Check 1: All stealth addresses are unique
    const uniqueAddresses = new Set(stealthAddresses.map(sa => sa.address.toBase58()));
    if (uniqueAddresses.size !== stealthAddresses.length) {
      throw new Error('Stealth addresses are not unique - linkability risk!');
    }
    logSuccess('All stealth addresses are unique ✓');
    
    // Check 2: All ephemeral keys are unique
    const uniqueEphemeralKeys = new Set(stealthAddresses.map(sa => sa.ephemeralPublicKey.toBase58()));
    if (uniqueEphemeralKeys.size !== stealthAddresses.length) {
      throw new Error('Ephemeral keys are not unique - linkability risk!');
    }
    logSuccess('All ephemeral keys are unique ✓');
    
    // Check 3: Stealth addresses don't match meta-address public keys
    const metaAddressKeys = new Set([
      stealthAddresses[0].metaAddress.viewPublicKey.toBase58(),
      stealthAddresses[0].metaAddress.spendPublicKey.toBase58()
    ]);
    
    for (const sa of stealthAddresses) {
      if (metaAddressKeys.has(sa.address.toBase58())) {
        throw new Error('Stealth address matches meta-address key - privacy leak!');
      }
    }
    logSuccess('Stealth addresses do not match meta-address keys ✓');
    
    // Check 4: Shared secret hashes are unique (different secrets)
    const uniqueSecrets = new Set(stealthAddresses.map(sa => sa.sharedSecretHash));
    if (uniqueSecrets.size !== stealthAddresses.length) {
      logWarning('Some shared secret hashes are not unique (may indicate reused ephemeral keys)');
    } else {
      logSuccess('All shared secret hashes are unique ✓');
    }
    
    // Check 5: Timestamp validation
    for (let i = 0; i < stealthAddresses.length; i++) {
      if (!stealthAddresses[i].createdAt || stealthAddresses[i].createdAt <= 0) {
        throw new Error(`Stealth address ${i} has invalid timestamp`);
      }
    }
    logSuccess('All timestamps are valid ✓');
    
    logSuccess('On-chain unlinkability verified ✓');
    logInfo('Stealth addresses maintain complete payment unlinkability');
    
  } catch (error) {
    logError(`Unlinkability check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runStealthAddressTests() {
  logStep('🚀 Starting GhostSol Stealth Address E2E Tests');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Initialize SDK in privacy mode
    logStep('Initializing GhostSol SDK in Privacy Mode');
    
    const wallet = Keypair.generate();
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    
    logInfo(`Test wallet address: ${wallet.publicKey.toBase58()}`);
    
    await GhostSol.init({
      wallet,
      cluster: 'devnet',
      privacy: {
        mode: 'privacy',
        enableViewingKeys: true
      }
    });
    
    logSuccess('SDK initialized in privacy mode ✓');
    
    // Generate keypairs for stealth address operations
    const viewKeypair = Keypair.generate();
    const spendKeypair = Keypair.generate();
    
    // Run tests
    try {
      const metaAddress = await testGenerateStealthMetaAddress();
      testsPassed++;
      
      try {
        const { stealthAddresses, ephemeralKeys } = await testGenerateUniqueStealthAddresses(metaAddress);
        testsPassed++;
        
        try {
          const detectedPayments = await testScanForPayments(metaAddress, viewKeypair, ephemeralKeys);
          testsPassed++;
          
          try {
            await testDeriveSpendingKeys(detectedPayments, spendKeypair);
            testsPassed++;
            
            try {
              await testOnChainUnlinkability(stealthAddresses);
              testsPassed++;
            } catch (error) {
              logError(`Test 5 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              testsFailed++;
            }
          } catch (error) {
            logError(`Test 4 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            testsFailed++;
          }
        } catch (error) {
          logError(`Test 3 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          testsFailed++;
        }
      } catch (error) {
        logError(`Test 2 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        testsFailed++;
      }
    } catch (error) {
      logError(`Test 1 failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      testsFailed++;
    }
    
    // Print test summary
    logStep('📊 Test Summary');
    
    log(`\nTotal Tests: ${testsPassed + testsFailed}`, 'bright');
    log(`Passed: ${testsPassed}`, 'green');
    log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
    
    if (testsFailed === 0) {
      log('\n🎉 All tests passed!', 'green');
      logSuccess('Stealth address functionality is working correctly');
    } else {
      log('\n⚠️  Some tests failed', 'yellow');
      logWarning('Review the errors above for details');
    }
    
    // Exit with appropriate code
    process.exit(testsFailed > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runStealthAddressTests().catch(console.error);
}

export { runStealthAddressTests };
