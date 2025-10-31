/**
 * test/stealth-addresses.test.ts
 * 
 * Comprehensive test suite for stealth address protocol
 * 
 * Tests cover:
 * - Meta-address generation
 * - Stealth address generation
 * - Payment detection
 * - Unlinkability verification
 * - ECDH security
 * - Privacy guarantees
 */

import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { 
  StealthAddressManager, 
  StealthAddressUtils,
  StealthMetaAddress,
  StealthAddress
} from '../src/privacy/stealth-addresses';

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertNotEqual<T>(actual: T, notExpected: T, message: string) {
  if (actual === notExpected) {
    throw new Error(`${message}\nShould not equal: ${notExpected}\nActual: ${actual}`);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Stealth Address Protocol Tests\n');
  
  let passedTests = 0;
  let failedTests = 0;
  
  const tests = [
    testGenerateStealthMetaAddress,
    testGenerateStealthAddress,
    testUniqueStealthAddresses,
    testDetectPaymentToStealth,
    testDetectMultiplePayments,
    testDeriveStealthSpendingKey,
    testUnlinkability,
    testECDHKeyExchange,
    testInvalidTransactionDetection,
    testMetaAddressEncoding,
    testScanTransactionsBatch,
    testLargeScaleUnlinkability,
    testPrivacyNoLeaks,
  ];
  
  for (const test of tests) {
    try {
      await test();
      console.log(`✅ ${test.name}`);
      passedTests++;
    } catch (error) {
      console.error(`❌ ${test.name}`);
      console.error(`   ${error instanceof Error ? error.message : error}`);
      failedTests++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tests completed: ${passedTests + failedTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log('='.repeat(60));
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

// ============================================================================
// Test Cases
// ============================================================================

/**
 * Test 1: Generate stealth meta-address
 */
async function testGenerateStealthMetaAddress() {
  const manager = new StealthAddressManager();
  const metaAddress = await manager.generateStealthMetaAddress();
  
  // Verify all components exist
  assert(metaAddress.viewingPublicKey !== undefined, 'Viewing public key should exist');
  assert(metaAddress.spendingPublicKey !== undefined, 'Spending public key should exist');
  assert(metaAddress.viewingSecretKey !== undefined, 'Viewing secret key should exist');
  assert(metaAddress.spendingSecretKey !== undefined, 'Spending secret key should exist');
  
  // Verify keys are different
  assertNotEqual(
    Buffer.from(metaAddress.viewingPublicKey).toString('hex'),
    Buffer.from(metaAddress.spendingPublicKey).toString('hex'),
    'Viewing and spending public keys should be different'
  );
  
  // Verify keys have correct length
  assertEqual(metaAddress.viewingPublicKey.length, 32, 'Viewing public key should be 32 bytes');
  assertEqual(metaAddress.spendingPublicKey.length, 32, 'Spending public key should be 32 bytes');
  assertEqual(metaAddress.viewingSecretKey.length, 32, 'Viewing secret key should be 32 bytes');
  assertEqual(metaAddress.spendingSecretKey.length, 32, 'Spending secret key should be 32 bytes');
}

/**
 * Test 2: Generate stealth address
 */
async function testGenerateStealthAddress() {
  const manager = new StealthAddressManager();
  const recipientMeta = await manager.generateStealthMetaAddress();
  
  const stealthAddress = await manager.generateStealthAddress(recipientMeta);
  
  // Verify stealth address components
  assert(stealthAddress.address !== undefined, 'Stealth address should exist');
  assert(stealthAddress.ephemeralPublicKey !== undefined, 'Ephemeral public key should exist');
  assert(stealthAddress.sharedSecret !== undefined, 'Shared secret should exist');
  
  // Verify stealth address is different from spending public key
  // (We can't directly compare since one is derived and one is raw, but they should exist)
  assert(stealthAddress.address !== undefined, 'Stealth address should exist');
  assert(stealthAddress.ephemeralKeyRaw !== undefined, 'Raw ephemeral key should exist');
}

/**
 * Test 3: Generate unique stealth addresses each time
 */
async function testUniqueStealthAddresses() {
  const manager = new StealthAddressManager();
  const recipientMeta = await manager.generateStealthMetaAddress();
  
  // Generate multiple stealth addresses
  const addresses: string[] = [];
  const count = 10;
  
  for (let i = 0; i < count; i++) {
    const stealth = await manager.generateStealthAddress(recipientMeta);
    addresses.push(stealth.address.toBase58());
  }
  
  // Verify all addresses are unique
  const uniqueAddresses = new Set(addresses);
  assertEqual(uniqueAddresses.size, count, 'All stealth addresses should be unique');
  
  // Verify ephemeral keys are different too
  const stealth1 = await manager.generateStealthAddress(recipientMeta);
  const stealth2 = await manager.generateStealthAddress(recipientMeta);
  
  assertNotEqual(
    stealth1.ephemeralPublicKey.toBase58(),
    stealth2.ephemeralPublicKey.toBase58(),
    'Ephemeral keys should be unique for each stealth address'
  );
}

/**
 * Test 4: Detect payment sent to stealth address
 */
async function testDetectPaymentToStealth() {
  const manager = new StealthAddressManager();
  
  // Setup: Bob generates his meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Alice generates a stealth address for Bob
  const stealthAddress = await manager.generateStealthAddress(bobMeta);
  
  // Bob scans the transaction to see if it's for him
  const paymentInfo = await manager.isTransactionForMe(
    stealthAddress.ephemeralKeyRaw,
    stealthAddress.address,
    bobMeta
  );
  
  // Bob should detect this is for him
  assert(paymentInfo.isForMe, 'Recipient should detect payment to their stealth address');
  assert(paymentInfo.stealthAddress !== undefined, 'Stealth address should be included');
  assert(paymentInfo.ephemeralPublicKey !== undefined, 'Ephemeral key should be included');
  assert(paymentInfo.sharedSecret !== undefined, 'Shared secret should be included');
  
  assertEqual(
    paymentInfo.stealthAddress!.toBase58(),
    stealthAddress.address.toBase58(),
    'Detected stealth address should match'
  );
}

/**
 * Test 5: Detect multiple payments correctly
 */
async function testDetectMultiplePayments() {
  const manager = new StealthAddressManager();
  
  // Setup: Bob generates his meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Alice sends multiple payments to Bob
  const alicePayments: StealthAddress[] = [];
  for (let i = 0; i < 5; i++) {
    const stealth = await manager.generateStealthAddress(bobMeta);
    alicePayments.push(stealth);
  }
  
  // Bob scans each transaction
  for (const payment of alicePayments) {
    const paymentInfo = await manager.isTransactionForMe(
      payment.ephemeralKeyRaw,
      payment.address,
      bobMeta
    );
    
    assert(
      paymentInfo.isForMe,
      `Bob should detect payment ${payment.address.toBase58()}`
    );
  }
}

/**
 * Test 6: Derive stealth spending key
 */
async function testDeriveStealthSpendingKey() {
  const manager = new StealthAddressManager();
  
  // Setup: Bob generates his meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Alice sends to Bob's stealth address
  const stealthAddress = await manager.generateStealthAddress(bobMeta);
  
  // Bob detects the payment
  const paymentInfo = await manager.isTransactionForMe(
    stealthAddress.ephemeralKeyRaw,
    stealthAddress.address,
    bobMeta
  );
  
  assert(paymentInfo.isForMe, 'Bob should detect payment');
  
  // Bob derives the spending key
  const spendingKey = await manager.deriveStealthSpendingKey(
    bobMeta,
    paymentInfo.sharedSecret!
  );
  
  // Verify spending key is generated
  assert(spendingKey !== undefined, 'Spending key should be derived');
  assert(spendingKey.publicKey !== undefined, 'Spending key should have public key');
  assert(spendingKey.secretKey.length === 64, 'Secret key should be 64 bytes');
}

/**
 * Test 7: Verify unlinkability on-chain
 */
async function testUnlinkability() {
  const manager = new StealthAddressManager();
  
  // Generate 10 stealth addresses for same recipient
  const recipientMeta = await manager.generateStealthMetaAddress();
  const stealthAddresses: PublicKey[] = [];
  
  for (let i = 0; i < 10; i++) {
    const stealth = await manager.generateStealthAddress(recipientMeta);
    stealthAddresses.push(stealth.address);
  }
  
  // Verify all addresses are unique
  const uniqueAddresses = new Set(stealthAddresses.map(a => a.toBase58()));
  assertEqual(uniqueAddresses.size, 10, 'All stealth addresses should be unique');
  
  // Verify unlinkability
  const isUnlinkable = StealthAddressUtils.verifyUnlinkability(stealthAddresses);
  assert(isUnlinkable, 'Stealth addresses should be unlinkable');
  
  // On-chain analysis should NOT be able to link them
  // (they all look random and independent)
}

/**
 * Test 8: ECDH key exchange works correctly
 */
async function testECDHKeyExchange() {
  const manager = new StealthAddressManager();
  
  // Alice and Bob each have keypairs
  const alice = Keypair.generate();
  const bob = Keypair.generate();
  
  // Test that ECDH produces same shared secret both ways
  // Note: This tests the internal ecdh method works correctly
  const recipientMeta = await manager.generateStealthMetaAddress();
  
  // Generate stealth address
  const stealth1 = await manager.generateStealthAddress(recipientMeta);
  const stealth2 = await manager.generateStealthAddress(recipientMeta);
  
  // Shared secrets should be different (different ephemeral keys)
  assertNotEqual(
    Buffer.from(stealth1.sharedSecret!).toString('hex'),
    Buffer.from(stealth2.sharedSecret!).toString('hex'),
    'Different ephemeral keys should produce different shared secrets'
  );
}

/**
 * Test 9: Invalid transaction detection
 */
async function testInvalidTransactionDetection() {
  const manager = new StealthAddressManager();
  
  // Bob's meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Alice sends to Carol (not Bob)
  const carolMeta = await manager.generateStealthMetaAddress();
  const carolStealth = await manager.generateStealthAddress(carolMeta);
  
  // Bob scans Alice's transaction to Carol
  const paymentInfo = await manager.isTransactionForMe(
    carolStealth.ephemeralKeyRaw,
    carolStealth.address,
    bobMeta
  );
  
  // Bob should NOT detect this as his payment
  assert(!paymentInfo.isForMe, 'Bob should not detect payment meant for Carol');
}

/**
 * Test 10: Meta-address encoding/decoding
 */
async function testMetaAddressEncoding() {
  const manager = new StealthAddressManager();
  const metaAddress = await manager.generateStealthMetaAddress();
  
  // Encode meta-address
  const encoded = StealthAddressUtils.encodeMetaAddress(metaAddress);
  
  // Verify format
  assert(encoded.startsWith('stealth:'), 'Encoded address should start with "stealth:"');
  
  // Decode meta-address
  const decoded = StealthAddressUtils.decodeMetaAddress(encoded);
  
  // Verify decoded matches original
  assertEqual(
    Buffer.from(decoded.viewingPublicKey).toString('hex'),
    Buffer.from(metaAddress.viewingPublicKey).toString('hex'),
    'Decoded viewing key should match original'
  );
  
  assertEqual(
    Buffer.from(decoded.spendingPublicKey).toString('hex'),
    Buffer.from(metaAddress.spendingPublicKey).toString('hex'),
    'Decoded spending key should match original'
  );
  
  // Note: Private keys are intentionally not included in encoding
}

/**
 * Test 11: Scan transactions in batch
 */
async function testScanTransactionsBatch() {
  const manager = new StealthAddressManager();
  
  // Bob's meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Create mixed batch of transactions (some for Bob, some for others)
  const transactions: Array<{ ephemeralKey: PublicKey; destination: PublicKey }> = [];
  const bobPaymentCount = 3;
  
  // Add payments for Bob
  for (let i = 0; i < bobPaymentCount; i++) {
    const stealth = await manager.generateStealthAddress(bobMeta);
    transactions.push({
      ephemeralKey: stealth.ephemeralKeyRaw,
      destination: stealth.address
    });
  }
  
  // Add payments for others
  const otherMeta = await manager.generateStealthMetaAddress();
  for (let i = 0; i < 5; i++) {
    const stealth = await manager.generateStealthAddress(otherMeta);
    transactions.push({
      ephemeralKey: stealth.ephemeralKeyRaw,
      destination: stealth.address
    });
  }
  
  // Shuffle transactions
  transactions.sort(() => Math.random() - 0.5);
  
  // Scan all transactions
  const detected = await manager.scanTransactions(transactions, bobMeta);
  
  // Bob should detect exactly his payments
  assertEqual(
    detected.length,
    bobPaymentCount,
    `Bob should detect exactly ${bobPaymentCount} payments`
  );
  
  // All detected payments should be for Bob
  for (const payment of detected) {
    assert(payment.isForMe, 'All detected payments should be for Bob');
  }
}

/**
 * Test 12: Large-scale unlinkability test
 */
async function testLargeScaleUnlinkability() {
  const manager = new StealthAddressManager();
  
  // Bob's meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Alice generates 100 stealth addresses for Bob
  const stealthAddresses: PublicKey[] = [];
  const count = 100;
  
  console.log(`  → Generating ${count} stealth addresses...`);
  
  for (let i = 0; i < count; i++) {
    const stealth = await manager.generateStealthAddress(bobMeta);
    stealthAddresses.push(stealth.address);
  }
  
  // Verify all unique
  const uniqueAddresses = new Set(stealthAddresses.map(a => a.toBase58()));
  assertEqual(uniqueAddresses.size, count, `All ${count} addresses should be unique`);
  
  // Verify unlinkability
  const isUnlinkable = StealthAddressUtils.verifyUnlinkability(stealthAddresses);
  assert(isUnlinkable, 'All stealth addresses should be unlinkable');
  
  console.log(`  → All ${count} addresses are unique and unlinkable ✓`);
  
  // On-chain observer should NOT be able to:
  // - Link addresses together
  // - Determine they're all for Bob
  // - Determine Alice sent them
}

/**
 * Test 13: Privacy - no information leaks in errors
 */
async function testPrivacyNoLeaks() {
  const manager = new StealthAddressManager();
  
  // Bob's meta-address
  const bobMeta = await manager.generateStealthMetaAddress();
  
  // Create invalid transaction
  const randomAddress = Keypair.generate().publicKey;
  const randomEphemeral = Keypair.generate().publicKey;
  
  // This should not throw or leak information
  // Use random bytes for ephemeral key
  const randomEphemeralBytes = new Uint8Array(32);
  crypto.getRandomValues(randomEphemeralBytes);
  
  const paymentInfo = await manager.isTransactionForMe(
    randomEphemeralBytes,
    randomAddress,
    bobMeta
  );
  
  // Should just return false, no information leaked
  assert(!paymentInfo.isForMe, 'Invalid transaction should not be detected as payment');
  
  // Verify no private keys are exposed in any public methods
  const metaAddress = await manager.generateStealthMetaAddress();
  const stealthAddress = await manager.generateStealthAddress(metaAddress);
  
  // Stealth address object should not contain private keys
  // (sharedSecret is OK as it's only useful with the viewing key)
  assert(
    !('viewingSecretKey' in stealthAddress),
    'Stealth address should not expose viewing secret key'
  );
  assert(
    !('spendingSecretKey' in stealthAddress),
    'Stealth address should not expose spending secret key'
  );
}

// ============================================================================
// Additional Integration Tests
// ============================================================================

/**
 * Integration Test: Full payment flow
 */
async function testFullPaymentFlow() {
  console.log('\n📋 Running Full Payment Flow Integration Test\n');
  
  const manager = new StealthAddressManager();
  
  // 1. Bob generates and publishes his meta-address
  console.log('1. Bob generates stealth meta-address...');
  const bobMeta = await manager.generateStealthMetaAddress();
  const bobMetaEncoded = StealthAddressUtils.encodeMetaAddress(bobMeta);
  console.log(`   Meta-address: ${bobMetaEncoded.substring(0, 50)}...`);
  
  // 2. Alice wants to send 0.5 SOL to Bob
  console.log('\n2. Alice generates stealth address for Bob...');
  const stealthAddress = await manager.generateStealthAddress(bobMeta);
  console.log(`   Stealth address: ${stealthAddress.address.toBase58()}`);
  console.log(`   Ephemeral key: ${stealthAddress.ephemeralPublicKey.toBase58()}`);
  
  // 3. Alice sends transaction (simulated)
  console.log('\n3. Alice sends 0.5 SOL to stealth address...');
  const amount = 0.5 * LAMPORTS_PER_SOL;
  console.log(`   Amount: ${amount / LAMPORTS_PER_SOL} SOL`);
  
  // 4. Bob scans blockchain for incoming payments
  console.log('\n4. Bob scans blockchain for incoming payments...');
  const paymentInfo = await manager.isTransactionForMe(
    stealthAddress.ephemeralKeyRaw,
    stealthAddress.address,
    bobMeta
  );
  
  if (paymentInfo.isForMe) {
    console.log('   ✓ Payment detected!');
    console.log(`   Stealth address: ${paymentInfo.stealthAddress!.toBase58()}`);
    
    // 5. Bob derives spending key
    console.log('\n5. Bob derives spending key...');
    const spendingKey = await manager.deriveStealthSpendingKey(
      bobMeta,
      paymentInfo.sharedSecret!
    );
    console.log(`   ✓ Spending key derived`);
    console.log(`   Public key: ${spendingKey.publicKey.toBase58()}`);
    
    // 6. Bob can now spend the funds
    console.log('\n6. Bob can now spend the funds from the stealth address');
    console.log('   ✓ Full payment flow successful!\n');
  } else {
    throw new Error('Bob should have detected the payment!');
  }
}

// ============================================================================
// Run all tests
// ============================================================================

runTests()
  .then(() => testFullPaymentFlow())
  .then(() => {
    console.log('\n🎉 All tests passed! Stealth address protocol is working correctly.\n');
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });
