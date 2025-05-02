import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  useCardCatalog, 
  useNSIToken
} from '../utils/contracts';
import TokenActions from '../components/TokenActions';
import UnbondingRequests from '../components/UnbondingRequests';

// Helper function to format token amounts nicely
const formatTokenAmount = (amount: string): string => {
  // Convert to a number first to handle scientific notation
  const num = parseFloat(amount);
  
  // If it's a whole number, don't show decimal places
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  // For numbers with decimals, limit to 4 decimal places
  // and remove trailing zeros
  return num.toFixed(4).replace(/\.?0+$/, '');
};

const TokenManagementPage: React.FC = () => {
  const { address } = useAccount();
  const cardCatalog = useCardCatalog();
  const nsiToken = useNSIToken();
  
  const [nsiBalance, setNsiBalance] = useState<string>('Loading...');
  const [wNsiBalance, setWNsiBalance] = useState<string>('Loading...');
  const [votingPower, setVotingPower] = useState<string>('Loading...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0); // Force re-render key
  
  // Load balances when dependencies change
  useEffect(() => {
    let isMounted = true;
    
    const loadBalances = async () => {
      if (!address) {
        if (isMounted) {
          setNsiBalance('Connect wallet');
          setWNsiBalance('Connect wallet');
          setVotingPower('Connect wallet');
          setIsLoading(false);
        }
        return;
      }
      
      if (!nsiToken || !cardCatalog) {
        if (isMounted) {
          setNsiBalance('Initializing...');
          setWNsiBalance('Initializing...');
          setVotingPower('Initializing...');
        }
        return;
      }
      
      try {
        console.log('Loading balances for address:', address);
        setIsLoading(true);
        
        // Fetch NSI balance
        let nsiBalanceValue = '0';
        try {
          const nsiBalanceRaw = await nsiToken.balanceOf(address);
          const nsiBalanceFormatted = ethers.formatUnits(nsiBalanceRaw, 18);
          nsiBalanceValue = formatTokenAmount(nsiBalanceFormatted);
          console.log('NSI balance raw:', nsiBalanceRaw.toString());
          console.log('NSI balance formatted:', nsiBalanceValue);
        } catch (err) {
          console.error('Error fetching NSI balance:', err);
        }
        
        // Fetch wNSI balance
        let wNsiBalanceValue = '0';
        try {
          const wNsiBalanceRaw = await cardCatalog.balanceOf(address);
          const wNsiBalanceFormatted = ethers.formatUnits(wNsiBalanceRaw, 18);
          wNsiBalanceValue = formatTokenAmount(wNsiBalanceFormatted);
          console.log('wNSI balance raw:', wNsiBalanceRaw.toString());
          console.log('wNSI balance formatted:', wNsiBalanceValue);
        } catch (err) {
          console.error('Error fetching wNSI balance:', err);
        }
        
        // Fetch voting power
        let votingPowerValue = '0';
        try {
          const votingPowerRaw = await cardCatalog.getAvailableVotingPower(address);
          const votingPowerFormatted = ethers.formatUnits(votingPowerRaw, 18);
          votingPowerValue = formatTokenAmount(votingPowerFormatted);
          console.log('Voting power raw:', votingPowerRaw.toString());
          console.log('Voting power formatted:', votingPowerValue);
        } catch (err) {
          console.error('Error fetching voting power:', err);
        }
        
        // Update state if component is still mounted
        if (isMounted) {
          // Update each state separately to ensure React detects the changes
          setNsiBalance(nsiBalanceValue);
          setWNsiBalance(wNsiBalanceValue);
          setVotingPower(votingPowerValue);
          setIsLoading(false);
          setError(null);
          
          // Force a re-render by updating the key
          setKey(prevKey => prevKey + 1);
          
          console.log('State updated with new balances');
        }
      } catch (err) {
        console.error('Error loading balances:', err);
        if (isMounted) {
          setError('Failed to load balances. Please try again.');
          setIsLoading(false);
        }
      }
    };
    
    loadBalances();
    
    // Set up a refresh interval (every 30 seconds)
    const intervalId = setInterval(loadBalances, 30000);
    
    // Clean up function
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [address, cardCatalog, nsiToken]);
  
  // Function to manually refresh balances
  const refreshBalances = () => {
    // Force a re-render by updating the key
    setKey(prevKey => prevKey + 1);
  };
  
  return (
    <div key={key} style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Token Management</h1>
      
      <button 
        onClick={refreshBalances}
        disabled={isLoading}
        style={{ 
          marginBottom: '20px',
          padding: '8px 16px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        {isLoading ? 'Loading...' : 'Refresh Balances'}
      </button>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}
      
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
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>NSI Balance</h3>
          <div id="nsi-balance" style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            wordBreak: 'break-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {nsiBalance}
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0', 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>wNSI Balance</h3>
          <div id="wnsi-balance" style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            wordBreak: 'break-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {wNsiBalance}
          </div>
        </div>
        
        <div style={{ 
          padding: '20px', 
          borderRadius: '8px', 
          backgroundColor: '#f0f0f0', 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Voting Power</h3>
          <div id="voting-power" style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            wordBreak: 'break-all',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {votingPower}
          </div>
        </div>
      </div>
      
      {/* Use the existing TokenActions component */}
      {address && (
        <div style={{ marginBottom: '30px' }}>
          <TokenActions 
            address={address} 
            onSuccess={refreshBalances} 
          />
        </div>
      )}
      
      {/* Add the new UnbondingRequests component */}
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
      
      {/* Debug info */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        fontSize: '14px'
      }}>
        <h3 style={{ marginTop: 0 }}>Debug Information</h3>
        <p><strong>Connected Address:</strong> {address || 'Not connected'}</p>
        <p><strong>NSI Token Contract:</strong> {nsiToken ? 'Available' : 'Not available'}</p>
        <p><strong>Card Catalog Contract:</strong> {cardCatalog ? 'Available' : 'Not available'}</p>
        <p><strong>NSI Balance (State):</strong> {nsiBalance}</p>
        <p><strong>wNSI Balance (State):</strong> {wNsiBalance}</p>
        <p><strong>Voting Power (State):</strong> {votingPower}</p>
        <p><strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
        <p><strong>Render Key:</strong> {key}</p>
      </div>
    </div>
  );
};

export default TokenManagementPage;
