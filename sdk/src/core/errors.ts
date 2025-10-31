/**
 * errors.ts
 * 
 * Purpose: Extended error types for ZK Compression operations
 * 
 * This module provides specific error types for different failure modes
 * in ZK Compression operations, enabling better error handling and
 * user-friendly error messages. All errors extend from a base ZeraError
 * class that supports error codes and error chains.
 * 
 * Dependencies:
 * - None (pure TypeScript module)
 * 
 * Exports:
 * - ZeraError - Base error class for all Zera errors
 * - CompressionError - Compression-specific failures
 * - TransferError - Transfer-specific failures
 * - DecompressionError - Decompression-specific failures
 * - RpcError - RPC connection and communication failures
 * - ValidationError - Input validation failures
 */

/**
 * Base error class for all Zera errors
 * 
 * This class provides a foundation for all SDK errors, supporting:
 * - Error codes for programmatic error handling
 * - Error chains to preserve original error context
 * - User-friendly error messages
 * 
 * @example
 * throw new ZeraError('Operation failed', 'OPERATION_ERROR', originalError);
 */
export class ZeraError extends Error {
  /**
   * Create a new Zera error
   * 
   * @param message - User-friendly error message
   * @param code - Error code for programmatic handling
   * @param cause - Original error that caused this error (optional)
   */
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ZeraError';
    
    // Maintain proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ZeraError);
    }
  }
}

/**
 * Error for compression-specific failures
 * 
 * This error is thrown when compression operations fail, such as:
 * - Insufficient balance for compression
 * - Compression API errors
 * - State tree configuration issues
 * 
 * @example
 * throw new CompressionError('Failed to compress 1 SOL', originalError);
 */
export class CompressionError extends ZeraError {
  /**
   * Create a new compression error
   * 
   * @param message - Description of the compression failure
   * @param cause - Original error that caused the failure (optional)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'COMPRESSION_ERROR', cause);
    this.name = 'CompressionError';
  }
}

/**
 * Error for transfer-specific failures
 * 
 * This error is thrown when transfer operations fail, such as:
 * - Insufficient compressed balance
 * - Invalid recipient address
 * - Transfer API errors
 * - Network communication failures
 * 
 * @example
 * throw new TransferError('Recipient address is invalid', cause);
 */
export class TransferError extends ZeraError {
  /**
   * Create a new transfer error
   * 
   * @param message - Description of the transfer failure
   * @param cause - Original error that caused the failure (optional)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'TRANSFER_ERROR', cause);
    this.name = 'TransferError';
  }
}

/**
 * Error for decompression-specific failures
 * 
 * This error is thrown when decompression operations fail, such as:
 * - Insufficient compressed balance
 * - Decompression API errors
 * - Invalid destination address
 * - Network communication failures
 * 
 * @example
 * throw new DecompressionError('Failed to decompress 0.5 SOL', cause);
 */
export class DecompressionError extends ZeraError {
  /**
   * Create a new decompression error
   * 
   * @param message - Description of the decompression failure
   * @param cause - Original error that caused the failure (optional)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'DECOMPRESSION_ERROR', cause);
    this.name = 'DecompressionError';
  }
}

/**
 * Error for RPC connection and communication failures
 * 
 * This error is thrown when RPC operations fail, such as:
 * - Network connectivity issues
 * - RPC endpoint unavailability
 * - Invalid RPC responses
 * - Timeout errors
 * 
 * @example
 * throw new RpcError('Failed to connect to RPC endpoint', cause);
 */
export class RpcError extends ZeraError {
  /**
   * Create a new RPC error
   * 
   * @param message - Description of the RPC failure
   * @param cause - Original error that caused the failure (optional)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'RPC_ERROR', cause);
    this.name = 'RpcError';
  }
}

/**
 * Error for input validation failures
 * 
 * This error is thrown when input validation fails, such as:
 * - Invalid address formats
 * - Negative amounts
 * - Missing required parameters
 * - Invalid parameter types
 * 
 * @example
 * throw new ValidationError('Amount must be greater than 0');
 */
export class ValidationError extends ZeraError {
  /**
   * Create a new validation error
   * 
   * @param message - Description of the validation failure
   * @param cause - Original error that caused the failure (optional)
   */
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}
