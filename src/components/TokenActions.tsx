// src/components/TokenActions.tsx
import React, { useState } from 'react';
import { useWalletClient } from 'wagmi';
import { formatBigInt, parseToBigInt } from '../utils/contracts';
import { CONTRACT_ADDRESSES } from '../config/constants';
import CardCatalogABI from '../config/abis/CardCatalog.json';
import { getPublicClient } from 'wagmi/actions';
import { config } from '../wagmi';

interface TokenActionsProps {
  address: string;
  onSuccess: () => void;
}

const TokenActions: React.FC<TokenActionsProps> = ({ address, onSuccess }) => {
  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [unwrapAmount, setUnwrapAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  
  // Get wallet client for transactions
  const { data: walletClient } = useWalletClient();
  const publicClient = getPublicClient(config);
  
  // Define proper ABI objects for the contracts
  const nsiTokenAbi = [
    {
      name: "approve",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" }
      ],
      outputs: [{ type: "bool" }]
    }
  ];
  
  const handleWrap = async () => {
    if (!walletClient || !publicClient || !wrapAmount) {
      setError('Wallet not connected or invalid amount');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setTransactionStatus('Preparing transaction...');
    
    try {
      const amount = parseToBigInt(wrapAmount);
      
      // First approve the CardCatalog to spend NSI tokens
      setTransactionStatus('Requesting approval for NSI tokens...');
      console.log(`Approving ${wrapAmount} NSI tokens...`);
      
      // Approve the CardCatalog to spend tokens
      const approveTxHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.NSI_TOKEN as `0x${string}`,
        abi: nsiTokenAbi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.CARD_CATALOG, amount]
      });
      
      console.log('Approval transaction submitted:', approveTxHash);
      setTransactionStatus('Approval transaction submitted. Waiting for confirmation...');
      
      try {
        // Wait for the transaction to be mined with a timeout
        const approveReceipt = await Promise.race([
          publicClient.waitForTransactionReceipt({ hash: approveTxHash }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
          )
        ]);
        
        console.log('Approval confirmed:', approveReceipt);
        setTransactionStatus('Approval confirmed. Wrapping tokens...');
      } catch (confirmError) {
        console.warn('Error confirming approval, but continuing with wrap:', confirmError);
        setTransactionStatus('Approval may have succeeded. Attempting to wrap tokens...');
        // Wait a moment to allow the transaction to propagate
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Now wrap the tokens
      console.log(`Wrapping ${wrapAmount} NSI tokens...`);
      
      // Wrap the tokens
      const wrapTxHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.CARD_CATALOG as `0x${string}`,
        abi: CardCatalogABI,
        functionName: 'wrap',
        args: [amount]
      });
      
      console.log('Wrap transaction submitted:', wrapTxHash);
      setTransactionStatus('Wrap transaction submitted. Waiting for confirmation...');
      
      try {
        // Wait for the transaction to be mined with a timeout
        const wrapReceipt = await Promise.race([
          publicClient.waitForTransactionReceipt({ hash: wrapTxHash }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
          )
        ]);
        
        console.log('Wrap confirmed:', wrapReceipt);
        setTransactionStatus('Tokens wrapped successfully!');
      } catch (confirmError) {
        console.warn('Error confirming wrap, but transaction might have succeeded:', confirmError);
        setTransactionStatus('Wrap transaction submitted but confirmation timed out. Please check your balance.');
      }
      
      // Clear input and trigger refresh regardless of confirmation status
      setWrapAmount('');
      
      // Add a delay before refreshing to allow blockchain state to update
      setTimeout(() => {
        onSuccess();
        setTransactionStatus('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error wrapping tokens:', err);
      setError(err.message || 'Failed to wrap tokens. Please try again.');
      setTransactionStatus('');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUnwrap = async () => {
    if (!walletClient || !publicClient || !unwrapAmount) {
      setError('Wallet not connected or invalid amount');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setTransactionStatus('Preparing to request unwrap...');
    
    try {
      const amount = parseToBigInt(unwrapAmount);
      
      console.log(`Requesting unwrap for ${unwrapAmount} wNSI tokens...`);
      setTransactionStatus('Submitting unwrap request...');
      
      // Request unwrap
      const unwrapTxHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.CARD_CATALOG as `0x${string}`,
        abi: CardCatalogABI,
        functionName: 'requestUnwrap',
        args: [amount]
      });
      
      console.log('Unwrap request submitted:', unwrapTxHash);
      setTransactionStatus('Unwrap request submitted. Waiting for confirmation...');
      
      try {
        // Wait for the transaction to be mined with a timeout
        const unwrapReceipt = await Promise.race([
          publicClient.waitForTransactionReceipt({ hash: unwrapTxHash }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
          )
        ]);
        
        console.log('Unwrap request confirmed:', unwrapReceipt);
        setTransactionStatus('Unwrap request confirmed! Tokens will be available after the 7-day unbonding period.');
      } catch (confirmError) {
        console.warn('Error confirming unwrap, but transaction might have succeeded:', confirmError);
        setTransactionStatus('Unwrap request submitted but confirmation timed out. Please check your pending unwraps.');
      }
      
      // Clear input and trigger refresh regardless of confirmation status
      setUnwrapAmount('');
      
      // Add a delay before refreshing to allow blockchain state to update
      setTimeout(() => {
        onSuccess();
        setTransactionStatus('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error unwrapping tokens:', err);
      setError(err.message || 'Failed to request unwrap. Please try again.');
      setTransactionStatus('');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div>
      <h2>Token Actions</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}
      
      {transactionStatus && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#e8f5e9', 
          color: '#2e7d32', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {transactionStatus}
        </div>
      )}
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        marginTop: '20px' 
      }}>
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0' 
        }}>
          <h3>Wrap NSI Tokens</h3>
          <p>Convert NSI tokens to wNSI for voting power.</p>
          
          <div style={{ marginTop: '15px' }}>
            <input
              type="number"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              placeholder="Amount to wrap"
              style={{ 
                width: '100%', 
                padding: '8px', 
                marginBottom: '10px' 
              }}
              disabled={isProcessing}
            />
            
            <button
              onClick={handleWrap}
              disabled={isProcessing || !wrapAmount || !walletClient}
              style={{ 
                width: '100%', 
                padding: '10px', 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: (isProcessing || !wrapAmount || !walletClient) ? 'not-allowed' : 'pointer',
                opacity: (isProcessing || !wrapAmount || !walletClient) ? 0.7 : 1
              }}
            >
              {isProcessing ? 'Processing...' : 'Wrap Tokens'}
            </button>
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0' 
        }}>
          <h3>Unwrap wNSI Tokens</h3>
          <p>Start the 7-day unbonding process to convert wNSI back to NSI.</p>
          
          <div style={{ marginTop: '15px' }}>
            <input
              type="number"
              value={unwrapAmount}
              onChange={(e) => setUnwrapAmount(e.target.value)}
              placeholder="Amount to unwrap"
              style={{ 
                width: '100%', 
                padding: '8px', 
                marginBottom: '10px' 
              }}
              disabled={isProcessing}
            />
            
            <button
              onClick={handleUnwrap}
              disabled={isProcessing || !unwrapAmount || !walletClient}
              style={{ 
                width: '100%', 
                padding: '10px', 
                backgroundColor: '#2196F3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: (isProcessing || !unwrapAmount || !walletClient) ? 'not-allowed' : 'pointer',
                opacity: (isProcessing || !unwrapAmount || !walletClient) ? 0.7 : 1
              }}
            >
              {isProcessing ? 'Processing...' : 'Request Unwrap'}
            </button>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h4 style={{ marginTop: 0 }}>About Unwrapping</h4>
        <p style={{ fontSize: '14px', color: '#666' }}>
          When you request to unwrap tokens, they enter a 7-day unbonding period. During this time, 
          they cannot be used for voting. After the unbonding period ends, you'll need to complete 
          the unwrapping process to receive your NSI tokens.
        </p>
      </div>
    </div>
  );
};

export default TokenActions;
