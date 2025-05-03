import { ethers } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';
import { getPublicClient } from 'wagmi/actions';
import { config } from '../wagmi';
import { EventEmitter } from 'events';
import { CONTRACT_ADDRESSES } from '../config/constants';
import { useState, useEffect, useCallback } from 'react';


// Import the ABIs
import CardCatalogABI from '../config/abis/CardCatalog.json';
import BookmarkNFTABI from '../config/abis/BookmarkNFT.json';
import BookmarkVotingABI from '../config/abis/BookmarkVoting.json';
import BookmarkLeaderboardABI from '../config/abis/BookmarkLeaderboard.json';
import BookmarkRewardsABI from '../config/abis/BookmarkRewards.json';
import BookmarkAuctionABI from '../config/abis/BookmarkAuction.json';

// Create a single shared provider instance
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

// Cache for contract instances to avoid recreating them
const contractCache = new Map<string, ethers.Contract>();

// Cache for contract call results
const resultCache = new Map<string, {
  value: any;
  timestamp: number;
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_STALE_TTL = 60 * 60 * 1000; // 1 hour for stale cache

// Event emitter for contract events
export const contractEvents = new EventEmitter();

// Helper function to validate Ethereum addresses
const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Helper function to format BigInt values with proper decimals
 */
export const formatBigInt = (value: bigint | ethers.BigNumberish | null | undefined, decimals: number = 18): string => {
  try {
    // Check if value is null, undefined, or an empty object
    if (value === null || value === undefined || 
        (typeof value === 'object' && Object.keys(value as object).length === 0)) {
      return '0';
    }
    
    // Convert to string with proper decimal formatting
    const formatted = ethers.formatUnits(value, decimals);
    // Remove trailing zeros
    return formatted.replace(/\.0+$/, '');
  } catch (error) {
    console.error('Error formatting BigInt:', error);
    return '0';
  }
};

/**
 * Helper function to parse a string value to BigInt with proper decimal handling
 */
export const parseToBigInt = (value: string, decimals: number = 18): ethers.BigNumberish => {
  try {
    return ethers.parseUnits(value || '0', decimals);
  } catch (error) {
    console.error('Error parsing to BigInt:', error);
    return ethers.parseUnits('0', decimals);
  }
};

export class ContractService {
  /**
   * Get a cached contract instance or create a new one
   */
  getContract(address: string, abi: any[]): ethers.Contract {
    const cacheKey = `${address}`;
    
    if (contractCache.has(cacheKey)) {
      return contractCache.get(cacheKey)!;
    }
    
    const contract = new ethers.Contract(address, abi, provider);
    contractCache.set(cacheKey, contract);
    return contract;
  }

  /**
   * Call contract method with retry, caching, and error handling
   */
  async callContract<T>(
    contract: ethers.Contract | null,
    method: string,
    args: any[] = [],
    fallbackValue?: T
  ): Promise<T> {
    if (!contract) {
      console.warn(`Contract is null when calling ${method}`);
      return (fallbackValue !== undefined ? fallbackValue : null) as unknown as T;
    }
    
    const cacheKey = `${contract.target}_${method}_${JSON.stringify(args)}`;
    const cachedResult = resultCache.get(cacheKey);
    
    // Return cached result if it's still valid
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
      console.log(`Using cached result for ${method}`);
      return cachedResult.value;
    }
    
    // Add retry logic
    const MAX_RETRIES = 3;
    let retryCount = 0;
    let lastError: any = null;
    
    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`Calling contract method ${method} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        const result = await contract[method](...args);
        
        // Cache the result
        resultCache.set(cacheKey, {
          value: result,
          timestamp: Date.now()
        });
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Error calling ${method} (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
        retryCount++;
        
        if (retryCount < MAX_RETRIES) {
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          await this.delay(delay);
        }
      }
    }
    
    console.warn(`All ${MAX_RETRIES} attempts to call ${method} failed`);
    
    // If we have a cached result, return it even if it's expired but not too old
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_STALE_TTL)) {
      console.log(`Using stale cached result for ${method} as fallback`);
      return cachedResult.value;
    }
    
    // If fallback value is provided, return it
    if (fallbackValue !== undefined) {
      return fallbackValue as T;
    }
    
    // Re-throw the last error if no fallback is available
    throw lastError;
  }
  
  /**
   * Helper function for delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Clear cache for testing or when values are known to have changed
   */
  clearCache(method?: string): void {
    if (method) {
      // Clear specific method calls
      for (const key of resultCache.keys()) {
        if (key.includes(method)) {
          resultCache.delete(key);
        }
      }
      console.log(`Cleared cache for methods matching: ${method}`);
    } else {
      // Clear entire cache
      resultCache.clear();
      console.log('Cleared all contract call cache');
    }
  }
  
  /**
   * Setup event listeners for a contract
   */
  setupEventListeners(contract: ethers.Contract, events: string[]): void {
    if (!contract) return;
    
    events.forEach(eventName => {
      contract.on(eventName, (...args) => {
        console.log(`Event ${eventName} received:`, args);
        
        // Emit event for others to listen
        contractEvents.emit(`${contract.target}_${eventName}`, ...args);
        
        // Clear cache for relevant methods
        if (eventName === 'Transfer') {
          this.clearCache('balanceOf');
          this.clearCache('ownerOf');
        } else if (eventName === 'Wrapped' || eventName === 'Unwrapped') {
          this.clearCache('balanceOf');
          this.clearCache('getVotingPower');
          this.clearCache('getAvailableVotingPower');
        } else if (eventName === 'StakeUpdated') {
          this.clearCache('getUserStakes');
          this.clearCache('getVotingPower');
        }
      });
    });
  }

  /**
   * Get user's staked balance with retry logic
   */
  async getStakedBalance(address: string): Promise<string> {
    if (!isValidAddress(address)) {
      console.error('Invalid address format:', address);
      return '0';
    }

    try {
      const contract = this.getContract(CONTRACT_ADDRESSES.CARD_CATALOG, CardCatalogABI);
      const balance = await this.callContract<bigint>(
        contract,
        'balanceOf',
        [address],
        BigInt(0)
      );
      return formatBigInt(balance);
    } catch (error) {
      console.error('Error in getStakedBalance:', error);
      return '0';
    }
  }

  /**
   * Get user's voting power
   */
  async getVotingPower(address: string): Promise<string> {
    if (!isValidAddress(address)) {
      console.error('Invalid address format:', address);
      return '0';
    }

    try {
      const contract = this.getContract(CONTRACT_ADDRESSES.CARD_CATALOG, CardCatalogABI);
      const votingPower = await this.callContract<bigint>(
        contract,
        'getVotingPower',
        [address],
        BigInt(0)
      );
      return formatBigInt(votingPower);
    } catch (error) {
      console.error('Error in getVotingPower:', error);
      return '0';
    }
  }

  /**
   * Get user's available voting power
   */
  async getAvailableVotingPower(address: string): Promise<string> {
    if (!isValidAddress(address)) {
      console.error('Invalid address format:', address);
      return '0';
    }

    try {
      const contract = this.getContract(CONTRACT_ADDRESSES.CARD_CATALOG, CardCatalogABI);
      const votingPower = await this.callContract<bigint>(
        contract,
        'getAvailableVotingPower',
        [address],
        BigInt(0)
      );
      return formatBigInt(votingPower);
    } catch (error) {
      console.error('Error in getAvailableVotingPower:', error);
      return '0';
    }
  }

  /**
   * Get user's NSI token balance
   */
  async getNSIBalance(address: string): Promise<string> {
    if (!isValidAddress(address)) {
      console.error('Invalid address format:', address);
      return '0';
    }

    try {
      const contract = this.getContract(CONTRACT_ADDRESSES.NSI_TOKEN, [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
        "function symbol() view returns (string)"
      ]);
      const balance = await this.callContract<bigint>(
        contract,
        'balanceOf',
        [address],
        BigInt(0)
      );
      return formatBigInt(balance);
    } catch (error) {
      console.error('Error in getNSIBalance:', error);
      return '0';
    }
  }

  /**
   * Get user's stakes for specific books
   */
  async getUserStakes(address: string): Promise<string[]> {
    if (!isValidAddress(address)) {
      console.error('Invalid address format:', address);
      return [];
    }

    try {
      const contract = this.getContract(CONTRACT_ADDRESSES.CARD_CATALOG, CardCatalogABI);
      const stakes = await this.callContract<bigint[]>(
        contract,
        'getUserStakes',
        [address],
        []
      );
      return stakes.map(stake => formatBigInt(stake));
    } catch (error) {
      console.error('Error in getUserStakes:', error);
      return [];
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      contractCacheSize: contractCache.size,
      resultCacheSize: resultCache.size,
      resultCacheEntries: Array.from(resultCache.entries()).map(([key, data]) => ({
        key,
        age: Math.round((Date.now() - data.timestamp) / 1000) + ' seconds'
      }))
    };
  }
}

// Export a singleton instance
export const contractService = new ContractService();

/**
 * React hook for using the contract service in components
 */
export function useContractService() {
  const { address } = useAccount();
  
  return {
    contractService,
    address,
    formatBigInt,
    parseToBigInt
  };
}

/**
 * React hook for getting user balances
 */
export function useBalances(address?: string) {
  const { address: connectedAddress } = useAccount();
  const userAddress = address || connectedAddress;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    nsiBalance: '0',
    wNsiBalance: '0',
    votingPower: '0'
  });
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  const fetchBalances = useCallback(async () => {
    if (!userAddress) {
      setBalances({
        nsiBalance: 'Connect wallet',
        wNsiBalance: 'Connect wallet',
        votingPower: 'Connect wallet'
      });
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all balances in parallel
      const [nsiBalance, wNsiBalance, votingPower] = await Promise.all([
        contractService.getNSIBalance(userAddress),
        contractService.getStakedBalance(userAddress),
        contractService.getAvailableVotingPower(userAddress)
      ]);
      
      setBalances({ nsiBalance, wNsiBalance, votingPower });
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to load balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);
  
  // Fetch balances on mount and when address changes
  useEffect(() => {
    fetchBalances();
    
    // Set up event listeners for balance changes
    const handleBalanceChange = () => {
      fetchBalances();
    };
    
    contractEvents.on('balanceChange', handleBalanceChange);
    
    return () => {
      contractEvents.off('balanceChange', handleBalanceChange);
    };
  }, [fetchBalances]);
  
  return {
    ...balances,
    isLoading,
    error,
    fetchBalances,
    lastUpdated
  };
}