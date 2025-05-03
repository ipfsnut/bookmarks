import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  useCardCatalog, 
  useNSIToken,
  formatBigInt,
  cachedContractCall,
  clearContractCallCache
} from '../utils/contracts';
import TokenActions from '../components/TokenActions';
import UnbondingRequests from '../components/UnbondingRequests';

const formatBalanceDisplay = (value: string): string => {
  if (value === 'Loading...' || value === 'Connect wallet' || value === 'Initializing...') {
    return value;
  }
  
  try {
    // Parse the string to a number
    const num = parseFloat(value);
    
    // Check if it's a whole number
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    // Round to 2 decimal places
    return num.toFixed(2);
  } catch (error) {
    console.error('Error formatting balance display:', error);
    return value;
  }
};

const TokenManagementPage: React.FC = () => {
  const { address } = useAccount();
  const cardCatalog = useCardCatalog();
  const nsiToken = useNSIToken();
  
  // Balance states with empty initial values
  const [nsiBalance, setNsiBalance] = useState<string>('Loading...');
  const [wNsiBalance, setWNsiBalance] = useState<string>('Loading...');
  const [votingPower, setVotingPower] = useState<string>('Loading...');
  
  // Individual loading states for more granular UI feedback
  const [isNsiLoading, setIsNsiLoading] = useState<boolean>(true);
  const [isWNsiLoading, setIsWNsiLoading] = useState<boolean>(true);
  const [isVotingPowerLoading, setIsVotingPowerLoading] = useState<boolean>(true);
  
  // Overall loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Last successful fetch timestamp
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  // Force re-render key
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Use a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Use a ref to prevent multiple simultaneous data loads
  const isLoadingRef = useRef(false);
  
  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Load balances when dependencies change
  useEffect(() => {
    const loadBalances = async () => {
      // Skip if already loading or no wallet connected
      if (isLoadingRef.current) return;
      
      if (!address) {
        setNsiBalance('Connect wallet');
        setWNsiBalance('Connect wallet');
        setVotingPower('Connect wallet');
        setIsLoading(false);
        setIsNsiLoading(false);
        setIsWNsiLoading(false);
        setIsVotingPowerLoading(false);
        return;
      }
      
      if (!nsiToken || !cardCatalog) {
        setNsiBalance('Initializing...');
        setWNsiBalance('Initializing...');
        setVotingPower('Initializing...');
        return;
      }
      
      // Prevent multiple simultaneous loads
      isLoadingRef.current = true;
      
      // Set overall loading state but keep showing previous values
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Loading balances for address:', address);
        
        // Load NSI balance
        try {
          setIsNsiLoading(true);
          const nsiBalanceRaw = await cachedContractCall(nsiToken, 'balanceOf', [address], BigInt(0));
          console.log('NSI balance raw:', nsiBalanceRaw.toString());
          
          // Update state immediately
          setNsiBalance(formatBigInt(nsiBalanceRaw));
          setIsNsiLoading(false);
        } catch (err) {
          console.error('Error loading NSI balance:', err);
          setIsNsiLoading(false);
        }
        
        // Load wNSI balance
        try {
          setIsWNsiLoading(true);
          const wNsiBalanceRaw = await cachedContractCall(cardCatalog, 'balanceOf', [address], BigInt(0));
          console.log('wNSI balance raw:', wNsiBalanceRaw.toString());
          
          // Update state immediately
          setWNsiBalance(formatBigInt(wNsiBalanceRaw));
          setIsWNsiLoading(false);
        } catch (err) {
          console.error('Error loading wNSI balance:', err);
          setIsWNsiLoading(false);
        }
        
        // Load voting power
        try {
          setIsVotingPowerLoading(true);
          const votingPowerRaw = await cachedContractCall(cardCatalog, 'getAvailableVotingPower', [address], BigInt(0));
          console.log('Voting power raw:', votingPowerRaw.toString());
          
          // Update state immediately
          setVotingPower(formatBigInt(votingPowerRaw));
          setIsVotingPowerLoading(false);
        } catch (err) {
          console.error('Error loading voting power:', err);
          setIsVotingPowerLoading(false);
        }
        
        // Update last successful fetch timestamp
        setLastUpdated(Date.now());
        
        // Log formatted balances
        console.log('Formatted balances:', {
          nsi: formatBigInt(await cachedContractCall(nsiToken, 'balanceOf', [address], BigInt(0))),
          wNsi: formatBigInt(await cachedContractCall(cardCatalog, 'balanceOf', [address], BigInt(0))),
          votingPower: formatBigInt(await cachedContractCall(cardCatalog, 'getAvailableVotingPower', [address], BigInt(0)))
        });
        
        // Force a re-render
        setRefreshKey(prev => prev + 1);
      } catch (err) {
        console.error('Error loading balances:', err);
        setError('Failed to load some balances. Please try again.');
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    };
    
    loadBalances();
    
    // Set up a refresh interval (every 5 minutes instead of 2 minutes)
    const intervalId = setInterval(loadBalances, 300000); // 5 minutes
    
    // Clean up function
    return () => {
      clearInterval(intervalId);
    };
  }, [address, cardCatalog, nsiToken]);
  
  // Function to selectively clear cache and refresh balances
  const refreshBalances = () => {
    // Clear only relevant cache entries instead of all cache
    clearContractCallCache('balanceOf');
    clearContractCallCache('getAvailableVotingPower');
    
    // Reset loading states
    setIsNsiLoading(true);
    setIsWNsiLoading(true);
    setIsVotingPowerLoading(true);
    setIsLoading(true);
    
    // Force a new load by setting isLoadingRef to false
    isLoadingRef.current = false;
  };
  
  // Format the last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Never updated';
    
    const now = Date.now();
    const diff = now - lastUpdated;
    
    if (diff < 60000) {
      return 'Updated just now';
    } else if (diff < 3600000) {
      return `Updated ${Math.floor(diff / 60000)} minute(s) ago`;
    } else {
      return `Updated ${Math.floor(diff / 3600000)} hour(s) ago`;
    }
  };
  
  return (
    <div key={refreshKey} style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Token Management</h1>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <button 
          onClick={refreshBalances}
          disabled={isLoading}
          style={{ 
            padding: '8px 16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          {isLoading ? 'Loading...' : 'Refresh Balances'}
        </button>
        
        <span style={{ 
          fontSize: '14px', 
          color: '#6c757d',
          fontStyle: 'italic'
        }}>
          {getLastUpdatedText()}
        </span>
      </div>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{error}</span>
          <button 
            onClick={refreshBalances}
            style={{
              padding: '4px 8px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Try Again
          </button>
        </div>
      )}
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0', 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          {isNsiLoading && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #3498db',
              animation: 'spin 1s linear infinite'
            }}></div>
          )}
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>NSI Balance</h3>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            wordBreak: 'break-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isNsiLoading && nsiBalance === 'Loading...' ? 'Loading...' : formatBalanceDisplay(nsiBalance)}
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0', 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          {isWNsiLoading && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #3498db',
              animation: 'spin 1s linear infinite'
            }}></div>
          )}
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>wNSI Balance</h3>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            wordBreak: 'break-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isWNsiLoading && wNsiBalance === 'Loading...' ? 'Loading...' : formatBalanceDisplay(wNsiBalance)}
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0', 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          {isVotingPowerLoading && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #3498db',
              animation: 'spin 1s linear infinite'
            }}></div>
          )}
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Voting Power</h3>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            wordBreak: 'break-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isVotingPowerLoading && votingPower === 'Loading...' ? 'Loading...' : formatBalanceDisplay(votingPower)}
          </div>
        </div>
      </div>
      
      {/* Add animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      {/* Use the existing TokenActions component */}
      {address && (
        <div style={{ marginBottom: '30px' }}>
          <TokenActions 
            address={address} 
            onSuccess={refreshBalances} 
          />
        </div>
      )}
      
      {/* Add the UnbondingRequests component */}
      {address && (
        <div style={{ marginBottom: '30px' }}>
          <UnbondingRequests onSuccess={refreshBalances} />
        </div>
      )}
      
      {/* Information about tokens */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        fontSize: '14px'
      }}>
        <h3 style={{ marginTop: 0 }}>About Tokens</h3>
        <p>
          <strong>NSI Tokens:</strong> The native token of the platform. These can be wrapped into wNSI tokens for voting.
        </p>
        <p>
          <strong>wNSI Tokens:</strong> Wrapped NSI tokens that provide voting power. These cannot be transferred directly 
          but can be unwrapped back to NSI tokens after a 7-day unbonding period.
        </p>
        <p>
          <strong>Voting Power:</strong> Your available voting power is determined by your wNSI balance minus any votes 
          you've already cast in the current voting cycle.
        </p>
        <p>
          <strong>Unbonding Period:</strong> When you request to unwrap wNSI tokens, they enter a 7-day unbonding period. 
          During this time, they cannot be used for voting. After the unbonding period ends, you need to complete the 
          unwrapping process to receive your NSI tokens.
        </p>
      </div>
    </div>
  );
};

export default TokenManagementPage;
