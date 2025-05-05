// This file now re-exports functionality from our unified contract service
import { 
  contractService, 
  formatBigInt, 
  parseToBigInt, 
  useBalances,
  useContractService,
  contractEvents
} from '../services/contract.service';
import { CONTRACT_ADDRESSES } from '../config/constants';

// Import the ABIs
import CardCatalogABI from '../config/abis/CardCatalog.json';
import BookmarkNFTABI from '../config/abis/BookmarkNFT.json';
import BookmarkVotingABI from '../config/abis/BookmarkVoting.json';
import BookmarkLeaderboardABI from '../config/abis/BookmarkLeaderboard.json';
import BookmarkRewardsABI from '../config/abis/BookmarkRewards.json';
import BookmarkAuctionABI from '../config/abis/BookmarkAuction.json';

// Re-export the contract service functions for backward compatibility
export { 
  formatBigInt, 
  parseToBigInt, 
  contractEvents,
  contractService
};

// Helper function to clear contract call cache (for backward compatibility)
export function clearContractCallCache(methodPattern?: string): void {
  contractService.clearCache(methodPattern);
}

// Re-export the cached contract call function for backward compatibility
export async function cachedContractCall<T>(
  contract: any,
  method: string,
  args: any[] = [],
  fallbackValue?: T
): Promise<T> {
  return contractService.callContract(contract, method, args, fallbackValue);
}

// Re-export the safe contract call function for backward compatibility
export async function safeContractCall<T>(
  contract: any,
  method: string,
  args: any[] = [],
  fallbackValue: T
): Promise<T> {
  return contractService.callContract(contract, method, args, fallbackValue);
}

// Hook to use the NSI Token contract (ERC20)
export function useNSIToken() {
  return contractService.getContract(CONTRACT_ADDRESSES.NSI_TOKEN, [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function transfer(address to, uint amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ]);
}

// Hook to use the CardCatalog contract
export function useCardCatalog() {
  return contractService.getContract(CONTRACT_ADDRESSES.CARD_CATALOG, CardCatalogABI);
}

// Hook to use the BookmarkNFT contract
export function useBookmarkNFT() {
  return contractService.getContract(CONTRACT_ADDRESSES.BOOKMARK_NFT, BookmarkNFTABI);
}

// Hook to use the BookmarkVoting contract
export function useBookmarkVoting() {
  return contractService.getContract(CONTRACT_ADDRESSES.BOOKMARK_VOTING, BookmarkVotingABI);
}

// Hook to use the BookmarkLeaderboard contract
export function useBookmarkLeaderboard() {
  return contractService.getContract(CONTRACT_ADDRESSES.BOOKMARK_LEADERBOARD, BookmarkLeaderboardABI);
}

// Hook to use the BookmarkRewards contract
export function useBookmarkRewards() {
  return contractService.getContract(CONTRACT_ADDRESSES.BOOKMARK_REWARDS, BookmarkRewardsABI);
}

// Hook to use the BookmarkAuction contract
export function useBookmarkAuction() {
  return contractService.getContract(CONTRACT_ADDRESSES.BOOKMARK_AUCTION, BookmarkAuctionABI);
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

// Hook to safely get balances from CardCatalog with better error handling
export function useSafeCardCatalogBalances() {
  // Use our new useBalances hook
  const { nsiBalance, wNsiBalance, votingPower, isLoading, error, fetchBalances } = useBalances();
  
  return {
    wNsiBalance,
    votingPower,
    isLoading,
    error,
    fetchBalances
  };
}