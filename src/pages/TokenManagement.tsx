import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useBalances } from '../services/contract.service';
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
  const { 
    nsiBalance, 
    wNsiBalance, 
    votingPower, 
    isLoading, 
    error, 
    fetchBalances,
    lastUpdated 
  } = useBalances(address);
  
  // Individual loading states for more granular UI feedback
  const [isNsiLoading, setIsNsiLoading] = useState<boolean>(isLoading);
  const [isWNsiLoading, setIsWNsiLoading] = useState<boolean>(isLoading);
  const [isVotingPowerLoading, setIsVotingPowerLoading] = useState<boolean>(isLoading);
  
  // Force re-render key
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Update individual loading states when main loading state changes
  useEffect(() => {
    setIsNsiLoading(isLoading);
    setIsWNsiLoading(isLoading);
    setIsVotingPowerLoading(isLoading);
  }, [isLoading]);
  
  // Function to refresh balances
  const refreshBalances = () => {
    // Reset loading states
    setIsNsiLoading(true);
    setIsWNsiLoading(true);
    setIsVotingPowerLoading(true);
    
    // Fetch balances
    fetchBalances();
    
    // Force a re-render
    setRefreshKey(prev => prev + 1);
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
            {isNsiLoading ? 'Loading...' : formatBalanceDisplay(nsiBalance)}
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
            {isWNsiLoading ? 'Loading...' : formatBalanceDisplay(wNsiBalance)}
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
            {isVotingPowerLoading ? 'Loading...' : formatBalanceDisplay(votingPower)}
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
