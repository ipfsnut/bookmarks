import { ethers } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';
import { getPublicClient } from 'wagmi/actions';
import { config } from '../wagmi';

const balanceCache = new Map<string, { value: bigint, timestamp: number, formatted: string }>();
const CACHE_TTL = 60000; 
const CACHE_STALE_TTL = 3600000;

// Contract details - preserving the original contract address and ABI
const CONTRACT_ADDRESS = '0x6A9e955499c37f7e725060bfDB00257010E95b41';
const CONTRACT_ABI = [  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"beacon","type":"address"}],"name":"BeaconUpgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint8","name":"version","type":"uint8"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"previousAdminRole","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"newAdminRole","type":"bytes32"}],"name":"RoleAdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleGranted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"role","type":"bytes32"},{"indexed":true,"internalType":"address","name":"account","type":"address"},{"indexed":true,"internalType":"address","name":"sender","type":"address"}],"name":"RoleRevoked","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":true,"internalType":"uint256","name":"bookId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"StakeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"baseWeight","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"maxWeight","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"weightGrowthPeriod","type":"uint256"}],"name":"TimeWeightingUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Unwrapped","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Wrapped","type":"event"},{"inputs":[],"name":"ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"STAKING_MANAGER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"UPGRADER_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseWeight","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getUserStakes","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getVotingPower","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"nsiTokenAddress","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"maxWeight","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nsiToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"unwrap","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_baseWeight","type":"uint256"},{"internalType":"uint256","name":"_maxWeight","type":"uint256"},{"internalType":"uint256","name":"_weightGrowthPeriod","type":"uint256"}],"name":"updateTimeWeightingParams","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"bookId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"updateUserStake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"weightGrowthPeriod","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"wrap","outputs":[],"stateMutability":"nonpayable","type":"function"}
];

// Helper function to validate Ethereum addresses
const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Get contract instance with enhanced error handling
 */
export const getContract = (publicClient: any) => {
  // Create a contract instance using viem through the publicClient
  return {
    balanceOf: async (address: string) => {
      if (!isValidAddress(address)) {
        console.error('Invalid address format:', address);
        return BigInt(0);
      }

      try {
        // Check cache first
        const cacheKey = `balance:${address}`;
        const cachedData = balanceCache.get(cacheKey);
        const now = Date.now();
        
        // Use fresh cache if available
        if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
          console.log(`Using cached balance for ${address} (${formatBigInt(cachedData.value, 18)} tokens)`);
          return cachedData.value;
        }
        
        console.log(`Fetching balance for ${address} from blockchain...`);
        
        // Fetch from blockchain with timeout
        const data = await Promise.race([
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('RPC request timeout')), 10000)
          )
        ]);
        
        // Update cache
        balanceCache.set(cacheKey, { 
          value: data, 
          timestamp: now,
          formatted: formatBigInt(data, 18)
        });
        
        console.log(`Received balance for ${address}: ${formatBigInt(data, 18)} tokens`);
        return data;
      } catch (error) {
        console.error('Error reading balanceOf:', error);
        
        // If we have stale cached data, use it as fallback
        const cacheKey = `balance:${address}`;
        const cachedData = balanceCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_STALE_TTL)) {
          console.log(`Using stale cached balance for ${address} as fallback: ${cachedData.formatted} tokens`);
          return cachedData.value;
        }
        
        return BigInt(0);
      }
    },
    
    getUserStakes: async (address: string) => {
      if (!isValidAddress(address)) {
        console.error('Invalid address format:', address);
        return [];
      }

      try {
        console.log(`Fetching stakes for ${address}...`);
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getUserStakes',
          args: [address],
        });
        return data;
      } catch (error) {
        console.error('Error reading getUserStakes:', error);
        return [];
      }
    },
    
    getVotingPower: async (address: string) => {
      if (!isValidAddress(address)) {
        console.error('Invalid address format:', address);
        return BigInt(0);
      }

      try {
        console.log(`Fetching voting power for ${address}...`);
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'getVotingPower',
          args: [address],
        });
        return data;
      } catch (error) {
        console.error('Error reading getVotingPower:', error);
        return BigInt(0);
      }
    }
  };
};

/**
 * Hook to get the user's staked balance with improved error handling
 */
export const useStakedBalance = (address?: string) => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const userAddress = address || connectedAddress;
  
  const fetchBalance = async () => {
    if (!userAddress || !publicClient) {
      console.log('No user address or public client available');
      return '0';
    }
    
    try {
      console.log(`Fetching balance for ${userAddress} using hook...`);
      const contract = getContract(publicClient);
      const balance = await contract.balanceOf(userAddress);
      
      // Convert BigInt to string with proper decimal formatting
      return formatBigInt(balance, 18);
    } catch (error) {
      console.error('Error in useStakedBalance hook:', error);
      
      // Check if we have cached data to use as fallback
      const cacheKey = `balance:${userAddress}`;
      const cachedData = balanceCache.get(cacheKey);
      if (cachedData) {
        console.log(`Using cached balance as fallback: ${cachedData.formatted}`);
        return cachedData.formatted;
      }
      
      return '0';
    }
  };
  
  return { fetchBalance };
};

/**
 * Function to get user's staked balance (non-hook version) with retry logic
 */
export const getUserStakedBalance = async (
  address: string
): Promise<string> => {
  if (!isValidAddress(address)) {
    console.error('Invalid address format:', address);
    return '0';
  }

  // Implement retry logic
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError: any = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Use the wagmi config when calling getPublicClient
      const publicClient = getPublicClient(config);
      if (!publicClient) {
        throw new Error('Failed to get public client');
      }
      
      console.log(`Fetching balance for ${address}, attempt ${retryCount + 1}/${MAX_RETRIES}`);
      const contract = getContract(publicClient);
      const balance = await contract.balanceOf(address);
      return formatBigInt(balance, 18);
    } catch (error) {
      lastError = error;
      console.error(`Error fetching balance (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff: wait longer between each retry
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`All ${MAX_RETRIES} attempts failed:`, lastError);
  
  // Check if we have cached data to use as fallback
  const cacheKey = `balance:${address}`;
  const cachedData = balanceCache.get(cacheKey);
  if (cachedData) {
    console.log(`Using cached balance as fallback after all retries failed: ${cachedData.formatted}`);
    return cachedData.formatted;
  }
  
  return '0';
};

/**
 * Function to get user's stakes for specific books with retry logic
 */
export const getUserStakes = async (
  address: string
): Promise<string[]> => {
  if (!isValidAddress(address)) {
    console.error('Invalid address format:', address);
    return [];
  }

  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // Use the wagmi config when calling getPublicClient
      const publicClient = getPublicClient(config);
      const contract = getContract(publicClient);
      const stakes = await contract.getUserStakes(address);
      return stakes.map((stake: bigint) => formatBigInt(stake, 18));
    } catch (error) {
      console.error(`Error fetching user stakes (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`All ${MAX_RETRIES} attempts to fetch stakes failed`);
  return [];
};

/**
 * Function to get user's voting power with retry logic
 */
export const getVotingPower = async (
  address: string
): Promise<string> => {
  if (!isValidAddress(address)) {
    console.error('Invalid address format:', address);
    return '0';
  }

  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // Use the wagmi config when calling getPublicClient
      const publicClient = getPublicClient(config);
      const contract = getContract(publicClient);
      const votingPower = await contract.getVotingPower(address);
      return formatBigInt(votingPower, 18);
    } catch (error) {
      console.error(`Error fetching voting power (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`All ${MAX_RETRIES} attempts to fetch voting power failed`);
  return '0';
};

/**
 * Helper function to format BigInt values with proper decimals
 */
export const formatBigInt = (value: bigint, decimals: number): string => {
  if (value === BigInt(0)) return '0';
  
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  // Convert to string and pad with leading zeros if needed
  let fractionalStr = fractionalPart.toString();
  fractionalStr = fractionalStr.padStart(decimals, '0');
  
  // Remove trailing zeros
  fractionalStr = fractionalStr.replace(/0+$/, '');
  
  if (fractionalStr === '') {
    return integerPart.toString();
  }
  
  return `${integerPart}.${fractionalStr}`;
};

/**
 * Function to parse a string value to BigInt with proper decimal handling
 * Useful for converting user input to contract values
 */
export const parseToBigInt = (value: string, decimals: number): bigint => {
  try {
    // Handle empty or invalid input
    if (!value || isNaN(Number(value))) return BigInt(0);
    
    // Split the value into integer and fractional parts
    const parts = value.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';
    
    // Pad or truncate fractional part to match decimals
    if (fractionalPart.length > decimals) {
      fractionalPart = fractionalPart.substring(0, decimals);
    } else {
      fractionalPart = fractionalPart.padEnd(decimals, '0');
    }
    
    // Combine parts and convert to BigInt
    const combinedStr = integerPart + fractionalPart;
    return BigInt(combinedStr);
  } catch (error) {
    console.error('Error parsing to BigInt:', error);
    return BigInt(0);
  }
};

/**
 * Clear the balance cache for testing or when values are known to have changed
 */
export const clearBalanceCache = (address?: string) => {
  if (address) {
    // Clear cache for specific address
    const cacheKey = `balance:${address}`;
    balanceCache.delete(cacheKey);
    console.log(`Cleared balance cache for ${address}`);
  } else {
    // Clear entire cache
    balanceCache.clear();
    console.log('Cleared all balance cache entries');
  }
};

/**
 * Debug function to get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: balanceCache.size,
    entries: Array.from(balanceCache.entries()).map(([key, data]) => ({
      key,
      value: data.formatted,
      age: Math.round((Date.now() - data.timestamp) / 1000) + ' seconds'
    }))
  };
};
