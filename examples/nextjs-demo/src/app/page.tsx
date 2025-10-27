"use client"

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import { GhostSolProvider, useGhostSol } from 'ghost-sol/react'
import dynamic from 'next/dynamic'

// Dynamically import WalletMultiButton to prevent hydration issues
const DynamicWalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => ({ default: mod.WalletMultiButton })),
  { ssr: false }
)

interface TransactionLog {
  id: string
  type: 'airdrop' | 'compress' | 'transfer' | 'decompress'
  amount: number
  signature: string
  timestamp: Date
  recipient?: string
}

function DashboardContent() {
  const { 
    address, 
    balance, 
    compress, 
    transfer, 
    decompress, 
    fundDevnet,
    loading, 
    error,
    refresh
  } = useGhostSol()
  
  const [transactionLog, setTransactionLog] = useState<TransactionLog[]>([])
  const [transferAmount, setTransferAmount] = useState('0.01')
  const [transferRecipient, setTransferRecipient] = useState('')
  const [compressAmount, setCompressAmount] = useState('0.01')
  const [decompressAmount, setDecompressAmount] = useState('0.01')
  const [isProcessing, setIsProcessing] = useState(false)

  const addToLog = (log: Omit<TransactionLog, 'id'>) => {
    setTransactionLog(prev => [{
      ...log,
      id: Date.now().toString()
    }, ...prev])
  }

  const handleAirdrop = async () => {
    if (!fundDevnet) return
    
    setIsProcessing(true)
    try {
      const signature = await fundDevnet(2) // 2 SOL
      addToLog({
        type: 'airdrop',
        amount: 2,
        signature,
        timestamp: new Date()
      })
      await refresh()
    } catch (error) {
      console.error('Airdrop failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompress = async () => {
    if (!compress) return
    
    setIsProcessing(true)
    try {
      const amount = parseFloat(compressAmount) * 1e9 // Convert to lamports
      const signature = await compress(amount)
      addToLog({
        type: 'compress',
        amount: parseFloat(compressAmount),
        signature,
        timestamp: new Date()
      })
      await refresh()
    } catch (error) {
      console.error('Compress failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTransfer = async () => {
    if (!transfer || !transferRecipient) return
    
    setIsProcessing(true)
    try {
      const amount = parseFloat(transferAmount) * 1e9 // Convert to lamports
      const signature = await transfer(transferRecipient, amount)
      addToLog({
        type: 'transfer',
        amount: parseFloat(transferAmount),
        signature,
        timestamp: new Date(),
        recipient: transferRecipient
      })
      await refresh()
    } catch (error) {
      console.error('Transfer failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecompress = async () => {
    if (!decompress) return
    
    setIsProcessing(true)
    try {
      const amount = parseFloat(decompressAmount) * 1e9 // Convert to lamports
      const signature = await decompress(amount)
      addToLog({
        type: 'decompress',
        amount: parseFloat(decompressAmount),
        signature,
        timestamp: new Date()
      })
      await refresh()
    } catch (error) {
      console.error('Decompress failed:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatBalance = (lamports: number | null) => {
    if (lamports === null) return '0.0000'
    return (lamports / 1e9).toFixed(4)
  }

  const getExplorerUrl = (signature: string) => {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Ghost Sol Demo</h1>
            <p className="text-gray-400">Private SOL swaps on Solana Devnet</p>
          </div>
          <DynamicWalletMultiButton />
        </div>

        {/* Network Warning */}
        <div className="bg-yellow-900 border border-yellow-600 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-200">
                Devnet Only
              </h3>
              <div className="mt-2 text-sm text-yellow-200">
                <p>This demo runs on Solana Devnet. All transactions are for testing purposes only.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Account Balance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Regular SOL</h3>
              <p className="text-2xl font-bold">{formatBalance(balance)} SOL</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Compressed SOL</h3>
              <p className="text-2xl font-bold">
                {loading ? 'Loading...' : `${formatBalance(0)} SOL`}
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Address: {address}</p>
            <p>Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Airdrop */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Step 1: Fund Account</h3>
            <p className="text-sm text-gray-400 mb-4">Request devnet SOL for testing</p>
            <button
              onClick={handleAirdrop}
              disabled={isProcessing || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Airdrop 2 SOL'}
            </button>
          </div>

          {/* Compress */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Step 2: Compress SOL</h3>
            <p className="text-sm text-gray-400 mb-4">Shield SOL into private account</p>
            <div className="space-y-3">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={compressAmount}
                onChange={(e) => setCompressAmount(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Amount (SOL)"
              />
              <button
                onClick={handleCompress}
                disabled={isProcessing || loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Compress'}
              </button>
            </div>
          </div>

          {/* Transfer */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Step 3: Private Transfer</h3>
            <p className="text-sm text-gray-400 mb-4">Send private SOL to another address</p>
            <div className="space-y-3">
              <input
                type="text"
                value={transferRecipient}
                onChange={(e) => setTransferRecipient(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Recipient address"
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Amount (SOL)"
              />
              <button
                onClick={handleTransfer}
                disabled={isProcessing || loading || !transferRecipient}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Transfer'}
              </button>
            </div>
          </div>

          {/* Decompress */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Step 4: Decompress SOL</h3>
            <p className="text-sm text-gray-400 mb-4">Unshield SOL back to regular account</p>
            <div className="space-y-3">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={decompressAmount}
                onChange={(e) => setDecompressAmount(e.target.value)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Amount (SOL)"
              />
              <button
                onClick={handleDecompress}
                disabled={isProcessing || loading}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Decompress'}
              </button>
            </div>
          </div>
        </div>

        {/* Transaction Log */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Transaction History</h2>
          {transactionLog.length === 0 ? (
            <p className="text-gray-400">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactionLog.map((tx) => (
                <div key={tx.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.type === 'airdrop' ? 'bg-blue-900 text-blue-200' :
                          tx.type === 'compress' ? 'bg-green-900 text-green-200' :
                          tx.type === 'transfer' ? 'bg-purple-900 text-purple-200' :
                          'bg-orange-900 text-orange-200'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                        <span className="text-sm font-medium">{tx.amount} SOL</span>
                      </div>
                      {tx.recipient && (
                        <p className="text-sm text-gray-400 mt-1">
                          To: {tx.recipient.slice(0, 8)}...{tx.recipient.slice(-8)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {tx.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={getExplorerUrl(tx.signature)}
            target="_blank"
            rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View on Explorer →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-8 bg-red-900 border border-red-600 rounded-lg p-4">
            <div className="flex">
              <div className="shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-200">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-200">
                  <p>{error}</p>
                  {error.includes('Method not found') && (
                    <div className="mt-2 text-xs text-red-300 bg-red-800 p-2 rounded">
                      <strong>Note:</strong> ZK Compression operations require a Light Protocol RPC endpoint. 
                      Standard Solana devnet RPC does not support these methods. This is expected behavior.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const wallet = useWallet()

  if (!wallet.connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Ghost Sol Demo</h1>
          <p className="text-gray-400 mb-8">Connect your wallet to start using private SOL swaps</p>
          <DynamicWalletMultiButton />
        </div>
      </div>
    )
  }

  return (
    <GhostSolProvider 
      wallet={{
        publicKey: wallet.publicKey!,
        signTransaction: wallet.signTransaction! as any,
        signAllTransactions: wallet.signAllTransactions! as any
      }} 
      cluster="devnet"
    >
      <DashboardContent />
    </GhostSolProvider>
  )
}