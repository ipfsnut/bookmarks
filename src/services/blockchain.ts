// This file now uses our unified contract service
import { useAccount } from 'wagmi';
import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { 
  contractService, 
  formatBigInt, 
  parseToBigInt 
} from './contract.service';

// Re-export the formatBigInt and parseToBigInt functions
export { formatBigInt, parseToBigInt };

// Helper function to validate Ethereum addresses (for backward compatibility)
export const isValidAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * Hook to get the user's staked balance with improved error handling
 * Now uses our unified contract service
 */
export const useStakedBalance = (address?: string) => {
  const { address: connectedAddress } = useAccount();
  const userAddress = address || connectedAddress;
  
  const fetchBalance = async () => {
    if (!userAddress) {
      console.log('No user address available');
      return '0';
    }
    
    try {
      console.log(`Fetching balance for ${userAddress} using hook...`);
      return await contractService.getStakedBalance(userAddress);
    } catch (error) {
      console.error('Error in useStakedBalance hook:', error);
      return '0';
    }
  };
  
  return { fetchBalance };
};

/**
 * Function to get user's staked balance (non-hook version) with retry logic
 * Now uses our unified contract service
 */
export const getUserStakedBalance = async (address: string): Promise<string> => {
  if (!address) {
    console.error('No address provided');
    return '0';
  }
  
  try {
    return await contractService.getStakedBalance(address);
  } catch (error) {
    console.error('Error getting staked balance:', error);
    return '0';
  }
};

/**
 * Function to get user's stakes for specific books with retry logic
 * Now uses our unified contract service
 */
export const getUserStakes = async (address: string): Promise<string[]> => {
  if (!address) {
    console.error('No address provided');
    return [];
  }
  
  try {
    return await contractService.getUserStakes(address);
  } catch (error) {
    console.error('Error getting user stakes:', error);
    return [];
  }
};

/**
 * Function to get user's voting power with retry logic
 * Now uses our unified contract service
 */
export const getVotingPower = async (address: string): Promise<string> => {
  if (!address) {
    console.error('No address provided');
    return '0';
  }
  
  try {
    return await contractService.getVotingPower(address);
  } catch (error) {
    console.error('Error getting voting power:', error);
    return '0';
  }
};

/**
 * Clear the balance cache for testing or when values are known to have changed
 * Now uses our unified contract service
 */
export const clearBalanceCache = (address?: string) => {
  if (address) {
    // Clear cache for specific address methods
    contractService.clearCache(`balanceOf_[\"${address}\"]`);
    console.log(`Cleared balance cache for ${address}`);
  } else {
    // Clear all balance-related cache
    contractService.clearCache('balanceOf');
    console.log('Cleared all balance cache entries');
  }
};

/**
 * Debug function to get cache statistics
 * Now uses our unified contract service
 */
export const getCacheStats = () => {
  return contractService.getCacheStats();
};
