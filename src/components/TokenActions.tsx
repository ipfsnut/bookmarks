// src/components/TokenActions.tsx
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useCardCatalog, useNSIToken, formatBigInt, parseToBigInt } from '../utils/contracts';

interface TokenActionsProps {
  onSuccess: () => void;
}

const TokenActions: React.FC<TokenActionsProps> = ({ onSuccess }) => {
  const { address } = useAccount();
  const cardCatalog = useCardCatalog();
  const nsiToken = useNSIToken();
  
  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [unwrapAmount, setUnwrapAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleWrap = async () => {
    if (!address || !cardCatalog || !nsiToken || !wrapAmount) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // First, approve the CardCatalog contract to spend NSI tokens
      const amount = parseToBigInt(wrapAmount);
      
      // Note: This is where we would need to use the wallet's signer
      // For now, we'll just show a message
      alert(`To wrap tokens, you would need to:
1. Approve the CardCatalog contract to spend ${wrapAmount} NSI tokens
2. Call the wrap function with ${wrapAmount} tokens`);
      
      // After successful transaction
      setWrapAmount('');
      onSuccess();
    } catch (err) {
      console.error('Error wrapping tokens:', err);
      setError('Failed to wrap tokens. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUnwrap = async () => {
    if (!address || !cardCatalog || !unwrapAmount) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Request unwrap
      const amount = parseToBigInt(unwrapAmount);
      
      // Note: This is where we would need to use the wallet's signer
      alert(`To unwrap tokens, you would need to:
1. Call the requestUnwrap function with ${unwrapAmount} tokens
2. Wait for the 7-day unbonding period
3. Call completeUnwrap to receive your NSI tokens`);
      
      // After successful transaction
      setUnwrapAmount('');
      onSuccess();
    } catch (err) {
      console.error('Error requesting unwrap:', err);
      setError('Failed to request unwrap. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div>
      <h2>Token Actions</h2>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Wrap NSI Tokens</h3>
        <p>Convert your NSI tokens to wNSI for voting.</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input
            type="number"
            value={wrapAmount}
            onChange={(e) => setWrapAmount(e.target.value)}
            placeholder="Amount to wrap"
            disabled={isProcessing}
            style={{ flex: 1, padding: '8px' }}
          />
          
          <button
            onClick={handleWrap}
            disabled={isProcessing || !wrapAmount}
            style={{ padding: '8px 16px' }}
          >
            {isProcessing ? 'Processing...' : 'Wrap'}
          </button>
        </div>
      </div>
      
      <div>
        <h3>Unwrap wNSI Tokens</h3>
        <p>Start the 7-day unbonding process to convert wNSI back to NSI.</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <input
            type="number"
            value={unwrapAmount}
            onChange={(e) => setUnwrapAmount(e.target.value)}
            placeholder="Amount to unwrap"
            disabled={isProcessing}
            style={{ flex: 1, padding: '8px' }}
          />
          
          <button
            onClick={handleUnwrap}
            disabled={isProcessing || !unwrapAmount}
            style={{ padding: '8px 16px' }}
          >
            {isProcessing ? 'Processing...' : 'Request Unwrap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenActions;
