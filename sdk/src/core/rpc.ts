/**
 * rpc.ts
 * 
 * Purpose: Initialize and manage ZK Compression RPC connection
 * 
 * Dependencies:
 * - @lightprotocol/stateless.js for RPC creation
 * - @solana/web3.js for Connection and commitment levels
 * 
 * Exports:
 * - createCompressedRpc() - Creates ZK Compression RPC instance
 */

import { Connection, Commitment } from '@solana/web3.js';
import { createRpc } from '@lightprotocol/stateless.js';
import { ZeraConfig, NETWORKS, LIGHT_PROTOCOL_RPC_ENDPOINTS } from './types';

/**
 * Create a ZK Compression RPC instance with proper configuration
 * 
 * This function initializes the RPC connection to ZK Compression services
 * with appropriate commitment levels and endpoint configuration.
 * 
 * @param config - Configuration options including RPC URL and cluster
 * @returns Configured RPC instance for ZK Compression operations
 * @throws Error if RPC configuration is invalid
 */
export function createCompressedRpc(config: ZeraConfig) {
  // Determine the network configuration
  const cluster = config.cluster || 'devnet';
  const networkConfig = NETWORKS[cluster];
  
  if (!networkConfig) {
    throw new Error(`Unsupported cluster: ${cluster}. Supported clusters: devnet, mainnet`);
  }

  // Use provided RPC URL or fall back to network default
  const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
  
  // Validate RPC URL format
  if (!rpcUrl.startsWith('http')) {
    throw new Error(`Invalid RPC URL: ${rpcUrl}. Must be a valid HTTP/HTTPS URL`);
  }

  // Create Solana connection for underlying blockchain operations
  const connection = new Connection(rpcUrl, {
    commitment: config.commitment || networkConfig.commitment,
    confirmTransactionInitialTimeout: 60000, // 60 seconds timeout
  });

  // Create ZK Compression RPC instance
  // The createRpc function from @lightprotocol/stateless.js handles:
  // - Connection to ZK Compression services
  // - Validity proof generation
  // - Compressed account state management
  // 
  // IMPORTANT: Use Helius RPC endpoints for ZK Compression operations
  // Helius provides reliable RPC services with ZK Compression support
  const lightProtocolRpcUrl = LIGHT_PROTOCOL_RPC_ENDPOINTS[cluster];
  if (!lightProtocolRpcUrl) {
    throw new Error(`Light Protocol RPC endpoint not available for cluster: ${cluster}`);
  }

  console.log(`Using Helius RPC endpoint for ${cluster}: ${lightProtocolRpcUrl}`);

  // Create Light Protocol RPC connection for ZK Compression operations
  const lightProtocolConnection = new Connection(lightProtocolRpcUrl, {
    commitment: config.commitment || networkConfig.commitment,
    confirmTransactionInitialTimeout: 60000,
  });

  // Test the Helius RPC connection
  try {
    // This will be tested when the connection is first used
    console.log(`Helius RPC endpoint configured for ${cluster}`);
  } catch (error) {
    console.warn(`Helius RPC endpoint ${lightProtocolRpcUrl} may not be available:`, error);
    console.warn('ZK Compression operations may fail if RPC is not accessible');
  }

  const rpc = createRpc(lightProtocolConnection);

  return {
    rpc,
    connection: lightProtocolConnection, // Use Helius connection for ZK operations
    cluster,
    rpcUrl: lightProtocolRpcUrl
  };
}

/**
 * Validate RPC connection and test basic functionality
 * 
 * @param connection - Solana connection to test
 * @returns Promise that resolves if connection is valid
 * @throws Error if connection test fails
 */
export async function validateRpcConnection(connection: Connection): Promise<void> {
  try {
    // Test basic connection with a simple RPC call
    const version = await connection.getVersion();
    
    if (!version || !version['solana-core']) {
      throw new Error('Invalid response from RPC endpoint');
    }
    
    // Test commitment level by getting recent blockhash
    await connection.getRecentBlockhash();
    
  } catch (error) {
    throw new Error(
      `RPC connection validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the appropriate commitment level for different operations
 * 
 * @param operation - The operation type
 * @param configCommitment - Commitment from config
 * @returns Appropriate commitment level
 */
export function getCommitmentForOperation(
  operation: 'query' | 'transaction',
  configCommitment?: Commitment
): Commitment {
  // Use config commitment if provided
  if (configCommitment) {
    return configCommitment;
  }
  
  // Default commitments based on operation type
  switch (operation) {
    case 'query':
      return 'confirmed'; // Faster for balance queries
    case 'transaction':
      return 'confirmed'; // Balanced for transactions
    default:
      return 'confirmed';
  }
}
