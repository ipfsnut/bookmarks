import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { contractService } from '../services/contract.service';
import { eventEmitter, EventType } from '../services/event-listener.service';
import { CONTRACT_ADDRESSES } from '../config/constants';
import { formatBigInt } from '../utils/contracts';

// Define the balance context state interface
interface BalanceContextState {
  nsiBalance: string;
  wNsiBalance: string;
  votingPower: string;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  fetchBalances: () => Promise<void>;
  clearBalanceCache: () => void;
}

// Create the context with default values
const BalanceContext = createContext<BalanceContextState>({
  nsiBalance: '0',
  wNsiBalance: '0',
  votingPower: '0',
  isLoading: false,
  error: null,
  lastUpdated: 0,
  fetchBalances: async () => {},
  clearBalanceCache: () => {}
});

// Provider props interface
interface BalanceProviderProps {
  children: ReactNode;
}

// Provider component
export const BalanceProvider: React.FC<BalanceProviderProps> = ({ children }) => {
  const { address } = useAccount();
  const [nsiBalance, setNsiBalance] = useState<string>('0');
  const [wNsiBalance, setWNsiBalance] = useState<string>('0');
  const [votingPower, setVotingPower] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  // Fetch all balances
  const fetchBalances = useCallback(async () => {
    if (!address) {
      setNsiBalance('Connect wallet');
      setWNsiBalance('Connect wallet');
      setVotingPower('Connect wallet');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get the NSI token contract
      const nsiTokenContract = contractService.getContract(
        CONTRACT_ADDRESSES.NSI_TOKEN,
        [
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)",
          "function symbol() view returns (string)"
        ]
      );
      
      // Get the CardCatalog contract
      const cardCatalogContract = contractService.getContract(
        CONTRACT_ADDRESSES.CARD_CATALOG,
        []
      );
      
      // Fetch all balances in parallel
      const [nsiBalanceValue, wNsiBalanceValue, votingPowerValue] = await Promise.all([
        contractService.callContract(
          nsiTokenContract,
          'balanceOf',
          [address],
          BigInt(0)
        ),
        contractService.callContract(
          cardCatalogContract,
          'balanceOf',
          [address],
          BigInt(0)
        ),
        contractService.callContract(
          cardCatalogContract,
          'getAvailableVotingPower',
          [address],
          BigInt(0)
        )
      ]);
      
      // Format the balances
      const formattedNsiBalance = formatBigInt(nsiBalanceValue);
      const formattedWNsiBalance = formatBigInt(wNsiBalanceValue);
      const formattedVotingPower = formatBigInt(votingPowerValue);
      
      // Update state
      setNsiBalance(formattedNsiBalance);
      setWNsiBalance(formattedWNsiBalance);
      setVotingPower(formattedVotingPower);
      setLastUpdated(Date.now());
      
      console.log('Balances updated:', {
        nsi: formattedNsiBalance,
        wNsi: formattedWNsiBalance,
        votingPower: formattedVotingPower
      });
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balances');
    } finally {
      setIsLoading(false);
    }
  }, [address]);
  
  // Clear balance cache
  const clearBalanceCache = useCallback(() => {
    contractService.clearCache('balanceOf');
    contractService.clearCache('getAvailableVotingPower');
    console.log('Balance cache cleared');
  }, []);
  
  // Listen for balance-related events
  useEffect(() => {
    const handleBalanceEvent = () => {
      console.log('Balance event detected, refreshing balances');
      fetchBalances();
    };
    
    // Listen for relevant events
    eventEmitter.on(EventType.WRAPPED, handleBalanceEvent);
    eventEmitter.on(EventType.UNWRAPPED, handleBalanceEvent);
    eventEmitter.on(EventType.TRANSFER, handleBalanceEvent);
    eventEmitter.on(EventType.BALANCE_UPDATED, handleBalanceEvent);
    
    return () => {
      // Clean up event listeners
      eventEmitter.off(EventType.WRAPPED, handleBalanceEvent);
      eventEmitter.off(EventType.UNWRAPPED, handleBalanceEvent);
      eventEmitter.off(EventType.TRANSFER, handleBalanceEvent);
      eventEmitter.off(EventType.BALANCE_UPDATED, handleBalanceEvent);
    };
  }, [fetchBalances]);
  
  // Fetch balances on mount and when address changes
  useEffect(() => {
    fetchBalances();
    
    // Set up a refresh interval (every 5 minutes)
    const intervalId = setInterval(fetchBalances, 5 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchBalances]);
  
  // Context value
  const value: BalanceContextState = {
    nsiBalance,
    wNsiBalance,
    votingPower,
    isLoading,
    error,
    lastUpdated,
    fetchBalances,
    clearBalanceCache
  };
  
  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
};

// Custom hook to use the balance context
export const useBalanceContext = () => useContext(BalanceContext);

export default BalanceContext;