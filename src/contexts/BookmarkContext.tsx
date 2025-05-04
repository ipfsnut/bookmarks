import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { contractService } from '../services/contract.service';
import { eventEmitter, EventType } from '../services/event-listener.service';
import { API_ENDPOINTS } from '../config/constants';

// Define the bookmark interface
export interface Bookmark {
  id: string;
  tokenId: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  metadataUri?: string;
  owner_address?: string;
  created_at?: string;
  updated_at?: string;
  bisac_codes?: string[];
  isbn?: string;
  publish_date?: string;
  publisher?: string;
  language?: string;
  edition?: string;
  page_count?: number;
  tags?: string[];
  external_url?: string;
  votes?: number;
  isNFT?: boolean;
}

// Context state interface
interface BookmarkContextState {
  bookmarks: Bookmark[];
  userBookmarks: Bookmark[];
  isLoading: boolean;
  error: string | null;
  fetchBookmarks: (options?: FetchOptions) => Promise<Bookmark[]>;
  fetchBookmarkById: (id: string) => Promise<Bookmark | null>;
  fetchBookmarkByTokenId: (tokenId: string) => Promise<Bookmark | null>;
  createBookmark: (bookmark: Partial<Bookmark>) => Promise<Bookmark>;
  updateBookmark: (id: string, bookmark: Partial<Bookmark>) => Promise<Bookmark>;
  deleteBookmark: (id: string) => Promise<boolean>;
  refreshBookmarks: () => void;
  clearBookmarks: () => void;
}

// Fetch options interface
interface FetchOptions {
  userOnly?: boolean;
  sortBy?: string;
  limit?: number;
  includeNFTData?: boolean;
  filter?: string;
}

// Create the context with default values
const BookmarkContext = createContext<BookmarkContextState>({
  bookmarks: [],
  userBookmarks: [],
  isLoading: false,
  error: null,
  fetchBookmarks: async () => [],
  fetchBookmarkById: async () => null,
  fetchBookmarkByTokenId: async () => null,
  createBookmark: async () => ({ id: '', tokenId: '', title: '', author: '' }),
  updateBookmark: async () => ({ id: '', tokenId: '', title: '', author: '' }),
  deleteBookmark: async () => false,
  refreshBookmarks: () => {},
  clearBookmarks: () => {}
});

// Provider props interface
interface BookmarkProviderProps {
  children: ReactNode;
}

// Provider component
export const BookmarkProvider: React.FC<BookmarkProviderProps> = ({ children }) => {
  const { address } = useAccount();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Get session token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    setSessionToken(token);
  }, []);

  // Fetch bookmarks from blockchain first, then fall back to database
  const fetchBookmarks = useCallback(async (options: FetchOptions = {}): Promise<Bookmark[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First try to fetch from blockchain
      const blockchainBookmarks = await fetchBookmarksFromBlockchain();
      
      // If we got bookmarks from the blockchain, use those
      if (blockchainBookmarks.length > 0) {
        console.log('Using blockchain bookmarks:', blockchainBookmarks.length);
        
        // Apply filtering
        let filteredBookmarks = blockchainBookmarks;
        
        if (options.userOnly && address) {
          filteredBookmarks = blockchainBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() === address.toLowerCase()
          );
        }
        
        if (options.filter === 'owned' && address) {
          filteredBookmarks = blockchainBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() === address.toLowerCase()
          );
        } else if (options.filter === 'not-owned' && address) {
          filteredBookmarks = blockchainBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() !== address.toLowerCase()
          );
        }
        
        // Apply sorting
        if (options.sortBy === 'token_id') {
          filteredBookmarks.sort((a, b) => 
            Number(b.tokenId || 0) - Number(a.tokenId || 0)
          );
        } else if (options.sortBy === 'votes') {
          filteredBookmarks.sort((a, b) => 
            Number(b.votes || 0) - Number(a.votes || 0)
          );
        }
        
        // Apply limit
        if (options.limit) {
          filteredBookmarks = filteredBookmarks.slice(0, options.limit);
        }
        
        // Update state
        setBookmarks(filteredBookmarks);
        
        // Update user bookmarks
        if (address) {
          const userBooks = filteredBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() === address.toLowerCase()
          );
          setUserBookmarks(userBooks);
        }
        
        setIsLoading(false);
        return filteredBookmarks;
      }
      
      // Fallback to database if blockchain fetch failed or returned no results
      console.log('Falling back to database bookmarks');
      
      // Original database fetch logic
      const queryParams = new URLSearchParams();
      if (options.userOnly) queryParams.append('userOnly', 'true');
      if (options.sortBy) queryParams.append('sortBy', options.sortBy);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.includeNFTData) queryParams.append('includeNFTData', 'true');
      
      const response = await fetch(`${API_ENDPOINTS.BOOKMARKS}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bookmark fetch error response:', errorText);
        throw new Error(`Failed to fetch bookmarks: ${response.status}`);
      }
      
      const data = await response.json();
      const fetchedBookmarks = data.bookmarks || [];
      
      // Update state
      setBookmarks(fetchedBookmarks);
      
      // Update user bookmarks
      if (address) {
        const userBooks = fetchedBookmarks.filter(
          bookmark => bookmark.owner_address?.toLowerCase() === address.toLowerCase()
        );
        setUserBookmarks(userBooks);
      }
      
      setIsLoading(false);
      return fetchedBookmarks;
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
      setIsLoading(false);
      return [];
    }
  }, [address, sessionToken]);

  // Fetch bookmarks from blockchain
  const fetchBookmarksFromBlockchain = async (): Promise<Bookmark[]> => {
    try {
      const bookmarkNFTContract = contractService.getContract(
        CONTRACT_ADDRESSES.BOOKMARK_NFT, 
        BookmarkNFTABI
      );
      
      // Get total supply
      const totalSupply = await contractService.callContract<bigint>(
        bookmarkNFTContract,
        'totalSupply',
        [],
        BigInt(0)
      );
      
      if (totalSupply === BigInt(0)) {
        return [];
      }
      
      console.log(`Total supply: ${totalSupply}`);
      
      // Fetch all tokens
      const bookmarks: Bookmark[] = [];
      
      // Use a reasonable batch size to avoid rate limiting
      const batchSize = 10;
      const batches = Math.ceil(Number(totalSupply) / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, Number(totalSupply));
        
        console.log(`Fetching batch ${batch + 1}/${batches} (tokens ${start} to ${end - 1})`);
        
        const batchPromises = [];
        
        for (let i = start; i < end; i++) {
          batchPromises.push(fetchBookmarkByIndex(i));
        }
        
        const batchResults = await Promise.all(batchPromises);
        bookmarks.push(...batchResults.filter(Boolean) as Bookmark[]);
      }
      
      return bookmarks;
    } catch (error) {
      console.error('Error fetching bookmarks from blockchain:', error);
      return [];
    }
  };

  // Fetch a bookmark by its index
  const fetchBookmarkByIndex = async (index: number): Promise<Bookmark | null> => {
    try {
      const bookmarkNFTContract = contractService.getContract(
        CONTRACT_ADDRESSES.BOOKMARK_NFT, 
        BookmarkNFTABI
      );
      
      // Get token ID by index
      const tokenId = await contractService.callContract<bigint>(
        bookmarkNFTContract,
        'tokenByIndex',
        [index],
        BigInt(0)
      );
      
      if (tokenId === BigInt(0)) {
        return null;
      }
      
      // Get token URI
      const tokenURI = await contractService.callContract<string>(
        bookmarkNFTContract,
        'tokenURI',
        [tokenId],
        ''
      );
      
      if (!tokenURI) {
        return null;
      }
      
      // Get owner
      const owner = await contractService.callContract<string>(
        bookmarkNFTContract,
        'ownerOf',
        [tokenId],
        ''
      );
      
      // Fetch metadata
      const metadata = await fetchMetadata(tokenURI);
      
      // Get votes if available
      let votes = 0;
      try {
        const bookmarkVotingContract = contractService.getContract(
          CONTRACT_ADDRESSES.BOOKMARK_VOTING, 
          BookmarkVotingABI
        );
        
        votes = Number(await contractService.callContract<bigint>(
          bookmarkVotingContract,
          'getBookmarkVotes',
          [tokenId],
          BigInt(0)
        ));
      } catch (error) {
        console.warn(`Could not fetch votes for token ${tokenId}:`, error);
      }
      
      // Create bookmark object
      return {
        id: tokenId.toString(),
        tokenId: tokenId.toString(),
        title: metadata.name || `Bookmark #${tokenId}`,
        author: metadata.author || 'Unknown',
        description: metadata.description,
        coverUrl: metadata.image,
        metadataUri: tokenURI,
        owner_address: owner,
        created_at: new Date().toISOString(),
        bisac_codes: metadata.bisac_codes,
        isbn: metadata.isbn,
        publish_date: metadata.publish_date,
        publisher: metadata.publisher,
        language: metadata.language,
        edition: metadata.edition,
        page_count: metadata.page_count,
        tags: metadata.tags,
        external_url: metadata.external_url,
        votes,
        isNFT: true
      };
    } catch (error) {
      console.error(`Error fetching bookmark at index ${index}:`, error);
      return null;
    }
  };

  // Fetch metadata from URI
  const fetchMetadata = async (uri: string): Promise<any> => {
    try {
      // Handle IPFS URIs
      if (uri.startsWith('ipfs://')) {
        uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      
      const response = await fetch(uri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching metadata:', error);
      return {};
    }
  };

  // Fetch a bookmark by ID
  const fetchBookmarkById = useCallback(async (id: string): Promise<Bookmark | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First check if we already have it in state
      const existingBookmark = bookmarks.find(bookmark => bookmark.id === id);
      
      if (existingBookmark) {
        setIsLoading(false);
        return existingBookmark;
      }
      
      // Try to fetch from blockchain first
      try {
        const tokenId = id;
        const bookmarkNFTContract = contractService.getContract(
          CONTRACT_ADDRESSES.BOOKMARK_NFT, 
          BookmarkNFTABI
        );
        
        // Check if token exists
        const exists = await contractService.callContract<boolean>(
          bookmarkNFTContract,
          'exists',
          [tokenId],
          false
        );
        
        if (exists) {
          // Get token URI
          const tokenURI = await contractService.callContract<string>(
            bookmarkNFTContract,
            'tokenURI',
            [tokenId],
            ''
          );
          
          // Get owner
          const owner = await contractService.callContract<string>(
            bookmarkNFTContract,
            'ownerOf',
            [tokenId],
            ''
          );
          
          // Fetch metadata
          const metadata = await fetchMetadata(tokenURI);
          
          // Get votes if available
          let votes = 0;
          try {
            const bookmarkVotingContract = contractService.getContract(
              CONTRACT_ADDRESSES.BOOKMARK_VOTING, 
              BookmarkVotingABI
            );
            
            votes = Number(await contractService.callContract<bigint>(
              bookmarkVotingContract,
              'getBookmarkVotes',
              [tokenId],
              BigInt(0)
            ));
          } catch (error) {
            console.warn(`Could not fetch votes for token ${tokenId}:`, error);
          }
          
          // Create bookmark object
          const bookmark: Bookmark = {
            id: tokenId.toString(),
            tokenId: tokenId.toString(),
            title: metadata.name || `Bookmark #${tokenId}`,
            author: metadata.author || 'Unknown',
            description: metadata.description,
            coverUrl: metadata.image,
            metadataUri: tokenURI,
            owner_address: owner,
            created_at: new Date().toISOString(),
            bisac_codes: metadata.bisac_codes,
            isbn: metadata.isbn,
            publish_date: metadata.publish_date,
            publisher: metadata.publisher,
            language: metadata.language,
            edition: metadata.edition,
            page_count: metadata.page_count,
            tags: metadata.tags,
            external_url: metadata.external_url,
            votes,
            isNFT: true
          };
          
          setIsLoading(false);
          return bookmark;
        }
      } catch (error) {
        console.warn('Error fetching from blockchain, falling back to database:', error);
      }
      
      // Fallback to database
      const response = await fetch(`${API_ENDPOINTS.BOOKMARKS}/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bookmark: ${response.status}`);
      }
      
      const data = await response.json();
      setIsLoading(false);
      return data.bookmark;
    } catch (err) {
      console.error('Error fetching bookmark by ID:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmark');
      setIsLoading(false);
      return null;
    }
  }, [bookmarks, sessionToken]);

  // Fetch a bookmark by token ID
  const fetchBookmarkByTokenId = useCallback(async (tokenId: string): Promise<Bookmark | null> => {
    // This is essentially the same as fetchBookmarkById for NFTs
    return fetchBookmarkById(tokenId);
  }, [fetchBookmarkById]);

  // Create a new bookmark
  const createBookmark = useCallback(async (bookmark: Partial<Bookmark>): Promise<Bookmark> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.BOOKMARKS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
        },
        body: JSON.stringify({ bookmark })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create bookmark: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update state
      setBookmarks(prev => [...prev, data.bookmark]);
      
      // Update user bookmarks if this is the user's bookmark
      if (address && data.bookmark.owner_address?.toLowerCase() === address.toLowerCase()) {
        setUserBookmarks(prev => [...prev, data.bookmark]);
      }
      
      // Emit event
      eventEmitter.emit(EventType.BOOKMARK_CREATED, {
        eventName: EventType.BOOKMARK_CREATED,
        args: [data.bookmark],
        timestamp: Date.now()
      });
      
      setIsLoading(false);
      return data.bookmark;
    } catch (err) {
      console.error('Error creating bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bookmark');
      setIsLoading(false);
      throw err;
    }
  }, [address, sessionToken]);

  // Update a bookmark
  const updateBookmark = useCallback(async (id: string, bookmark: Partial<Bookmark>): Promise<Bookmark> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BOOKMARKS}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
        },
        body: JSON.stringify({ bookmark })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update bookmark: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update state
      setBookmarks(prev => 
        prev.map(b => b.id === id ? { ...b, ...data.bookmark } : b)
      );
      
      // Update user bookmarks
      setUserBookmarks(prev => 
        prev.map(b => b.id === id ? { ...b, ...data.bookmark } : b)
      );
      
      // Emit event
      eventEmitter.emit(EventType.BOOKMARK_UPDATED, {
        eventName: EventType.BOOKMARK_UPDATED,
        args: [data.bookmark],
        timestamp: Date.now()
      });
      
      setIsLoading(false);
      return data.bookmark;
    } catch (err) {
      console.error('Error updating bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to update bookmark');
      setIsLoading(false);
      throw err;
    }
  }, [sessionToken]);

  // Delete a bookmark
  const deleteBookmark = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BOOKMARKS}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': sessionToken ? `Bearer ${sessionToken}` : ''
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete bookmark: ${response.status}`);
      }
      
      // Update state
      setBookmarks(prev => prev.filter(b => b.id !== id));
      setUserBookmarks(prev => prev.filter(b => b.id !== id));
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error deleting bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
      setIsLoading(false);
      return false;
    }
  }, [sessionToken]);

  // Refresh bookmarks
  const refreshBookmarks = useCallback(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Clear bookmarks
  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    setUserBookmarks([]);
  }, []);

  // Listen for blockchain events
  useEffect(() => {
    const handleTransferEvent = (eventData: any) => {
      console.log('Transfer event detected, refreshing bookmarks');
      refreshBookmarks();
    };
    
    eventEmitter.on(EventType.TRANSFER, handleTransferEvent);
    
    return () => {
      eventEmitter.off(EventType.TRANSFER, handleTransferEvent);
    };
  }, [refreshBookmarks]);

  // Fetch bookmarks on mount and when address changes
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks, address]);

  // Context value
  const value: BookmarkContextState = {
    bookmarks,
    userBookmarks,
    isLoading,
    error,
    fetchBookmarks,
    fetchBookmarkById,
    fetchBookmarkByTokenId,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    refreshBookmarks,
    clearBookmarks
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
};

// Custom hook to use the bookmark context
export const useBookmarkContext = () => useContext(BookmarkContext);

export default BookmarkContext;