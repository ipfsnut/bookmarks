import React, { useState, useEffect } from 'react';
import { useCardCatalog, formatBigInt } from '../utils/contracts';
import { useAccount } from 'wagmi';

interface UnbondingRequest {
  amount: string;
  releaseTime: Date;
  index: number;
}

const UnbondingRequests: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { address } = useAccount();
  const cardCatalog = useCardCatalog();
  
  const [unbondingRequests, setUnbondingRequests] = useState<UnbondingRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetch unbonding requests
  useEffect(() => {
    if (!address || !cardCatalog) return;
    
    const fetchUnbondingRequests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get unbonding requests from the contract
        const requests = await cardCatalog.getUnbondingRequests(address);
        
        // Format the requests
        const formattedRequests = requests.map((request: any, index: number) => ({
          amount: formatBigInt(request.amount),
          releaseTime: new Date(Number(request.releaseTime) * 1000),
          index
        }));
        
        setUnbondingRequests(formattedRequests);
      } catch (err) {
        console.error('Error fetching unbonding requests:', err);
        setError('Failed to load unbonding requests');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUnbondingRequests();
    
    // Refresh every minute to update countdown timers
    const intervalId = setInterval(fetchUnbondingRequests, 60000);
    
    return () => clearInterval(intervalId);
  }, [address, cardCatalog]);
  
  // Complete unwrapping
  const handleCompleteUnwrap = async (index: number) => {
    if (!cardCatalog) return;
    
    try {
      setProcessingIndex(index);
      setSuccess(null);
      setError(null);
      
      // Call the completeUnwrap function
      const tx = await cardCatalog.completeUnwrap(index);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Remove the completed request from the list
      setUnbondingRequests(prev => prev.filter(req => req.index !== index));
      
      setSuccess('Successfully unwrapped tokens!');
      
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error completing unwrap:', err);
      setError('Failed to complete unwrapping');
    } finally {
      setProcessingIndex(null);
    }
  };
  
  // Cancel unbonding
  const handleCancelUnbonding = async (index: number) => {
    if (!cardCatalog) return;
    
    try {
      setProcessingIndex(index);
      setSuccess(null);
      setError(null);
      
      // Call the cancelUnbonding function
      const tx = await cardCatalog.cancelUnbonding(index);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Remove the cancelled request from the list
      setUnbondingRequests(prev => prev.filter(req => req.index !== index));
      
      setSuccess('Successfully cancelled unbonding request!');
      
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error cancelling unbonding:', err);
      setError('Failed to cancel unbonding request');
    } finally {
      setProcessingIndex(null);
    }
  };
  
  // Calculate time remaining until release
  const getTimeRemaining = (releaseTime: Date): string => {
    const now = new Date();
    const diffMs = releaseTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Ready to unwrap';
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffDays}d ${diffHours}h ${diffMinutes}m`;
  };
  
  if (isLoading) {
    return (
      <div style={{ 
        padding: '20px', 
        borderRadius: '8px', 
        backgroundColor: '#f0f0f0', 
        textAlign: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Unbonding Requests</h3>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: '3px solid rgba(0, 0, 0, 0.1)', 
            borderTop: '3px solid #3498db', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            marginRight: '10px'
          }} />
          <span>Loading unbonding requests...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        borderRadius: '8px', 
        backgroundColor: '#f0f0f0', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Unbonding Requests</h3>
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          {error}
        </div>
      </div>
    );
  }
  
  if (unbondingRequests.length === 0) {
    return (
      <div style={{ 
        padding: '20px', 
        borderRadius: '8px', 
        backgroundColor: '#f0f0f0', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Unbonding Requests</h3>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#e9ecef', 
          color: '#495057', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0 }}>You don't have any active unbonding requests.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ 
      padding: '20px', 
      borderRadius: '8px', 
      backgroundColor: '#f0f0f0', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Unbonding Requests</h3>
      
      {success && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          color: '#155724', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {success}
        </div>
      )}
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#e9ecef' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Amount</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Release Time</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Time Remaining</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {unbondingRequests.map((request) => {
              const timeRemaining = getTimeRemaining(request.releaseTime);
              const isReady = timeRemaining === 'Ready to unwrap';
              
              return (
                <tr key={request.index} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>{request.amount} wNSI</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ color: '#6c757d' }}>{request.releaseTime.toLocaleString()}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ color: isReady ? '#28a745' : '#6c757d', fontWeight: isReady ? 'bold' : 'normal' }}>
                      {timeRemaining}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {isReady ? (
                      <button
                        onClick={() => handleCompleteUnwrap(request.index)}
                        disabled={processingIndex === request.index}
                        style={{ 
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: processingIndex === request.index ? 'not-allowed' : 'pointer',
                          opacity: processingIndex === request.index ? 0.7 : 1
                        }}
                      >
                        {processingIndex === request.index ? 'Processing...' : 'Complete Unwrap'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelUnbonding(request.index)}
                        disabled={processingIndex === request.index}
                        style={{ 
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: processingIndex === request.index ? 'not-allowed' : 'pointer',
                          opacity: processingIndex === request.index ? 0.7 : 1
                        }}
                      >
                        {processingIndex === request.index ? 'Processing...' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        backgroundColor: '#cce5ff', 
        color: '#004085', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <p style={{ margin: 0 }}>
          <strong>Note:</strong> Tokens in the unbonding period cannot be used for voting. 
          After the 7-day unbonding period ends, you need to complete the unwrapping process 
          to receive your NSI tokens.
        </p>
      </div>
    </div>
  );
};

export default UnbondingRequests;