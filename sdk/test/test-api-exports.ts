#!/usr/bin/env tsx

/**
 * Simple test to verify all stealth address APIs are exported
 */

import * as Zera from '../src/index';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('\n=== Verifying Stealth Address API Exports ===', 'cyan');

const requiredAPIs = [
  // Original APIs
  'generateStealthMetaAddress',
  'generateStealthAddress',
  'scanForPayments',
  'deriveStealthSpendingKey',
  // Newly added APIs
  'verifyStealthAddress',
  'fetchEphemeralKeysFromBlockchain',
  'scanBlockchainForPayments'
];

log('\nChecking main SDK exports:', 'cyan');
let allExported = true;

for (const api of requiredAPIs) {
  const isExported = typeof (Zera as any)[api] === 'function';
  const status = isExported ? '✅' : '❌';
  const color = isExported ? 'green' : 'red';
  log(`  ${status} ${api}`, color);
  
  if (!isExported) {
    allExported = false;
  }
}

log('\n=== Summary ===', 'cyan');
if (allExported) {
  log('✅ All stealth address APIs are properly exported!', 'green');
  log('\nNewly added APIs:', 'cyan');
  log('  • verifyStealthAddress() - Verify stealth address validity', 'green');
  log('  • fetchEphemeralKeysFromBlockchain() - Fetch ephemeral keys from blockchain', 'green');
  log('  • scanBlockchainForPayments() - Complete blockchain payment scanning', 'green');
  process.exit(0);
} else {
  log('❌ Some APIs are missing', 'red');
  process.exit(1);
}
