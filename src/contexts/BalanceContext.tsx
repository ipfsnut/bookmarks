import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { useCardCatalog, useNSIToken } from '../utils/contracts';
import { ethers } from 'ethers';

interface BalanceContextType {
  nsiBalance: string;
  wNsiBalance: string;
  votingPower: string;
  isLoading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
  lastUpdated: number;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

// Helper function to format token amounts nicely
const formatTokenAmount = (amount: string): string => {
  try {
    // Convert to a number first to handle scientific notation
    const num = parseFloat(amount);
    
    // If it's a whole number, don't show decimal places
    if (Number.isInteger(num)) {
      return num.toString();
    }
    
    // For numbers with decimals, limit to 4 decimal places
    // and remove trailing zeros
    return num.toFixed(4).replace(/\.?0+$/, '');
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
};

export const BalanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const cardCatalog = useCardCatalog();
  const nsiToken = useNSIToken();
  
  const [nsiBalance, setNsiBalance] = useState<string>('0');
  const [wNsiBalance, setWNsiBalance] = useState<string>('0');
  const [votingPower, setVotingPower] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  // Cache duration in milliseconds (15 minutes)
  const CACHE_DURATION = 15 * 60 * 1000;
  
  // Function to safely call contract methods with retries
  const safeContractCall = async <T,>(
    contractFn: () => Promise<T>,
    fallbackValue: T,
    errorMessage: string
  ): Promise<T> => {
    const MAX_RETRIES = 3;
    let retryCount = 0;
    
    while (retryCount < MAX_RETRIES) {
      try {
        return await contractFn();
      } catch (err) {
        console.error(`${errorMessage} (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err);
        retryCount++;
        
        if (retryCount >= MAX_RETRIES) {
          console.warn(`All ${MAX_RETRIES} attempts failed, using fallback value`);
          return fallbackValue;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return fallbackValue;
  };
  
  const fetchBalances = useCallback(async (force: boolean = false) => {
    // Skip if not connected or contracts not loaded
    if (!isConnected || !address) {
      setNsiBalance('0');
      setWNsiBalance('0');
      setVotingPower('0');
      setIsLoading(false);
      return;
    }
    
    if (!cardCatalog || !nsiToken) {
      setIsLoading(true);
      return;
    }
    
    // Skip if we recently updated and not forcing refresh
    const now = Date.now();
    if (!force && now - lastUpdated < CACHE_DURATION) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('BalanceContext: Fetching balances for', address);
      
      // Fetch NSI balance with retry logic
      const nsiBalanceRaw = await safeContractCall(
        () => nsiToken.balanceOf(address),
        BigInt(0),
        'Error fetching NSI balance'
      );
      
      const nsiBalanceFormatted = ethers.formatUnits(nsiBalanceRaw, 18);
      const nsiBalanceValue = formatTokenAmount(nsiBalanceFormatted);
      console.log('BalanceContext: NSI balance:', nsiBalanceValue);
      
      // Fetch wNSI balance with retry logic
      const wNsiBalanceRaw = await safeContractCall(
        () => cardCatalog.balanceOf(address),
        BigInt(0),
        'Error fetching wNSI balance'
      );
      
      const wNsiBalanceFormatted = ethers.formatUnits(wNsiBalanceRaw, 18);
      const wNsiBalanceValue = formatTokenAmount(wNsiBalanceFormatted);
      console.log('BalanceContext: wNSI balance:', wNsiBalanceValue);
      
      // Fetch voting power with retry logic
      const votingPowerRaw = await safeContractCall(
        () => cardCatalog.getAvailableVotingPower(address),
        BigInt(0),
        'Error fetching voting power'
      );
      
      const votingPowerFormatted = ethers.formatUnits(votingPowerRaw, 18);
      const votingPowerValue = formatTokenAmount(votingPowerFormatted);
      console.log('BalanceContext: Voting power:', votingPowerValue);
      
      // Update state with whatever values we were able to fetch
      setNsiBalance(nsiBalanceValue);
      setWNsiBalance(wNsiBalanceValue);
      setVotingPower(votingPowerValue);
      setLastUpdated(now);
      
      console.log('BalanceContext: Balances updated successfully');
    } catch (err) {
      console.error('BalanceContext: Error fetching balances:', err);
      setError('Failed to load balances. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [address, cardCatalog, nsiToken, isConnected, lastUpdated]);
  
  // Initial load and refresh on dependencies change
  useEffect(() => {
    fetchBalances();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(() => fetchBalances(true), 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchBalances]);
  
  // Force refresh when address or contracts change
  useEffect(() => {
    if (address && cardCatalog && nsiToken) {
      fetchBalances(true);
    }
  }, [address, cardCatalog, nsiToken, fetchBalances]);
  
  const value = {
    nsiBalance,
    wNsiBalance,
    votingPower,
    isLoading,
    error,
    refreshBalances: () => fetchBalances(true),
    lastUpdated
  };
  
  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
};