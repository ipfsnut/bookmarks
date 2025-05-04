import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { contractService } from '../services/contract.service';
import { CONTRACT_ADDRESSES } from '../config/constants';
import { useEffect } from 'react';

// Import the ABIs
import CardCatalogABI from '../config/abis/CardCatalog.json';
import BookmarkNFTABI from '../config/abis/BookmarkNFT.json';
import BookmarkVotingABI from '../config/abis/BookmarkVoting.json';
import BookmarkLeaderboardABI from '../config/abis/BookmarkLeaderboard.json';
import BookmarkRewardsABI from '../config/abis/BookmarkRewards.json';
import BookmarkAuctionABI from '../config/abis/BookmarkAuction.json';

// Create a shared event emitter
export const eventEmitter = new EventEmitter();

// Increase max listeners to avoid memory leak warnings
eventEmitter.setMaxListeners(50);

// Define event types for better type safety
export enum EventType {
  // CardCatalog events
  WRAPPED = 'Wrapped',
  UNWRAPPED = 'Unwrapped',
  STAKE_UPDATED = 'StakeUpdated',
  
  // BookmarkNFT events
  TRANSFER = 'Transfer',
  APPROVAL = 'Approval',
  APPROVAL_FOR_ALL = 'ApprovalForAll',
  
  // BookmarkVoting events
  VOTE_CAST = 'VoteCast',
  VOTE_DELEGATED = 'VoteDelegated',
  VOTE_UNDELEGATED = 'VoteUndelegated',
  
  // BookmarkLeaderboard events
  LEADERBOARD_UPDATED = 'LeaderboardUpdated',
  WEEKLY_WINNERS = 'WeeklyWinners',
  
  // BookmarkRewards events
  REWARDS_DISTRIBUTED = 'RewardsDistributed',
  REWARD_CLAIMED = 'RewardClaimed',
  
  // BookmarkAuction events
  AUCTION_CREATED = 'AuctionCreated',
  BID_PLACED = 'BidPlaced',
  AUCTION_ENDED = 'AuctionEnded',
  
  // Custom events
  BALANCE_UPDATED = 'BalanceUpdated',
  BOOKMARK_CREATED = 'BookmarkCreated',
  BOOKMARK_UPDATED = 'BookmarkUpdated',
  TRANSACTION_PENDING = 'TransactionPending',
  TRANSACTION_CONFIRMED = 'TransactionConfirmed',
  TRANSACTION_FAILED = 'TransactionFailed'
}

// Define the event data interface
export interface EventData {
  eventName: EventType;
  contractAddress?: string;
  blockNumber?: number;
  transactionHash?: string;
  args?: any[];
  timestamp: number;
}

// Map of contract addresses to their event configurations
const contractEventConfig = {
  [CONTRACT_ADDRESSES.CARD_CATALOG]: {
    abi: CardCatalogABI,
    events: [
      EventType.WRAPPED,
      EventType.UNWRAPPED,
      EventType.STAKE_UPDATED
    ]
  },
  [CONTRACT_ADDRESSES.BOOKMARK_NFT]: {
    abi: BookmarkNFTABI,
    events: [
      EventType.TRANSFER,
      EventType.APPROVAL,
      EventType.APPROVAL_FOR_ALL
    ]
  },
  [CONTRACT_ADDRESSES.BOOKMARK_VOTING]: {
    abi: BookmarkVotingABI,
    events: [
      EventType.VOTE_CAST,
      EventType.VOTE_DELEGATED,
      EventType.VOTE_UNDELEGATED
    ]
  },
  [CONTRACT_ADDRESSES.BOOKMARK_LEADERBOARD]: {
    abi: BookmarkLeaderboardABI,
    events: [
      EventType.LEADERBOARD_UPDATED,
      EventType.WEEKLY_WINNERS
    ]
  },
  [CONTRACT_ADDRESSES.BOOKMARK_REWARDS]: {
    abi: BookmarkRewardsABI,
    events: [
      EventType.REWARDS_DISTRIBUTED,
      EventType.REWARD_CLAIMED
    ]
  },
  [CONTRACT_ADDRESSES.BOOKMARK_AUCTION]: {
    abi: BookmarkAuctionABI,
    events: [
      EventType.AUCTION_CREATED,
      EventType.BID_PLACED,
      EventType.AUCTION_ENDED
    ]
  }
};

class EventListenerService {
  private listeners: Map<string, ethers.Contract> = new Map();
  public isInitialized: boolean = false;
  
  /**
   * Initialize event listeners for all contracts
   */
  public initialize(): void {
    if (this.isInitialized) {
      console.log('Event listeners already initialized');
      return;
    }
    
    console.log('Initializing event listeners for all contracts');
    
    // Set up listeners for each contract
    Object.entries(contractEventConfig).forEach(([address, config]) => {
      this.setupContractListeners(address, config.abi, config.events);
    });
    
    this.isInitialized = true;
    console.log('Event listeners initialized successfully');
  }
  
  /**
   * Set up event listeners for a specific contract
   */
  private setupContractListeners(
    address: string, 
    abi: any[], 
    events: EventType[]
  ): void {
    try {
      console.log(`Setting up listeners for contract at ${address}`);
      const contract = contractService.getContract(address, abi);
      
      // Set up listeners for each event
      events.forEach(eventName => {
        console.log(`Setting up listener for ${eventName} event`);
        
        contract.on(eventName, (...args) => {
          const event = args[args.length - 1];
          
          console.log(`Event ${eventName} received:`, {
            contractAddress: address,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            args: args.slice(0, -1) // Remove the event object from args
          });
          
          // Create event data object
          const eventData: EventData = {
            eventName: eventName as EventType,
            contractAddress: address,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            args: args.slice(0, -1),
            timestamp: Date.now()
          };
          
          // Emit the event
          this.emitEvent(eventData);
          
          // Clear relevant cache based on event type
          this.clearRelevantCache(eventName as EventType);
        });
      });
      
      // Store the contract instance
      this.listeners.set(address, contract);
      console.log(`Listeners set up successfully for contract at ${address}`);
    } catch (error) {
      console.error(`Error setting up listeners for contract at ${address}:`, error);
    }
  }
  
  /**
   * Emit an event through the event emitter
   */
  public emitEvent(eventData: EventData): void {
    // Emit the specific event
    eventEmitter.emit(eventData.eventName, eventData);
    
    // Also emit a generic 'event' for any listeners that want all events
    eventEmitter.emit('event', eventData);
    
    console.log(`Emitted ${eventData.eventName} event`);
  }
  
  /**
   * Clear relevant cache based on event type
   */
  private clearRelevantCache(eventType: EventType): void {
    switch (eventType) {
      case EventType.TRANSFER:
        contractService.clearCache('balanceOf');
        contractService.clearCache('ownerOf');
        break;
      case EventType.WRAPPED:
      case EventType.UNWRAPPED:
        contractService.clearCache('balanceOf');
        contractService.clearCache('getVotingPower');
        contractService.clearCache('getAvailableVotingPower');
        this.emitEvent({
          eventName: EventType.BALANCE_UPDATED,
          timestamp: Date.now()
        });
        break;
      case EventType.STAKE_UPDATED:
        contractService.clearCache('getUserStakes');
        contractService.clearCache('getVotingPower');
        break;
      case EventType.VOTE_CAST:
      case EventType.VOTE_DELEGATED:
      case EventType.VOTE_UNDELEGATED:
        contractService.clearCache('getBookmarkVotes');
        contractService.clearCache('getUserVotesForBookmark');
        contractService.clearCache('getRemainingVotingPower');
        break;
      default:
        // No specific cache to clear for other events
        break;
    }
  }
  
  /**
   * Manually emit a custom event
   */
  public emitCustomEvent(eventType: EventType, data: any = {}): void {
    const eventData: EventData = {
      eventName: eventType,
      ...data,
      timestamp: Date.now()
    };
    
    this.emitEvent(eventData);
  }
  
  /**
   * Remove all listeners
   */
  public removeAllListeners(): void {
    // Remove contract listeners
    this.listeners.forEach(contract => {
      contract.removeAllListeners();
    });
    
    // Clear the listeners map
    this.listeners.clear();
    
    // Reset initialization flag
    this.isInitialized = false;
    
    console.log('All event listeners removed');
  }
}

// Export a singleton instance
export const eventListenerService = new EventListenerService();

/**
 * Hook to use the event listener service in components
 */
export function useEventListener(
  eventType: EventType | EventType[],
  callback: (eventData: EventData) => void,
  deps: any[] = []
) {
  useEffect(() => {
    // Initialize the event listener service if not already initialized
    if (!eventListenerService.isInitialized) {
      eventListenerService.initialize();
    }
    
    // Handle multiple event types
    const eventTypes = Array.isArray(eventType) ? eventType : [eventType];
    
    // Add event listeners
    eventTypes.forEach(type => {
      eventEmitter.on(type, callback);
    });
    
    // Clean up event listeners on unmount
    return () => {
      eventTypes.forEach(type => {
        eventEmitter.off(type, callback);
      });
    };
  }, deps);
}

// Export everything
export default eventListenerService;