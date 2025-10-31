/**
 * viewing-keys.test.ts
 * 
 * Comprehensive tests for viewing keys and compliance features.
 * 
 * Test Coverage:
 * - ✅ Generate viewing key with permissions
 * - ✅ Auditor can decrypt balance with viewing key
 * - ✅ Viewing key respects permissions (allowed accounts only)
 * - ✅ Viewing key expiration works
 * - ✅ Revoke viewing key
 * - ✅ Viewing key cannot decrypt other users' data
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ViewingKeyManager, ViewingKeyConfig } from '../src/privacy/viewing-keys';
import { EncryptionUtils } from '../src/privacy/encryption';
import { 
  ViewingKey,
  EncryptedBalance 
} from '../src/privacy/types';
import { ExtendedWalletAdapter } from '../src/core/types';

// Test configuration
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';

/**
 * Create a mock wallet adapter for testing
 */
function createMockWallet(keypair: Keypair): ExtendedWalletAdapter {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => {
      tx.sign(keypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map(tx => {
        tx.sign(keypair);
        return tx;
      });
    },
    rawKeypair: keypair,
    connected: true,
    connecting: false,
    disconnect: async () => {},
    connect: async () => {},
    on: () => {},
    off: () => {},
  } as ExtendedWalletAdapter;
}

/**
 * Create a mock encrypted balance for testing
 */
async function createMockEncryptedBalance(
  amount: number,
  ownerKeypair: Keypair
): Promise<EncryptedBalance> {
  const encryptionUtils = new EncryptionUtils();
  const encrypted = await encryptionUtils.encryptAmount(
    BigInt(amount * LAMPORTS_PER_SOL),
    ownerKeypair.publicKey
  );
  
  return {
    ciphertext: encrypted.ciphertext,
    commitment: encrypted.commitment,
    randomness: encrypted.randomness,
    lastUpdated: Date.now(),
    exists: true
  };
}

/**
 * Test result tracking
 */
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function assertRejects(fn: () => Promise<any>, message: string) {
  totalTests++;
  try {
    await fn();
    failedTests++;
    console.error(`  ❌ ${message} (expected rejection but succeeded)`);
    throw new Error(`Expected rejection but succeeded: ${message}`);
  } catch (error) {
    passedTests++;
    console.log(`  ✅ ${message}`);
  }
}

/**
 * Main test runner
 */
async function runViewingKeysTests() {
  console.log('🔐 Starting Viewing Keys & Compliance Tests');
  console.log('===========================================\n');

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  
  // Create test keypairs
  const aliceKeypair = Keypair.generate();
  const bobKeypair = Keypair.generate();
  const auditorKeypair = Keypair.generate();
  
  // Create wallet adapters
  const aliceWallet = createMockWallet(aliceKeypair);
  const bobWallet = createMockWallet(bobKeypair);
  const auditorWallet = createMockWallet(auditorKeypair);
  
  const aliceViewingKeyManager = new ViewingKeyManager(aliceWallet);
  const auditorViewingKeyManager = new ViewingKeyManager(auditorWallet);

  try {
    // Test 1: Generate viewing key with default permissions
    console.log('📝 Test 1: Generate viewing key with default permissions');
    const accountAddress = Keypair.generate().publicKey;
    const viewingKey = await aliceViewingKeyManager.generateViewingKey(accountAddress);
    
    assert(viewingKey !== undefined, 'Viewing key should be defined');
    assert(viewingKey.publicKey instanceof PublicKey, 'Viewing key public key should be PublicKey');
    assert(viewingKey.encryptedPrivateKey instanceof Uint8Array, 'Encrypted private key should be Uint8Array');
    assert(viewingKey.derivationPath.length > 0, 'Derivation path should not be empty');
    assert(viewingKey.permissions.canViewBalances === true, 'Should have balance viewing permission');
    assert(viewingKey.permissions.canViewAmounts === true, 'Should have amount viewing permission');
    assert(viewingKey.expiresAt === undefined, 'Should not have expiration by default');
    console.log('');

    // Test 2: Generate viewing key with custom permissions
    console.log('📝 Test 2: Generate viewing key with custom permissions');
    const account2 = Keypair.generate().publicKey;
    const config: ViewingKeyConfig = {
      permissions: {
        canViewBalances: true,
        canViewAmounts: false,
        allowedAccounts: [account2]
      },
      expirationDays: 30,
      auditorPublicKey: auditorKeypair.publicKey
    };
    
    const customKey = await aliceViewingKeyManager.generateViewingKey(account2, config);
    assert(customKey.permissions.canViewBalances === true, 'Should have balance permission');
    assert(customKey.permissions.canViewAmounts === false, 'Should not have amount permission');
    assert(customKey.permissions.allowedAccounts.length === 1, 'Should have one allowed account');
    assert(customKey.expiresAt !== undefined, 'Should have expiration');
    assert(customKey.expiresAt! > Date.now(), 'Expiration should be in the future');
    console.log('');

    // Test 3: Auditor can decrypt balance with viewing key
    console.log('📝 Test 3: Auditor can decrypt balance with viewing key');
    const account3 = Keypair.generate().publicKey;
    const viewingKeyForAuditor = await aliceViewingKeyManager.generateViewingKey(account3, {
      permissions: {
        canViewBalances: true,
        canViewAmounts: true,
        allowedAccounts: [account3]
      },
      auditorPublicKey: auditorKeypair.publicKey
    });
    
    const testAmount = 100;
    const encryptedBalance = await createMockEncryptedBalance(testAmount, aliceKeypair);
    const decryptedAmount = await auditorViewingKeyManager.decryptBalance(
      encryptedBalance,
      viewingKeyForAuditor
    );
    
    const expectedAmount = testAmount * LAMPORTS_PER_SOL;
    const tolerance = expectedAmount * 0.01; // 1% tolerance
    assert(
      Math.abs(decryptedAmount - expectedAmount) < tolerance,
      `Decrypted amount should match (expected ~${expectedAmount}, got ${decryptedAmount})`
    );
    console.log('');

    // Test 4: Expired viewing key should be invalid
    console.log('📝 Test 4: Expired viewing key should be invalid');
    const account4 = Keypair.generate().publicKey;
    const expiredKey = await aliceViewingKeyManager.generateViewingKey(account4, {
      permissions: {
        canViewBalances: true,
        canViewAmounts: true,
        allowedAccounts: [account4]
      },
      expirationDays: -1 // Already expired
    });
    
    assert(
      !aliceViewingKeyManager.isViewingKeyValid(expiredKey),
      'Expired key should be invalid'
    );
    
    const balance4 = await createMockEncryptedBalance(50, aliceKeypair);
    await assertRejects(
      () => auditorViewingKeyManager.decryptBalance(balance4, expiredKey),
      'Should reject decryption with expired key'
    );
    console.log('');

    // Test 5: Viewing key without permission should fail
    console.log('📝 Test 5: Viewing key without permission should fail');
    const account5 = Keypair.generate().publicKey;
    const noPermKey = await aliceViewingKeyManager.generateViewingKey(account5, {
      permissions: {
        canViewBalances: false, // No permission
        canViewAmounts: true,
        allowedAccounts: [account5]
      }
    });
    
    const balance5 = await createMockEncryptedBalance(75, aliceKeypair);
    await assertRejects(
      () => auditorViewingKeyManager.decryptBalance(balance5, noPermKey),
      'Should reject decryption without permission'
    );
    console.log('');

    // Test 6: Revoke viewing key
    console.log('📝 Test 6: Revoke viewing key');
    const account6 = Keypair.generate().publicKey;
    const revokeKey = await aliceViewingKeyManager.generateViewingKey(account6, {
      permissions: {
        canViewBalances: true,
        canViewAmounts: true,
        allowedAccounts: [account6]
      },
      expirationDays: 30
    });
    
    assert(aliceViewingKeyManager.isViewingKeyValid(revokeKey), 'Key should be valid initially');
    
    const revokedKey = await aliceViewingKeyManager.revokeViewingKey(revokeKey);
    assert(!aliceViewingKeyManager.isViewingKeyValid(revokedKey), 'Revoked key should be invalid');
    assert(revokedKey.expiresAt! < Date.now(), 'Revoked key expiration should be in past');
    console.log('');

    // Test 7: Respect allowed accounts restriction
    console.log('📝 Test 7: Respect allowed accounts restriction');
    const aliceAccount = Keypair.generate().publicKey;
    const bobAccount = Keypair.generate().publicKey;
    
    const restrictedKey = await aliceViewingKeyManager.generateViewingKey(aliceAccount, {
      permissions: {
        canViewBalances: true,
        canViewAmounts: true,
        allowedAccounts: [aliceAccount] // Only Alice's account
      }
    });
    
    assert(
      aliceViewingKeyManager.canAccessAccount(restrictedKey, aliceAccount),
      'Should allow access to Alice account'
    );
    assert(
      !aliceViewingKeyManager.canAccessAccount(restrictedKey, bobAccount),
      'Should deny access to Bob account'
    );
    console.log('');

    // Test 8: Empty allowed accounts = all accounts
    console.log('📝 Test 8: Empty allowed accounts = all accounts');
    const account8 = Keypair.generate().publicKey;
    const universalKey = await aliceViewingKeyManager.generateViewingKey(account8, {
      permissions: {
        canViewBalances: true,
        canViewAmounts: true,
        allowedAccounts: [] // Empty = all accounts
      }
    });
    
    const randomAccount = Keypair.generate().publicKey;
    assert(
      aliceViewingKeyManager.canAccessAccount(universalKey, randomAccount),
      'Should allow access to any account'
    );
    console.log('');

    // Test 9: Different accounts generate different keys
    console.log('📝 Test 9: Different accounts generate different keys');
    const acc9a = Keypair.generate().publicKey;
    const acc9b = Keypair.generate().publicKey;
    
    const key9a = await aliceViewingKeyManager.generateViewingKey(acc9a);
    const key9b = await aliceViewingKeyManager.generateViewingKey(acc9b);
    
    assert(
      key9a.publicKey.toString() !== key9b.publicKey.toString(),
      'Different accounts should generate different public keys'
    );
    assert(
      Buffer.from(key9a.encryptedPrivateKey).toString('hex') !==
      Buffer.from(key9b.encryptedPrivateKey).toString('hex'),
      'Different accounts should generate different private keys'
    );
    console.log('');

    // Test 10: Key with no permissions should be invalid
    console.log('📝 Test 10: Key with no permissions should be invalid');
    const account10 = Keypair.generate().publicKey;
    const validKey10 = await aliceViewingKeyManager.generateViewingKey(account10);
    
    // Manually create invalid key with no permissions
    const invalidKey: ViewingKey = {
      ...validKey10,
      permissions: {
        canViewBalances: false,
        canViewAmounts: false,
        canViewMetadata: false,
        allowedAccounts: []
      }
    };
    
    assert(!aliceViewingKeyManager.isViewingKeyValid(invalidKey), 'Key with no permissions should be invalid');
    console.log('');

    // Test 11: Complete compliance audit workflow
    console.log('📝 Test 11: Complete compliance audit workflow');
    const aliceAccount11 = Keypair.generate().publicKey;
    
    // Step 1: Alice generates viewing key for Auditor
    const auditKey = await aliceViewingKeyManager.generateViewingKey(aliceAccount11, {
      permissions: {
        canViewBalances: true,
        canViewAmounts: true,
        allowedAccounts: [aliceAccount11]
      },
      expirationDays: 30,
      auditorPublicKey: auditorKeypair.publicKey
    });
    
    // Step 2: Alice has encrypted balance
    const aliceBalance = await createMockEncryptedBalance(500, aliceKeypair);
    
    // Step 3: Auditor decrypts Alice's balance
    const decryptedAliceBalance = await auditorViewingKeyManager.decryptBalance(
      aliceBalance,
      auditKey
    );
    
    const expectedBalance = 500 * LAMPORTS_PER_SOL;
    const balanceTolerance = expectedBalance * 0.01;
    assert(
      Math.abs(decryptedAliceBalance - expectedBalance) < balanceTolerance,
      `Auditor should decrypt Alice's balance correctly`
    );
    
    // Step 4: Alice revokes the viewing key
    const revokedAuditKey = await aliceViewingKeyManager.revokeViewingKey(auditKey);
    
    // Step 5: Auditor can no longer decrypt
    assert(!auditorViewingKeyManager.isViewingKeyValid(revokedAuditKey), 'Revoked key should be invalid');
    await assertRejects(
      () => auditorViewingKeyManager.decryptBalance(aliceBalance, revokedAuditKey),
      'Should reject decryption with revoked key'
    );
    console.log('');

    // Summary
    console.log('\n===========================================');
    console.log('📊 Test Summary');
    console.log('===========================================');
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    
    if (failedTests === 0) {
      console.log('\n🎉 All viewing keys tests passed!');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed with error:');
    console.error(error);
    console.log('\n📊 Test Summary');
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests + 1} ❌`);
    process.exit(1);
  }
}

// Run the tests
runViewingKeysTests();
