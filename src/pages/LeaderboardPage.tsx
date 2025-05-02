import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBookmarkLeaderboard, useBookmarkNFT, formatBigInt } from '../utils/contracts';
import { ethers } from 'ethers';

interface BookmarkRank {
  tokenId: string;
  votes: string;
  rank: number;
  title?: string;
  author?: string;
  coverUrl?: string;
}

const LeaderboardPage: React.FC = () => {
  const bookmarkLeaderboard = useBookmarkLeaderboard();
  const bookmarkNFT = useBookmarkNFT();
  
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [topBookmarks, setTopBookmarks] = useState<BookmarkRank[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboardNFT, setLeaderboardNFT] = useState<string | null>(null);
  const [leaderboardNFTOwner, setLeaderboardNFTOwner] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState<boolean>(false);
  const [weekOptions, setWeekOptions] = useState<number[]>([]);
  
  // Function to fetch bookmark metadata
  const fetchBookmarkMetadata = useCallback(async (tokenId: string) => {
    if (!bookmarkNFT) return null;
    
    try {
      const [title, author, metadataURI] = await bookmarkNFT.getBookmarkMetadata(tokenId);
      
      // Try to get cover URL from metadata if available
      let coverUrl = '';
      if (metadataURI) {
        try {
          const response = await fetch(metadataURI);
          if (response.ok) {
            const metadata = await response.json();
            coverUrl = metadata.image || '';
          }
        } catch (err) {
          console.error(`Error fetching metadata for token ${tokenId}:`, err);
        }
      }
      
      return {
        title,
        author,
        coverUrl
      };
    } catch (err) {
      console.error(`Error fetching bookmark metadata for token ${tokenId}:`, err);
      return null;
    }
  }, [bookmarkNFT]);
  
  // Function to fetch leaderboard data
  const fetchLeaderboardData = useCallback(async (weekNumber: number) => {
    if (!bookmarkLeaderboard || !bookmarkNFT) {
      setError('Contracts not available');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if the leaderboard is finalized for this week
      const finalized = await bookmarkLeaderboard.isLeaderboardFinalized(weekNumber);
      setIsFinalized(finalized);
      
      // Get top bookmarks (limit to top 10)
      const bookmarkRanks = await bookmarkLeaderboard.getWeeklyTopBookmarks(weekNumber, 10);
      
      // Enhance with metadata
      const enhancedBookmarks = await Promise.all(
        bookmarkRanks.map(async (bookmark: any) => {
          const tokenId = bookmark.tokenId.toString();
          const votes = formatBigInt(bookmark.votes);
          const rank = bookmark.rank.toNumber();
          
          // Fetch additional metadata
          const metadata = await fetchBookmarkMetadata(tokenId);
          
          return {
            tokenId,
            votes,
            rank,
            title: metadata?.title || `Bookmark #${tokenId}`,
            author: metadata?.author || 'Unknown Author',
            coverUrl: metadata?.coverUrl || ''
          };
        })
      );
      
      setTopBookmarks(enhancedBookmarks);
      
      // Check if there's a leaderboard NFT for this week
      if (finalized) {
        try {
          const nftId = await bookmarkLeaderboard.getLeaderboardNFTId(weekNumber);
          if (nftId && !nftId.isZero()) {
            setLeaderboardNFT(nftId.toString());
            
            // Get the owner of the NFT
            try {
              const owner = await bookmarkLeaderboard.getLeaderboardNFTOwner(weekNumber);
              setLeaderboardNFTOwner(owner);
            } catch (err) {
              console.error('Error fetching leaderboard NFT owner:', err);
              setLeaderboardNFTOwner(null);
            }
          } else {
            setLeaderboardNFT(null);
            setLeaderboardNFTOwner(null);
          }
        } catch (err) {
          console.error('Error fetching leaderboard NFT:', err);
          setLeaderboardNFT(null);
          setLeaderboardNFTOwner(null);
        }
      } else {
        setLeaderboardNFT(null);
        setLeaderboardNFTOwner(null);
      }
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Failed to load leaderboard data. Please try again.');
      setTopBookmarks([]);
    } finally {
      setIsLoading(false);
    }
  }, [bookmarkLeaderboard, bookmarkNFT, fetchBookmarkMetadata]);
  
  // Get available weeks
  useEffect(() => {
    const fetchAvailableWeeks = async () => {
      if (!bookmarkLeaderboard) return;
      
      try {
        // Get the current cycle from the contract
        const currentCycle = await bookmarkLeaderboard.getCurrentCycle();
        const currentCycleNumber = currentCycle.toNumber();
        
        // Generate an array of available weeks (from week 1 to current)
        const weeks = Array.from({ length: currentCycleNumber }, (_, i) => i + 1);
        setWeekOptions(weeks.reverse()); // Most recent first
        
        // Set current week to the most recent one
        if (currentWeek === 0) {
          setCurrentWeek(currentCycleNumber);
        }
      } catch (err) {
        console.error('Error fetching available weeks:', err);
      }
    };
    
    fetchAvailableWeeks();
  }, [bookmarkLeaderboard, currentWeek]);
  
  // Fetch leaderboard data when week changes
  useEffect(() => {
    if (currentWeek > 0) {
      fetchLeaderboardData(currentWeek);
    }
  }, [currentWeek, fetchLeaderboardData]);
  
  // Handle week change
  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentWeek(Number(e.target.value));
  };
  
  // Format address for display
  const formatAddress = (address: string | null): string => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Weekly Leaderboard</h1>
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Week:
          </label>
          <select
            id="week-select"
            value={currentWeek}
            onChange={handleWeekChange}
            className="block w-full md:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isLoading || weekOptions.length === 0}
          >
            {weekOptions.length === 0 ? (
              <option value="0">Loading weeks...</option>
            ) : (
              weekOptions.map(week => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))
            )}
          </select>
        </div>
        
        <div className="bg-blue-50 text-blue-700 p-3 rounded-md">
          <p className="text-sm font-medium">
            {isFinalized 
              ? `Week ${currentWeek} leaderboard is finalized` 
              : `Week ${currentWeek} leaderboard is not yet finalized`}
          </p>
        </div>
      </div>
      
      {/* Leaderboard NFT Section */}
      {leaderboardNFT && (
        <div className="mb-8 bg-gradient-to-r from-purple-100 to-indigo-100 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-purple-800 mb-3">
            Week {currentWeek} Leaderboard NFT
          </h2>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <img 
                src={topBookmarks[0]?.coverUrl || '/placeholder-cover.png'} 
                alt={`Week ${currentWeek} Winner`}
                className="w-32 h-32 object-cover"
              />
            </div>
            <div>
              <p className="text-lg font-medium text-purple-900">
                Winner: {topBookmarks[0]?.title || 'Loading...'}
              </p>
              <p className="text-sm text-purple-700 mb-3">
                by {topBookmarks[0]?.author || 'Unknown Author'}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">NFT ID:</span> {leaderboardNFT}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Owner:</span> {formatAddress(leaderboardNFTOwner)}
              </p>
              <div className="mt-3">
                <Link 
                  to={`/bookmark/${topBookmarks[0]?.tokenId}`}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View Winning Bookmark →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-md">
          {error}
          <button 
            onClick={() => fetchLeaderboardData(currentWeek)}
            className="ml-3 text-sm font-medium underline"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Leaderboard Table */}
          {topBookmarks.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {topBookmarks.map((bookmark) => (
                  <li key={bookmark.tokenId}>
                    <Link 
                      to={`/bookmark/${bookmark.tokenId}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6 flex items-center">
                        <div className="flex-shrink-0 mr-4 w-10 text-center">
                          <span className={`
                            inline-flex items-center justify-center h-8 w-8 rounded-full 
                            ${bookmark.rank === 1 ? 'bg-yellow-100 text-yellow-800' : 
                              bookmark.rank === 2 ? 'bg-gray-100 text-gray-800' : 
                              bookmark.rank === 3 ? 'bg-amber-100 text-amber-800' : 
                              'bg-blue-100 text-blue-800'}
                            text-sm font-medium
                          `}>
                            {bookmark.rank}
                          </span>
                        </div>
                        
                        <div className="flex-shrink-0 h-16 w-12 mr-4">
                          {bookmark.coverUrl ? (
                            <img 
                              src={bookmark.coverUrl} 
                              alt={bookmark.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                              No Cover
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {bookmark.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {bookmark.votes} votes
                            </p>
                          </div>
                          <p className="text-sm text-gray-500">
                            by {bookmark.author}
                          </p>
                        </div>
                        
                        <div className="ml-4">
                          <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-md">
              <p className="text-gray-500">No bookmarks found for this week.</p>
            </div>
          )}
        </>
      )}
      
      {/* Pagination (for future implementation) */}
      <div className="mt-6 flex justify-center">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            disabled
            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <span className="sr-only">Previous</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
            Page 1
          </span>
          <button
            disabled
            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            <span className="sr-only">Next</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </nav>
      </div>
      
      {/* Information Section */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-lg font-medium text-gray-900 mb-3">About the Leaderboard</h2>
        <p className="text-gray-600 mb-3">
          Each week, bookmarks with the most votes are featured on the leaderboard. The top bookmark 
          receives a special NFT that can be traded or auctioned.
        </p>
        <p className="text-gray-600">
          Voting cycles reset every Sunday at midnight UTC. Lock in your tokens on your favorite 
          bookmarks to help them reach the top!
        </p>
      </div>
    </div>
  );
};

export default LeaderboardPage;