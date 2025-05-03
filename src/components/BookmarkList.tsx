import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useBookmarkNFT } from '../utils/contracts';
import { API_ENDPOINTS } from '../config/constants';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';

interface Bookmark {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  added_by: string;
  created_at: string;
  updated_at: string;
  total_delegations?: number;
  token_id?: string;
  owner_address?: string;
}

interface BookmarkListProps {
  userOnly?: boolean;
  limit?: number;
  sortBy?: 'created_at' | 'delegations' | 'token_id';
  filterNFTs?: 'all' | 'owned' | 'not-owned';
}

export const BookmarkList = ({ 
  userOnly = false, 
  limit = 50,
  sortBy = 'created_at',
  filterNFTs = 'all'
}: BookmarkListProps) => {
  const { sessionToken } = useWallet();
  const { address } = useAccount();
  const bookmarkNFT = useBookmarkNFT();
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSort, setCurrentSort] = useState<'created_at' | 'delegations' | 'token_id'>(
    sortBy === 'delegations' ? 'delegations' : 
    sortBy === 'token_id' ? 'token_id' : 'created_at'
  );
  const [currentFilter, setCurrentFilter] = useState<'all' | 'owned' | 'not-owned'>(filterNFTs);
  
  // Function to check if user owns a specific NFT
  const checkNFTOwnership = async (tokenId: string): Promise<boolean> => {
    if (!bookmarkNFT || !address || !tokenId) return false;
    
    try {
      const owner = await bookmarkNFT.ownerOf(tokenId);
      return owner.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error(`Error checking ownership of token ${tokenId}:`, error);
      return false;
    }
  };
  
  // Add a function to fetch bookmarks from the blockchain
  const fetchBookmarksFromBlockchain = async () => {
    if (!bookmarkNFT) return [];
    
    try {
      // Get total supply of NFTs
      const totalSupply = await bookmarkNFT.totalSupply();
      console.log('Total NFTs:', totalSupply.toString());
      
      // Fetch the latest NFTs (limit to a reasonable number)
      const count = Math.min(Number(totalSupply), 50);
      const bookmarks = [];
      
      for (let i = totalSupply; i > totalSupply - count && i > 0; i--) {
        try {
          // Check if token exists
          const exists = await bookmarkNFT.exists(i);
          if (!exists) continue;
          
          // Get basic metadata
          const metadata = await bookmarkNFT.getBookmarkMetadata(i);
          const owner = await bookmarkNFT.ownerOf(i);
          const creationTime = await bookmarkNFT.getBookmarkCreationTime(i);
          
          // Create bookmark object
          const bookmark = {
            id: i.toString(),
            title: metadata.title,
            author: metadata.creator,
            tokenId: i.toString(),
            metadata_uri: metadata.metadataURI,
            owner_address: owner,
            created_at: new Date(Number(creationTime) * 1000).toISOString(),
            // Other fields will be populated from IPFS if needed
          };
          
          bookmarks.push(bookmark);
        } catch (err) {
          console.error(`Error fetching NFT ${i}:`, err);
        }
      }
      
      return bookmarks;
    } catch (err) {
      console.error('Error fetching bookmarks from blockchain:', err);
      return [];
    }
  };

  // Update the fetchBookmarks function
  const fetchBookmarks = async () => {
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
        
        if (userOnly && address) {
          filteredBookmarks = blockchainBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() === address.toLowerCase()
          );
        }
        
        if (currentFilter === 'owned' && address) {
          filteredBookmarks = blockchainBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() === address.toLowerCase()
          );
        } else if (currentFilter === 'not-owned' && address) {
          filteredBookmarks = blockchainBookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() !== address.toLowerCase()
          );
        }
        
        // Apply sorting
        if (currentSort === 'token_id') {
          filteredBookmarks.sort((a, b) => 
            Number(b.tokenId || 0) - Number(a.tokenId || 0)
          );
        }
        // Other sorting options would need to be implemented differently
        // since we don't have delegation data from the blockchain yet
        
        setBookmarks(filteredBookmarks);
        setIsLoading(false);
        return;
      }
      
      // Fallback to database if blockchain fetch failed or returned no results
      console.log('Falling back to database bookmarks');
      
      // Original database fetch logic
      const queryParams = new URLSearchParams();
      if (userOnly) queryParams.append('userOnly', 'true');
      queryParams.append('sortBy', currentSort);
      queryParams.append('limit', limit.toString());
      queryParams.append('includeNFTData', 'true');
      
      const response = await fetch(`${API_ENDPOINTS.BOOKMARKS}?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bookmark fetch error response:', errorText);
        throw new Error(`Failed to fetch bookmarks: ${response.status}`);
      }
      
      const data = await response.json();
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBookmarks();
  }, [sessionToken, userOnly, currentSort, currentFilter, address, bookmarkNFT]);
  
  // Update currentSort if sortBy prop changes
  useEffect(() => {
    if (sortBy === 'delegations' || sortBy === 'created_at' || sortBy === 'token_id') {
      setCurrentSort(sortBy);
    }
  }, [sortBy]);
  
  // Update currentFilter if filterNFTs prop changes
  useEffect(() => {
    setCurrentFilter(filterNFTs);
  }, [filterNFTs]);
  
  const handleSortChange = (newSortBy: 'created_at' | 'delegations' | 'token_id') => {
    setCurrentSort(newSortBy);
  };
  
  const handleFilterChange = (newFilter: 'all' | 'owned' | 'not-owned') => {
    setCurrentFilter(newFilter);
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading bookmarks...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <p><strong>Error:</strong> {error}</p>
        <button
          onClick={fetchBookmarks}
          className="retry-button"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (bookmarks.length === 0) {
    return (
      <div className="empty-state">
        <p>
          {userOnly 
            ? "You haven't added any bookmarks yet." 
            : currentFilter === 'owned'
              ? "You don't own any bookmark NFTs yet."
              : "No bookmarks found."}
        </p>
        <p>Be the first to add a bookmark!</p>
      </div>
    );
  }
  
  return (
    <div className="bookmark-list">
      <div className="bookmark-list-header">
        <h2>
          {userOnly ? 'Your Bookmarks' : 'All Bookmarks'}
        </h2>
        
        <div className="filter-controls">
          {/* NFT Filter Controls */}
          <div className="filter-group">
            <span className="filter-label">Show:</span>
            <div className="button-group">
              <button
                onClick={() => handleFilterChange('all')}
                className={`filter-button ${currentFilter === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('owned')}
                className={`filter-button ${currentFilter === 'owned' ? 'active' : ''}`}
              >
                Owned NFTs
              </button>
              <button
                onClick={() => handleFilterChange('not-owned')}
                className={`filter-button ${currentFilter === 'not-owned' ? 'active' : ''}`}
              >
                Not Owned
              </button>
            </div>
          </div>
          
          {/* Sort Controls */}
          <div className="filter-group">
            <span className="filter-label">Sort by:</span>
            <div className="button-group">
              <button
                onClick={() => handleSortChange('created_at')}
                className={`filter-button ${currentSort === 'created_at' ? 'active' : ''}`}
              >
                Newest
              </button>
              <button
                onClick={() => handleSortChange('delegations')}
                className={`filter-button ${currentSort === 'delegations' ? 'active' : ''}`}
              >
                Most Popular
              </button>
              <button
                onClick={() => handleSortChange('token_id')}
                className={`filter-button ${currentSort === 'token_id' ? 'active' : ''}`}
              >
                Token ID
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bookmark-grid">
        {bookmarks.map(bookmark => (
          <Link 
            key={bookmark.id}
            to={`/bookmark/${bookmark.id}`}
            className="bookmark-card"
          >
            {/* NFT Badge - only show if it has a token_id */}
            {bookmark.token_id && (
              <div className="nft-badge">
                NFT #{bookmark.token_id}
              </div>
            )}
            
            {/* Ownership Badge - only show if user owns this NFT */}
            {bookmark.token_id && bookmark.owner_address?.toLowerCase() === address?.toLowerCase() && (
              <div className="ownership-badge">
                You Own This
              </div>
            )}
            
            <div className="bookmark-cover">
              {bookmark.cover_url ? (
                <img 
                  src={bookmark.cover_url} 
                  alt={`Cover for ${bookmark.title}`}
                  className="cover-image"
                  onError={(e) => {
                    // Replace with placeholder on error
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x180?text=No+Cover';
                  }}
                />
              ) : (
                <div className="cover-placeholder">
                  No Cover Available
                </div>
              )}
            </div>
            
            <div className="bookmark-details">
              <h3 className="bookmark-title">{bookmark.title}</h3>
              <p className="bookmark-author">by {bookmark.author}</p>
              
              {bookmark.description && (
                <p className="bookmark-description">{bookmark.description}</p>
              )}
              
              <div className="bookmark-meta">
                <span className="bookmark-date">
                  Added: {new Date(bookmark.created_at).toLocaleDateString()}
                </span>
                
                <span className="bookmark-delegations">
                  <span className="delegation-icon">🔖</span>
                  <span className="delegation-count">{bookmark.total_delegations || 0}</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};