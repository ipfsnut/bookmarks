import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useStakedBalance } from '../services/blockchain';

interface StakedBalanceProps {
  address?: string;
  refreshTrigger?: number;
}

export const StakedBalance: React.FC<StakedBalanceProps> = ({ 
  address,
  refreshTrigger = 0
}) => {
  const { address: connectedAddress } = useAccount();
  const userAddress = address || connectedAddress;
  const { fetchBalance } = useStakedBalance(userAddress);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const MAX_RETRIES = 3;
  
  // Add a ref to track if the component is mounted
  const isMounted = useRef(true);
  
  // Add a ref to prevent duplicate fetch calls
  const fetchInProgress = useRef(false);

  useEffect(() => {
    // Set isMounted to true when component mounts
    isMounted.current = true;
    
    // Set isMounted to false when component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const getBalance = async () => {
      // Skip if no address or fetch already in progress
      if (!userAddress || fetchInProgress.current) {
        setLoading(false);
        return;
      }

      // Set fetch in progress to prevent duplicate calls
      fetchInProgress.current = true;
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching balance for ${userAddress}, attempt ${retryCount + 1}/${MAX_RETRIES}`);
        const balanceValue = await fetchBalance();
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setBalance(balanceValue);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Failed to fetch balance:', err);
        
        // If we haven't exceeded max retries, try again
        if (retryCount < MAX_RETRIES - 1) {
          console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
          setRetryCount(prev => prev + 1);
          // Don't set loading to false, as we're going to retry
        } else {
          // Only update state if component is still mounted
          if (isMounted.current) {
            setError('Unable to load balance. Please try again later.');
            setLoading(false);
          }
        }
      } finally {
        // Reset fetch in progress flag
        fetchInProgress.current = false;
      }
    };

    getBalance();
  }, [userAddress, fetchBalance, refreshTrigger, retryCount]);

  const handleRetry = () => {
    setRetryCount(0); // Reset retry count to trigger a new fetch attempt
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Loading balance...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
        <p className="text-red-700 mb-2">{error}</p>
        <button 
          onClick={handleRetry}
          className="px-3 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!userAddress) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Connect wallet to view balance</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Your Staked Balance</h3>
      <div className="text-2xl font-bold text-blue-600">{balance} tokens</div>
    </div>
  );
};

export default StakedBalance;