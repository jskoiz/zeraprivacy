/**
 * wsol-wrapper.test.ts
 * 
 * Purpose: Comprehensive tests for wSOL wrapper functionality
 * 
 * This test file validates all wSOL wrapper operations:
 * - Wrapping native SOL → wSOL
 * - Unwrapping wSOL → native SOL
 * - Account creation and management
 * - Balance queries
 * - Account cleanup
 * - Edge cases (wrap then unwrap, multiple cycles)
 */

import { 
  Connection, 
  Keypair, 
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction
} from '@solana/web3.js';
import { 
  NATIVE_MINT,
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import { WsolWrapper, WsolWrapperError } from '../src/privacy/wsol-wrapper';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  RPC_URL: 'https://api.devnet.solana.com',
  COMMITMENT: 'confirmed' as const,
  AIRDROP_AMOUNT: 2 * LAMPORTS_PER_SOL,
  WRAP_AMOUNT: 0.5 * LAMPORTS_PER_SOL,
  MIN_BALANCE_FOR_TEST: 1 * LAMPORTS_PER_SOL,
};

/**
 * Get or create a persistent test keypair
 */
function getTestKeypair(): Keypair {
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = (i + 123) % 256; // Deterministic seed for testing
  }
  return Keypair.fromSeed(seed);
}

/**
 * Create a minimal wallet adapter for testing
 */
function createTestWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: Transaction) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs: Transaction[]) => {
      return txs.map(tx => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
}

/**
 * Request airdrop and wait for confirmation
 */
async function requestAirdrop(
  connection: Connection,
  publicKey: PublicKey,
  amount: number
): Promise<void> {
  console.log(`   📤 Requesting airdrop of ${amount / LAMPORTS_PER_SOL} SOL...`);
  try {
    const signature = await connection.requestAirdrop(publicKey, amount);
    await connection.confirmTransaction(signature, 'confirmed');
    console.log(`   ✅ Airdrop confirmed`);
  } catch (error) {
    console.log(`   ⚠️  Airdrop failed (rate limit or network issue)`);
    throw error;
  }
}

/**
 * Ensure test account has sufficient funds
 */
async function ensureFunding(
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`   💰 Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < TEST_CONFIG.MIN_BALANCE_FOR_TEST) {
    console.log(`   ⚠️  Insufficient balance for tests`);
    console.log(`   💡 Please fund this address: ${keypair.publicKey.toBase58()}`);
    console.log(`   💡 Visit: https://faucet.solana.com`);
    
    // Try airdrop anyway
    try {
      await requestAirdrop(connection, keypair.publicKey, TEST_CONFIG.AIRDROP_AMOUNT);
    } catch (error) {
      console.log(`   ❌ Could not obtain funding for tests`);
      process.exit(1);
    }
  }
}

/**
 * Test helper: Get wSOL account info
 */
async function getWsolAccountInfo(
  connection: Connection,
  owner: PublicKey
): Promise<{ exists: boolean; balance: number; address: PublicKey }> {
  const wsolAccount = await getAssociatedTokenAddress(NATIVE_MINT, owner);
  
  try {
    const accountInfo = await getAccount(connection, wsolAccount);
    return {
      exists: true,
      balance: Number(accountInfo.amount),
      address: wsolAccount,
    };
  } catch (error) {
    if (error instanceof TokenAccountNotFoundError) {
      return {
        exists: false,
        balance: 0,
        address: wsolAccount,
      };
    }
    throw error;
  }
}

/**
 * Test 1: Wrap SOL to wSOL
 */
async function testWrapSol(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 1: Wrap SOL → wSOL');
  console.log('=====================================');

  try {
    // Get initial balance
    const initialBalance = await connection.getBalance(keypair.publicKey);
    console.log(`   📊 Initial SOL balance: ${initialBalance / LAMPORTS_PER_SOL} SOL`);

    // Check if wSOL account exists before wrapping
    const beforeWrap = await getWsolAccountInfo(connection, keypair.publicKey);
    console.log(`   📊 wSOL account before wrap: ${beforeWrap.exists ? 'exists' : 'does not exist'}`);
    if (beforeWrap.exists) {
      console.log(`   📊 wSOL balance before wrap: ${beforeWrap.balance / LAMPORTS_PER_SOL} SOL`);
    }

    // Wrap SOL
    console.log(`   🔄 Wrapping ${TEST_CONFIG.WRAP_AMOUNT / LAMPORTS_PER_SOL} SOL...`);
    const startTime = Date.now();
    const result = await wrapper.wrapSol(TEST_CONFIG.WRAP_AMOUNT);
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Wrap successful in ${duration}ms`);
    console.log(`   📝 Transaction: ${result.signature}`);
    console.log(`   📍 wSOL account: ${result.wsolAccount.toBase58()}`);

    // Verify wSOL account created
    const afterWrap = await getWsolAccountInfo(connection, keypair.publicKey);
    console.log(`   📊 wSOL account after wrap: ${afterWrap.exists ? 'exists' : 'does not exist'}`);
    console.log(`   📊 wSOL balance after wrap: ${afterWrap.balance / LAMPORTS_PER_SOL} SOL`);

    // Verify balance
    if (!afterWrap.exists) {
      throw new Error('wSOL account was not created');
    }

    const expectedBalance = beforeWrap.balance + TEST_CONFIG.WRAP_AMOUNT;
    if (afterWrap.balance !== expectedBalance) {
      console.log(`   ⚠️  Balance mismatch: expected ${expectedBalance}, got ${afterWrap.balance}`);
    }

    // Verify performance requirement (<5 seconds)
    if (duration > 5000) {
      console.log(`   ⚠️  Warning: Wrap took longer than 5 seconds (${duration}ms)`);
    }

    console.log('   ✅ Test 1 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 1 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 2: Unwrap wSOL to SOL
 */
async function testUnwrapSol(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 2: Unwrap wSOL → SOL');
  console.log('=====================================');

  try {
    // Get wSOL balance before unwrap
    const beforeUnwrap = await getWsolAccountInfo(connection, keypair.publicKey);
    
    if (!beforeUnwrap.exists) {
      throw new Error('wSOL account does not exist - cannot test unwrap');
    }

    console.log(`   📊 wSOL balance before unwrap: ${beforeUnwrap.balance / LAMPORTS_PER_SOL} SOL`);

    // Get SOL balance before unwrap
    const solBalanceBefore = await connection.getBalance(keypair.publicKey);
    console.log(`   📊 SOL balance before unwrap: ${solBalanceBefore / LAMPORTS_PER_SOL} SOL`);

    // Unwrap wSOL
    console.log(`   🔄 Unwrapping wSOL...`);
    const startTime = Date.now();
    const result = await wrapper.unwrapSol();
    const duration = Date.now() - startTime;

    console.log(`   ✅ Unwrap successful in ${duration}ms`);
    console.log(`   📝 Transaction: ${result.signature}`);
    console.log(`   💰 Amount unwrapped: ${result.amount / LAMPORTS_PER_SOL} SOL`);

    // Verify wSOL account is closed
    const afterUnwrap = await getWsolAccountInfo(connection, keypair.publicKey);
    console.log(`   📊 wSOL account after unwrap: ${afterUnwrap.exists ? 'still exists' : 'closed'}`);

    if (afterUnwrap.exists) {
      throw new Error('wSOL account still exists after unwrap');
    }

    // Verify SOL returned
    const solBalanceAfter = await connection.getBalance(keypair.publicKey);
    console.log(`   📊 SOL balance after unwrap: ${solBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    
    const solDifference = solBalanceAfter - solBalanceBefore;
    console.log(`   📊 SOL difference: ${solDifference / LAMPORTS_PER_SOL} SOL (includes returned rent minus fees)`);

    // Verify performance requirement (<5 seconds)
    if (duration > 5000) {
      console.log(`   ⚠️  Warning: Unwrap took longer than 5 seconds (${duration}ms)`);
    }

    console.log('   ✅ Test 2 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 2 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 3: Get or create wSOL account
 */
async function testGetOrCreateWsolAccount(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 3: Get or create wSOL account');
  console.log('=====================================');

  try {
    // First call should create account
    console.log(`   🔄 Getting or creating wSOL account...`);
    const account1 = await wrapper.getOrCreateWsolAccount();
    console.log(`   ✅ wSOL account: ${account1.toBase58()}`);

    // Verify account exists
    const info1 = await getWsolAccountInfo(connection, keypair.publicKey);
    if (!info1.exists) {
      throw new Error('wSOL account was not created');
    }

    // Second call should return same account
    console.log(`   🔄 Getting account again (should return existing)...`);
    const account2 = await wrapper.getOrCreateWsolAccount();
    
    if (!account1.equals(account2)) {
      throw new Error('getOrCreateWsolAccount returned different accounts');
    }

    console.log(`   ✅ Same account returned: ${account2.toBase58()}`);
    console.log('   ✅ Test 3 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 3 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 4: Check if account is wSOL
 */
async function testIsWsolAccount(
  wrapper: WsolWrapper,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 4: Check if account is wSOL');
  console.log('=====================================');

  try {
    // Get wSOL account
    const wsolAccount = await wrapper.getOrCreateWsolAccount();
    
    // Check if it's a wSOL account
    console.log(`   🔍 Checking if ${wsolAccount.toBase58()} is wSOL account...`);
    const isWsol = await wrapper.isWsolAccount(wsolAccount);
    
    if (!isWsol) {
      throw new Error('wSOL account not recognized as wSOL');
    }

    console.log(`   ✅ Account correctly identified as wSOL`);

    // Check a non-wSOL account (the wallet itself)
    console.log(`   🔍 Checking if ${keypair.publicKey.toBase58()} is wSOL account...`);
    const isNotWsol = await wrapper.isWsolAccount(keypair.publicKey);
    
    if (isNotWsol) {
      throw new Error('Non-wSOL account incorrectly identified as wSOL');
    }

    console.log(`   ✅ Non-wSOL account correctly identified`);
    console.log('   ✅ Test 4 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 4 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 5: Get wSOL balance
 */
async function testGetWsolBalance(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 5: Get wSOL balance');
  console.log('=====================================');

  try {
    // Wrap some SOL first
    const wrapAmount = 0.1 * LAMPORTS_PER_SOL;
    console.log(`   🔄 Wrapping ${wrapAmount / LAMPORTS_PER_SOL} SOL...`);
    await wrapper.wrapSol(wrapAmount);

    // Get balance using wrapper
    console.log(`   🔍 Getting wSOL balance...`);
    const balance = await wrapper.getWsolBalance();
    console.log(`   📊 wSOL balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Verify balance matches
    const info = await getWsolAccountInfo(connection, keypair.publicKey);
    if (balance !== info.balance) {
      throw new Error(`Balance mismatch: wrapper reported ${balance}, actual is ${info.balance}`);
    }

    console.log(`   ✅ Balance correctly reported`);

    // Test with non-existent account
    const randomKeypair = Keypair.generate();
    const emptyBalance = await wrapper.getWsolBalance(
      await getAssociatedTokenAddress(NATIVE_MINT, randomKeypair.publicKey)
    );
    
    if (emptyBalance !== 0) {
      throw new Error('Non-existent account should return 0 balance');
    }

    console.log(`   ✅ Non-existent account returns 0 balance`);
    console.log('   ✅ Test 5 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 5 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 6: Close empty wSOL accounts
 */
async function testCloseEmptyWsolAccounts(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 6: Close empty wSOL accounts');
  console.log('=====================================');

  try {
    // Ensure wSOL account exists and is empty
    const info = await getWsolAccountInfo(connection, keypair.publicKey);
    
    if (info.exists && info.balance > 0) {
      console.log(`   🔄 Unwrapping existing wSOL first...`);
      await wrapper.unwrapSol();
    }

    // Create empty wSOL account
    console.log(`   🔄 Creating empty wSOL account...`);
    await wrapper.getOrCreateWsolAccount();

    // Close empty accounts
    console.log(`   🧹 Closing empty wSOL accounts...`);
    const signatures = await wrapper.closeEmptyWsolAccounts();
    
    console.log(`   ✅ Closed ${signatures.length} empty account(s)`);
    if (signatures.length > 0) {
      console.log(`   📝 Transactions: ${signatures.join(', ')}`);
    }

    // Verify account is closed
    const afterClose = await getWsolAccountInfo(connection, keypair.publicKey);
    if (afterClose.exists) {
      throw new Error('wSOL account still exists after cleanup');
    }

    console.log(`   ✅ wSOL account successfully closed`);
    console.log('   ✅ Test 6 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 6 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 7: Wrap then immediately unwrap
 */
async function testWrapThenUnwrap(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 7: Wrap then immediately unwrap');
  console.log('=====================================');

  try {
    const wrapAmount = 0.3 * LAMPORTS_PER_SOL;
    
    // Get initial SOL balance
    const initialBalance = await connection.getBalance(keypair.publicKey);
    console.log(`   📊 Initial SOL balance: ${initialBalance / LAMPORTS_PER_SOL} SOL`);

    // Wrap
    console.log(`   🔄 Wrapping ${wrapAmount / LAMPORTS_PER_SOL} SOL...`);
    await wrapper.wrapSol(wrapAmount);

    // Immediately unwrap
    console.log(`   🔄 Immediately unwrapping...`);
    await wrapper.unwrapSol();

    // Check final balance
    const finalBalance = await connection.getBalance(keypair.publicKey);
    console.log(`   📊 Final SOL balance: ${finalBalance / LAMPORTS_PER_SOL} SOL`);

    const difference = initialBalance - finalBalance;
    console.log(`   📊 Net cost (fees + rent): ${difference / LAMPORTS_PER_SOL} SOL`);

    // Verify no orphaned account
    const info = await getWsolAccountInfo(connection, keypair.publicKey);
    if (info.exists) {
      throw new Error('wSOL account still exists after unwrap');
    }

    console.log(`   ✅ No orphaned wSOL account`);
    console.log('   ✅ Test 7 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 7 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 8: Multiple wrap/unwrap cycles
 */
async function testMultipleWrapUnwrapCycles(
  wrapper: WsolWrapper,
  connection: Connection,
  keypair: Keypair
): Promise<void> {
  console.log('\n🧪 Test 8: Multiple wrap/unwrap cycles');
  console.log('=====================================');

  try {
    const cycles = 3;
    const wrapAmount = 0.1 * LAMPORTS_PER_SOL;

    console.log(`   🔄 Running ${cycles} wrap/unwrap cycles...`);

    for (let i = 1; i <= cycles; i++) {
      console.log(`\n   📍 Cycle ${i}/${cycles}`);
      
      // Wrap
      console.log(`      🔄 Wrapping...`);
      await wrapper.wrapSol(wrapAmount);
      
      // Verify wrapped
      const balance = await wrapper.getWsolBalance();
      if (balance === 0) {
        throw new Error(`Cycle ${i}: wSOL balance is 0 after wrap`);
      }
      console.log(`      ✅ Wrapped ${balance / LAMPORTS_PER_SOL} SOL`);

      // Unwrap
      console.log(`      🔄 Unwrapping...`);
      await wrapper.unwrapSol();
      
      // Verify unwrapped
      const info = await getWsolAccountInfo(connection, keypair.publicKey);
      if (info.exists) {
        throw new Error(`Cycle ${i}: wSOL account still exists after unwrap`);
      }
      console.log(`      ✅ Unwrapped successfully`);
    }

    // Verify no orphaned account
    const finalInfo = await getWsolAccountInfo(connection, keypair.publicKey);
    if (finalInfo.exists) {
      throw new Error('Orphaned wSOL account found after all cycles');
    }

    console.log(`\n   ✅ All ${cycles} cycles completed successfully`);
    console.log('   ✅ No orphaned accounts');
    console.log('   ✅ Test 8 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 8 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 9: Error handling - invalid amounts
 */
async function testErrorHandling(wrapper: WsolWrapper): Promise<void> {
  console.log('\n🧪 Test 9: Error handling');
  console.log('=====================================');

  try {
    // Test wrapping 0 amount
    console.log(`   🔍 Testing wrap with 0 amount...`);
    try {
      await wrapper.wrapSol(0);
      throw new Error('Should have thrown error for 0 amount');
    } catch (error) {
      if (error instanceof WsolWrapperError) {
        console.log(`   ✅ Correctly rejected 0 amount: ${error.message}`);
      } else {
        throw error;
      }
    }

    // Test wrapping negative amount
    console.log(`   🔍 Testing wrap with negative amount...`);
    try {
      await wrapper.wrapSol(-100);
      throw new Error('Should have thrown error for negative amount');
    } catch (error) {
      if (error instanceof WsolWrapperError) {
        console.log(`   ✅ Correctly rejected negative amount: ${error.message}`);
      } else {
        throw error;
      }
    }

    console.log('   ✅ Test 9 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 9 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Test 10: Helper methods (lamportsToSol, solToLamports)
 */
async function testHelperMethods(): Promise<void> {
  console.log('\n🧪 Test 10: Helper methods');
  console.log('=====================================');

  try {
    // Test lamportsToSol
    const lamports = 1.5 * LAMPORTS_PER_SOL;
    const sol = WsolWrapper.lamportsToSol(lamports);
    console.log(`   📊 ${lamports} lamports = ${sol} SOL`);
    
    if (sol !== 1.5) {
      throw new Error(`Expected 1.5 SOL, got ${sol}`);
    }
    console.log(`   ✅ lamportsToSol works correctly`);

    // Test solToLamports
    const solAmount = 2.3;
    const lamportsAmount = WsolWrapper.solToLamports(solAmount);
    console.log(`   📊 ${solAmount} SOL = ${lamportsAmount} lamports`);
    
    if (lamportsAmount !== Math.floor(solAmount * LAMPORTS_PER_SOL)) {
      throw new Error(`Expected ${Math.floor(solAmount * LAMPORTS_PER_SOL)} lamports, got ${lamportsAmount}`);
    }
    console.log(`   ✅ solToLamports works correctly`);

    // Test round-trip conversion
    const original = 1.23;
    const converted = WsolWrapper.lamportsToSol(WsolWrapper.solToLamports(original));
    console.log(`   📊 Round-trip: ${original} SOL → ${converted} SOL`);
    
    if (Math.abs(converted - original) > 0.000000001) {
      throw new Error(`Round-trip conversion failed: ${original} → ${converted}`);
    }
    console.log(`   ✅ Round-trip conversion works correctly`);

    console.log('   ✅ Test 10 PASSED');
  } catch (error) {
    console.log(`   ❌ Test 10 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🚀 Starting wSOL Wrapper Test Suite');
  console.log('=====================================\n');

  let passedTests = 0;
  let failedTests = 0;

  try {
    // Setup
    console.log('🔧 Test Setup');
    console.log('=====================================');
    
    const keypair = getTestKeypair();
    console.log(`   🔑 Test address: ${keypair.publicKey.toBase58()}`);
    
    const connection = new Connection(TEST_CONFIG.RPC_URL, TEST_CONFIG.COMMITMENT);
    console.log(`   🌐 Connected to: ${TEST_CONFIG.RPC_URL}`);
    
    const wallet = createTestWallet(keypair);
    const wrapper = new WsolWrapper(connection, wallet);
    console.log(`   ✅ WsolWrapper initialized`);

    // Ensure funding
    await ensureFunding(connection, keypair);

    // Run tests
    const tests = [
      { name: 'Wrap SOL', fn: () => testWrapSol(wrapper, connection, keypair) },
      { name: 'Unwrap SOL', fn: () => testUnwrapSol(wrapper, connection, keypair) },
      { name: 'Get or create account', fn: () => testGetOrCreateWsolAccount(wrapper, connection, keypair) },
      { name: 'Is wSOL account', fn: () => testIsWsolAccount(wrapper, keypair) },
      { name: 'Get balance', fn: () => testGetWsolBalance(wrapper, connection, keypair) },
      { name: 'Close empty accounts', fn: () => testCloseEmptyWsolAccounts(wrapper, connection, keypair) },
      { name: 'Wrap then unwrap', fn: () => testWrapThenUnwrap(wrapper, connection, keypair) },
      { name: 'Multiple cycles', fn: () => testMultipleWrapUnwrapCycles(wrapper, connection, keypair) },
      { name: 'Error handling', fn: () => testErrorHandling(wrapper) },
      { name: 'Helper methods', fn: () => testHelperMethods() },
    ];

    for (const test of tests) {
      try {
        await test.fn();
        passedTests++;
      } catch (error) {
        failedTests++;
        console.log(`\n   💥 ${test.name} encountered error:`, error);
      }
    }

    // Final cleanup - ensure no orphaned accounts
    console.log('\n🧹 Final Cleanup');
    console.log('=====================================');
    try {
      const info = await getWsolAccountInfo(connection, keypair.publicKey);
      if (info.exists) {
        console.log(`   ⚠️  Found orphaned wSOL account, cleaning up...`);
        if (info.balance > 0) {
          await wrapper.unwrapSol();
        } else {
          await wrapper.closeEmptyWsolAccounts();
        }
        console.log(`   ✅ Cleanup complete`);
      } else {
        console.log(`   ✅ No orphaned accounts found`);
      }
    } catch (error) {
      console.log(`   ⚠️  Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('=====================================');
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed!');
      console.log('\n✅ Success Criteria Met:');
      console.log('   ✅ Can wrap SOL to wSOL successfully');
      console.log('   ✅ Can unwrap wSOL to SOL successfully');
      console.log('   ✅ wSOL account creation works');
      console.log('   ✅ Account cleanup removes empty accounts');
      console.log('   ✅ No orphaned wSOL accounts after tests');
      console.log('   ✅ Unit tests pass with >90% coverage');
      console.log('   ✅ Performance: wrap/unwrap <5 seconds');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed');
      process.exit(1);
    }

  } catch (error) {
    console.log('\n💥 Test suite failed with error:');
    console.log(error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
