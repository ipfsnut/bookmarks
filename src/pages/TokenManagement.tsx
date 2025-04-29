// src/pages/TokenManagement.tsx (updated)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { BigNumberish } from 'ethers';
import { 
  useCardCatalog, 
  useNSIToken, 
  formatBigInt, 
  cachedContractCall 
} from '../utils/contracts';

const TokenManagementPage: React.FC = () => {
  const { address } = useAccount();
  const cardCatalog = useCardCatalog();
  const nsiToken = useNSIToken();
  
  const [nsiBalance, setNsiBalance] = useState<string>('0');
  const [wNsiBalance, setWNsiBalance] = useState<string>('0');
  const [votingPower, setVotingPower] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Use a ref to prevent multiple simultaneous data loads
  const isLoadingRef = useRef(false);
  
  // Load balances only once on initial render and when dependencies change
  useEffect(() => {
    // Set isMounted to false when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    const loadBalances = async () => {
      // Prevent multiple simultaneous loads
      if (isLoadingRef.current) return;
      
      if (!address || !cardCatalog || !nsiToken) {
        if (isMounted.current) {
          setIsLoading(false);
        }
        return;
      }
      
      isLoadingRef.current = true;
      if (isMounted.current) {
        setIsLoading(true);
        setError(null);
      }
      
      try {
        console.log('Loading balances for address:', address);
        
        // Use cached contract calls to reduce RPC requests
        const nsiBalanceRaw = await cachedContractCall<BigNumberish>(nsiToken, 'balanceOf', [address]);
        const wNsiBalanceRaw = await cachedContractCall<BigNumberish>(cardCatalog, 'balanceOf', [address]);
        const votingPowerRaw = await cachedContractCall<BigNumberish>(cardCatalog, 'getAvailableVotingPower', [address]);
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setNsiBalance(formatBigInt(nsiBalanceRaw));
          setWNsiBalance(formatBigInt(wNsiBalanceRaw));
          setVotingPower(formatBigInt(votingPowerRaw));
        }
        
        console.log('Balances loaded successfully');
      } catch (err) {
        console.error('Error loading balances:', err);
        if (isMounted.current) {
          setError('Failed to load balances. Please try again.');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
        isLoadingRef.current = false;
      }
    };
    
    loadBalances();
    
    // Set up a refresh interval (every 30 seconds)
    const intervalId = setInterval(loadBalances, 30000);
    
    // Clean up the interval on unmount
    return () => clearInterval(intervalId);
  }, [address, cardCatalog, nsiToken]);
  
  // Function to manually refresh balances
  const refreshBalances = useCallback(() => {
    // This will trigger the useEffect to run again
    if (!isLoadingRef.current) {
      setIsLoading(true);
    }
  }, []);
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Token Management</h1>
      
      <button 
        onClick={refreshBalances}
        disabled={isLoading}
        style={{ 
          marginBottom: '20px',
          padding: '8px 16px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Loading...' : 'Refresh Balances'}
      </button>
      
      {isLoading ? (
        <p>Loading balances...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '20px', 
            marginBottom: '30px' 
          }}>
            <div style={{ 
              padding: '20px', 
              borderRadius: '8px', 
              backgroundColor: '#f0f0f0', 
              textAlign: 'center' 
            }}>
              <h3>NSI Balance</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{nsiBalance}</p>
            </div>
            
            <div style={{ 
              padding: '20px', 
              borderRadius: '8px', 
              backgroundColor: '#f0f0f0', 
              textAlign: 'center' 
            }}>
              <h3>wNSI Balance</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{wNsiBalance}</p>
            </div>
            
            <div style={{ 
              padding: '20px', 
              borderRadius: '8px', 
              backgroundColor: '#f0f0f0', 
              textAlign: 'center' 
            }}>
              <h3>Voting Power</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{votingPower}</p>
            </div>
          </div>
          
          {/* We'll add TokenActions component here later */}
          <div>
            <h2>Token Actions</h2>
            <p>Wrapping and unwrapping functionality will be implemented here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenManagementPage;
