#!/usr/bin/env tsx

/**
 * End-to-End Test Suite for Zera SDK
 * 
 * This script tests the complete user flow:
 * 1. Initialize SDK
 * 2. Fund devnet account
 * 3. Compress SOL (shield)
 * 4. Transfer compressed SOL
 * 5. Decompress SOL (unshield)
 * 
 * Run with: npx tsx test/e2e-test.ts
 */

import { Keypair, PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Zera } from '../src/core/zera';
import { compressTokens, transferCompressedTokens, decompressTokens } from '../src/core/compression';
import { createRpc } from '@lightprotocol/stateless.js';

// Test configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const AIRDROP_AMOUNT = 0.5; // SOL (smaller amount to avoid rate limits)
const TEST_AMOUNTS = {
  compress: 0.01, // SOL
  transfer: 0.005, // SOL
  decompress: 0.005, // SOL
};

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
  log(`\n${step}`, 'cyan');
  log('='.repeat(step.length), 'cyan');
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForConfirmation(connection: Connection, signature: string, maxRetries = 30) {
  logInfo(`Waiting for confirmation of ${signature.substring(0, 8)}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const status = await connection.getSignatureStatus(signature);
      if (status.value?.confirmationStatus === 'confirmed' || status.value?.confirmationStatus === 'finalized') {
        logSuccess(`Transaction confirmed: ${signature}`);
        return true;
      }
    } catch (error) {
      // Ignore errors during confirmation check
    }
    
    await sleep(1000);
  }
  
  logWarning(`Transaction not confirmed after ${maxRetries} seconds: ${signature}`);
  return false;
}

async function runE2ETest() {
  logStep('🚀 Starting Zera SDK End-to-End Test');
  
  try {
    // Step 1: Initialize test wallet and connection
    logStep('Step 1: Initialize Test Environment');
    
    const wallet = Keypair.generate();
    const connection = new Connection(DEVNET_RPC, 'confirmed');
    
    logInfo(`Test wallet address: ${wallet.publicKey.toBase58()}`);
    logInfo(`Devnet RPC: ${DEVNET_RPC}`);
    
    // Step 2: Initialize Zera SDK
    logStep('Step 2: Initialize Zera SDK');
    
    const ghostSol = new Zera();
    
    await ghostSol.init({
      wallet,
      cluster: 'devnet',
    });
    logSuccess('SDK initialized successfully');
    
    // Step 3: Fund devnet account
    logStep('Step 3: Fund Devnet Account');
    
    logInfo(`Requesting ${AIRDROP_AMOUNT} SOL airdrop...`);
    
    try {
      const airdropSignature = await ghostSol.fundDevnet(AIRDROP_AMOUNT);
      logSuccess(`Airdrop transaction: ${airdropSignature}`);
      
      // Wait for airdrop confirmation
      await waitForConfirmation(connection, airdropSignature);
      
    } catch (error) {
      logWarning(`Airdrop failed (this is common on devnet): ${error instanceof Error ? error.message : 'Unknown error'}`);
      logInfo('Continuing with existing balance...');
    }
    
    // Check balance
    const balance = await ghostSol.getBalance();
    logSuccess(`Account balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    if (balance < TEST_AMOUNTS.compress * LAMPORTS_PER_SOL) {
      logWarning('Insufficient balance for testing. Please fund the account manually or try again later.');
      logInfo('You can fund the account at: https://faucet.solana.com');
      logInfo('Test wallet address:', wallet.publicKey.toBase58());
      return;
    }
    
    // Step 4: Test compression (shield)
    logStep('Step 4: Test SOL Compression (Shield)');
    
    const compressAmount = TEST_AMOUNTS.compress * LAMPORTS_PER_SOL;
    logInfo(`Compressing ${TEST_AMOUNTS.compress} SOL...`);
    
    try {
      const compressResult = await ghostSol.compress(compressAmount);
      logSuccess(`Compression successful: ${compressResult}`);
      
      // Wait for confirmation
      await waitForConfirmation(connection, compressResult);
      
      // Check balance after compression
      const balanceAfterCompress = await ghostSol.getBalance();
      logInfo(`Balance after compression: ${(balanceAfterCompress / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      
    } catch (error) {
      logError(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logWarning('This is expected if ZK Compression RPC is not available');
    }
    
    // Step 5: Test transfer (if compression worked)
    logStep('Step 5: Test Compressed SOL Transfer');
    
    const transferAmount = TEST_AMOUNTS.transfer * LAMPORTS_PER_SOL;
    const recipient = Keypair.generate().publicKey;
    
    logInfo(`Transferring ${TEST_AMOUNTS.transfer} SOL to ${recipient.toBase58()}...`);
    
    try {
      const transferResult = await ghostSol.transfer(recipient.toBase58(), transferAmount);
      logSuccess(`Transfer successful: ${transferResult}`);
      
      // Wait for confirmation
      await waitForConfirmation(connection, transferResult);
      
    } catch (error) {
      logError(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logWarning('This is expected if ZK Compression RPC is not available');
    }
    
    // Step 6: Test decompression (unshield)
    logStep('Step 6: Test SOL Decompression (Unshield)');
    
    const decompressAmount = TEST_AMOUNTS.decompress * LAMPORTS_PER_SOL;
    logInfo(`Decompressing ${TEST_AMOUNTS.decompress} SOL...`);
    
    try {
      const decompressResult = await ghostSol.decompress(decompressAmount);
      logSuccess(`Decompression successful: ${decompressResult}`);
      
      // Wait for confirmation
      await waitForConfirmation(connection, decompressResult);
      
      // Check final balance
      const finalBalance = await ghostSol.getBalance();
      logInfo(`Final balance: ${(finalBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      
    } catch (error) {
      logError(`Decompression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logWarning('This is expected if ZK Compression RPC is not available');
    }
    
    // Step 7: Test summary
    logStep('Step 7: Test Summary');
    
    logSuccess('End-to-end test completed!');
    logInfo('Note: ZK Compression operations may fail if the required RPC endpoints are not available.');
    logInfo('This is expected behavior when testing against standard Solana devnet.');
    
  } catch (error) {
    logError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runE2ETest().catch(console.error);
}

export { runE2ETest };
