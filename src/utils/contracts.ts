import { 
  JsonRpcProvider, 
  Contract, 
  formatUnits, 
  parseUnits,
  BigNumberish,
  ethers
} from 'ethers';
import { useEffect, useState, useRef, useCallback } from 'react';
import { CONTRACT_ADDRESSES } from '../config/constants';

// Import the ABIs
import CardCatalogABI from '../config/abis/CardCatalog.json';
import BookmarkNFTABI from '../config/abis/BookmarkNFT.json';
import BookmarkVotingABI from '../config/abis/BookmarkVoting.json';
import BookmarkLeaderboardABI from '../config/abis/BookmarkLeaderboard.json';
import BookmarkRewardsABI from '../config/abis/BookmarkRewards.json';
import BookmarkAuctionABI from '../config/abis/BookmarkAuction.json';

// Create a single shared provider instance
const provider = new JsonRpcProvider('https://mainnet.base.org');

// Cache for contract instances to avoid recreating them
const contractCache = new Map<string, Contract>();

// Cache for contract call results
const resultCache = new Map<string, {
  value: any;
  timestamp: number;
}>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Get a cached contract instance or create a new one
function getContract(address: string, abi: any[]): Contract {
  const cacheKey = `${address}`;
  
  if (contractCache.has(cacheKey)) {
    return contractCache.get(cacheKey)!;
  }
  
  const contract = new Contract(address, abi, provider);
  contractCache.set(cacheKey, contract);
  return contract;
}

// Base hook for contract interactions with caching
function useContract(address: string, abi: any[]): Contract | null {
  const [contract, setContract] = useState<Contract | null>(null);
  
  useEffect(() => {
    if (!address || !abi) return;
    
    try {
      const contractInstance = getContract(address, abi);
      setContract(contractInstance);
    } catch (error) {
      console.error('Error setting up contract:', error);
      setContract(null);
    }
  }, [address, abi]);
  
  return contract;
}

// Helper function to cache contract call results
async function cachedContractCall<T>(
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
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.warn(`All ${MAX_RETRIES} attempts to call ${method} failed`);
  
  // If we have a cached result, return it even if it's expired
  if (cachedResult) {
    console.log(`Using expired cached result for ${method} as fallback`);
    return cachedResult.value;
  }
  
  // If fallback value is provided, return it
  if (fallbackValue !== undefined) {
    return fallbackValue as T;
  }
  
  // Re-throw the last error if no fallback is available
  throw lastError;
}

// Hook to use the NSI Token contract (ERC20)
export function useNSIToken(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.NSI_TOKEN, [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ]);
}

// Hook to use the CardCatalog contract
export function useCardCatalog(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.CARD_CATALOG, CardCatalogABI);
}

// Hook to use the BookmarkNFT contract
export function useBookmarkNFT(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.BOOKMARK_NFT, BookmarkNFTABI);
}

// Hook to use the BookmarkVoting contract
export function useBookmarkVoting(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.BOOKMARK_VOTING, BookmarkVotingABI);
}

// Hook to use the BookmarkLeaderboard contract
export function useBookmarkLeaderboard(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.BOOKMARK_LEADERBOARD, BookmarkLeaderboardABI);
}

// Hook to use the BookmarkRewards contract
export function useBookmarkRewards(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.BOOKMARK_REWARDS, BookmarkRewardsABI);
}

// Hook to use the BookmarkAuction contract
export function useBookmarkAuction(): Contract | null {
  return useContract(CONTRACT_ADDRESSES.BOOKMARK_AUCTION, BookmarkAuctionABI);
}

// Convenience hook to get all contracts
export function useAllContracts() {
  const nsiToken = useNSIToken();
  const cardCatalog = useCardCatalog();
  const bookmarkNFT = useBookmarkNFT();
  const bookmarkVoting = useBookmarkVoting();
  const bookmarkLeaderboard = useBookmarkLeaderboard();
  const bookmarkRewards = useBookmarkRewards();
  const bookmarkAuction = useBookmarkAuction();

  return {
    nsiToken,
    cardCatalog,
    bookmarkNFT,
    bookmarkVoting,
    bookmarkLeaderboard,
    bookmarkRewards,
    bookmarkAuction,
  };
}

// Helper function to format BigInt values with proper decimals
export const formatBigInt = (value: BigNumberish | null | undefined, decimals: number = 18): string => {
  try {
    // Check if value is null, undefined, or an empty object
    if (value === null || value === undefined || 
        (typeof value === 'object' && Object.keys(value as object).length === 0)) {
      return '0';
    }
    
    const formatted = formatUnits(value, decimals);
    // Remove trailing zeros
    return formatted.replace(/\.0+$/, '');
  } catch (error) {
    console.error('Error formatting BigInt:', error);
    return '0';
  }
};

// Helper function to parse a string value to BigInt with proper decimal handling
export const parseToBigInt = (value: string, decimals: number = 18): BigNumberish => {
  try {
    return parseUnits(value || '0', decimals);
  } catch (error) {
    console.error('Error parsing to BigInt:', error);
    return parseUnits('0', decimals);
  }
};

// Add the clearContractCallCache function
export function clearContractCallCache(methodPattern?: string): void {
  if (methodPattern) {
    // Clear specific method calls
    for (const key of resultCache.keys()) {
      if (key.includes(methodPattern)) {
        resultCache.delete(key);
      }
    }
    console.log(`Cleared cache for methods matching: ${methodPattern}`);
  } else {
    // Clear all cache
    resultCache.clear();
    console.log('Cleared all contract call cache');
  }
}

// Export the cachedContractCall function
export { cachedContractCall };

/**
 * Helper function to safely call a contract method with retry logic
 * @param contract The contract instance
 * @param method The method name to call
 * @param args Arguments to pass to the method
 * @param fallbackValue Value to return if all retries fail
 * @returns The result of the contract call or fallback value
 */
export async function safeContractCall<T>(
  contract: ethers.Contract | null,
  method: string,
  args: any[] = [],
  fallbackValue: T
): Promise<T> {
  if (!contract) {
    console.warn(`Contract is null when calling ${method}`);
    return fallbackValue;
  }

  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError: any = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Add a small random delay to prevent rate limiting
      if (retryCount > 0) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`Calling ${method} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      const result = await contract[method](...args);
      return result as T;
    } catch (err) {
      lastError = err;
      console.error(`Error calling ${method} (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err);
      retryCount++;
    }
  }

  console.warn(`All ${MAX_RETRIES} attempts to call ${method} failed, using fallback value`);
  return fallbackValue;
}

/**
 * Hook to safely get balances from CardCatalog with better error handling
 */
export function useSafeCardCatalogBalances() {
  const cardCatalog = useCardCatalog();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState({
    wNsiBalance: '0',
    votingPower: '0'
  });

  const fetchBalances = useCallback(async (address: string) => {
    if (!cardCatalog || !address) {
      return { wNsiBalance: '0', votingPower: '0' };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use the safe contract call for balanceOf
      const wNsiBalanceRaw = await safeContractCall(
        cardCatalog,
        'balanceOf',
        [address],
        BigInt(0)
      );

      // Use the safe contract call for getAvailableVotingPower
      const votingPowerRaw = await safeContractCall(
        cardCatalog,
        'getAvailableVotingPower',
        [address],
        BigInt(0)
      );

      const wNsiBalance = formatBigInt(wNsiBalanceRaw);
      const votingPower = formatBigInt(votingPowerRaw);

      setBalances({ wNsiBalance, votingPower });
      return { wNsiBalance, votingPower };
    } catch (err) {
      console.error('Error fetching balances:', err);
      setError('Failed to load balances. Please try again.');
      return { wNsiBalance: '0', votingPower: '0' };
    } finally {
      setIsLoading(false);
    }
  }, [cardCatalog]);

  return {
    ...balances,
    isLoading,
    error,
    fetchBalances
  };
}