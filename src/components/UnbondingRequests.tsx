import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { getPublicClient } from 'wagmi/actions';
import { config } from '../wagmi';
import { formatBigInt } from '../utils/contracts';
import { CONTRACT_ADDRESSES } from '../config/constants';
import CardCatalogABI from '../config/abis/CardCatalog.json';
import { transactionService } from '../services/transaction.service';
import { eventEmitter, EventType, useEventListener } from '../services/event-listener.service';

interface UnbondingRequest {
  id: string;
  amount: string;
  requestTime: number;
  completionTime: number;
  isReady: boolean;
}

interface UnbondingRequestsProps {
  onSuccess?: () => void;
}

const UnbondingRequests: React.FC<UnbondingRequestsProps> = ({ onSuccess }) => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = getPublicClient(config);
  
  const [unbondingRequests, setUnbondingRequests] = useState<UnbondingRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  
  // Fetch unbonding requests
  const fetchUnbondingRequests = async () => {
    if (!address || !publicClient) {
      setUnbondingRequests([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the CardCatalog contract
      const cardCatalogContract = {
        address: CONTRACT_ADDRESSES.CARD_CATALOG as `0x${string}`,
        abi: CardCatalogABI
      };
      
      // Get the number of unbonding requests
      const unbondingRequestCount = await publicClient.readContract({
        ...cardCatalogContract,
        functionName: 'getUnbondingRequestCount',
        args: [address]
      });
      
      if (Number(unbondingRequestCount) === 0) {
        setUnbondingRequests([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch all unbonding requests
      const requests: UnbondingRequest[] = [];
      
      for (let i = 0; i < Number(unbondingRequestCount); i++) {
        const request = await publicClient.readContract({
          ...cardCatalogContract,
          functionName: 'getUnbondingRequestByIndex',
          args: [address, i]
        });
        
        // Format the request data
        const formattedRequest: UnbondingRequest = {
          id: i.toString(),
          amount: formatBigInt(request[0]),
          requestTime: Number(request[1]),
          completionTime: Number(request[2]),
          isReady: Number(request[2]) <= Math.floor(Date.now() / 1000)
        };
        
        requests.push(formattedRequest);
      }
      
      // Sort by completion time (earliest first)
      requests.sort((a, b) => a.completionTime - b.completionTime);
      
      setUnbondingRequests(requests);
    } catch (err: any) {
      console.error('Error fetching unbonding requests:', err);
      setError(err.message || 'Failed to fetch unbonding requests');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Complete an unbonding request
  const completeUnbonding = async (requestId: string) => {
    if (!walletClient || !publicClient || !address) {
      setError('Wallet not connected');
      return;
    }
    
    setIsProcessing(true);
    setProcessingId(requestId);
    setError(null);
    setTransactionStatus('Preparing to complete unbonding...');
    
    try {
      console.log(`Completing unbonding request ${requestId}...`);
      
      // Complete the unbonding request
      const txHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.CARD_CATALOG as `0x${string}`,
        abi: CardCatalogABI,
        functionName: 'completeUnwrap',
        args: [Number(requestId)]
      });
      
      // Add the transaction to our transaction service
      transactionService.addTransaction(
        txHash,
        'Completing unwrap of wNSI tokens',
        { requestId }
      );
      
      console.log('Unbonding completion transaction submitted:', txHash);
      setTransactionStatus('Transaction submitted. Waiting for confirmation...');
      
      try {
        // Wait for the transaction to be mined with a timeout
        const receipt = await Promise.race([
          publicClient.waitForTransactionReceipt({ hash: txHash }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
          )
        ]);
        
        // Update transaction status in our service
        transactionService.updateTransaction(
          txHash,
          'confirmed',
          null
        );
        
        console.log('Unbonding completion confirmed:', receipt);
        setTransactionStatus('Unbonding completed successfully! You have received your NSI tokens.');
        
        // Emit event for balance updates
        eventEmitter.emit(EventType.UNWRAPPED, {
          eventName: EventType.UNWRAPPED,
          args: [address],
          timestamp: Date.now()
        });
        
        // Refresh the unbonding requests
        fetchUnbondingRequests();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      } catch (confirmError) {
        console.warn('Error confirming transaction, but it might have succeeded:', confirmError);
        setTransactionStatus('Transaction submitted but confirmation timed out. Please check your balance.');
      }
    } catch (err: any) {
      console.error('Error completing unbonding:', err);
      setError(err.message || 'Failed to complete unbonding');
      setTransactionStatus('');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
      
      // Clear transaction status after a delay
      setTimeout(() => {
        setTransactionStatus('');
      }, 5000);
    }
  };
  
  // Listen for unwrap events
  useEventListener(
    [EventType.UNWRAP_REQUESTED, EventType.UNWRAPPED],
    () => {
      console.log('Unwrap event detected, refreshing unbonding requests');
      fetchUnbondingRequests();
    },
    [address]
  );
  
  // Fetch unbonding requests on mount and when address changes
  useEffect(() => {
    fetchUnbondingRequests();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(fetchUnbondingRequests, 5 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [address]);
  
  // Format time remaining
  const formatTimeRemaining = (completionTime: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = Math.max(0, completionTime - now);
    
    if (remainingSeconds === 0) {
      return 'Ready to complete';
    }
    
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };
  
  // Format date
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  if (isLoading) {
    return (
      <div>
        <h2>Pending Unwraps</h2>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading pending unwraps...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <h2>Pending Unwraps</h2>
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
          <button 
            onClick={fetchUnbondingRequests}
            style={{
              marginLeft: '10px',
              padding: '4px 8px',
              backgroundColor: '#c62828',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  if (unbondingRequests.length === 0) {
    return (
      <div>
        <h2>Pending Unwraps</h2>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>You don't have any pending unwrap requests.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h2>Pending Unwraps</h2>
      
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
      
      <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
        <p>
          After the 7-day unbonding period ends, you need to complete the unwrapping process 
          to receive your NSI tokens.
        </p>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gap: '15px'
      }}>
        {unbondingRequests.map(request => (
          <div 
            key={request.id}
            style={{ 
              padding: '15px', 
              backgroundColor: request.isReady ? '#e8f5e9' : '#f5f5f5', 
              borderRadius: '8px',
              border: request.isReady ? '1px solid #c8e6c9' : '1px solid #e0e0e0'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                  {request.amount} wNSI
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Requested: {formatDate(request.requestTime)}
                </div>
              </div>
              <div style={{ 
                padding: '5px 10px', 
                backgroundColor: request.isReady ? '#c8e6c9' : '#eeeeee',
                color: request.isReady ? '#2e7d32' : '#616161',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {formatTimeRemaining(request.completionTime)}
              </div>
            </div>
            
            {request.isReady && (
              <button
                onClick={() => completeUnbonding(request.id)}
                disabled={isProcessing}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  backgroundColor: '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px', 
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.7 : 1
                }}
              >
                {isProcessing && processingId === request.id ? 'Processing...' : 'Complete Unwrap'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnbondingRequests;