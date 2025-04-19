import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
// Fix: Create a proper type or import it from the correct location
import { Bookmark } from '../types/bookmark.types';
// Fix: Ensure this service function exists
import { fetchBookmarkById } from '../services/bookmark.service';
// Fix: Make sure these packages are installed
import { FaExternalLinkAlt, FaBook, FaPodcast, FaYoutube, FaEthereum } from 'react-icons/fa';
import { SiIpfs } from 'react-icons/si';

// Fix: Import the DelegationControls component
import { DelegationControls } from './DelegationControls';

const BookmarkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Fix: Use the correct property from WalletContext
  const wallet = useWallet();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBookmark = async () => {
      try {
        setLoading(true);
        // Fix: Make sure this function exists in your service
        const bookmarkData = await fetchBookmarkById(id as string);
        setBookmark(bookmarkData);
      } catch (err) {
        console.error('Error loading bookmark:', err);
        setError('Failed to load bookmark details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadBookmark();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-xl">Loading bookmark details...</div>
      </div>
    );
  }

  if (error || !bookmark) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">{error || 'Bookmark not found'}</div>
        <Link to="/bookmarks" className="text-blue-500 hover:underline">
          Return to all bookmarks
        </Link>
      </div>
    );
  }

  // Helper function to render custom metadata
  const renderCustomMetadata = () => {
    if (!bookmark.metadata || Object.keys(bookmark.metadata).length === 0) {
      return null;
    }

    return (
      <div className="my-6">
        <h2 className="text-xl font-semibold mb-2">Additional Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(bookmark.metadata).map(([key, value]) => (
            <div key={key}>
              <span className="text-gray-600">{key}:</span>{' '}
              {typeof value === 'string' && value.startsWith('http') ? (
                <a 
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline flex items-center"
                >
                  {value.substring(0, 30)}...
                  <FaExternalLinkAlt className="ml-1 h-3 w-3" />
                </a>
              ) : (
                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Check if user is connected - adjust based on actual WalletContext properties
  const isConnected = wallet.address !== undefined && wallet.address !== null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Book Cover and Staking Section */}
        <div className="md:w-1/3">
          <div className="sticky top-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {bookmark.coverImageUrl ? (
                <img 
                  src={bookmark.coverImageUrl} 
                  alt={`Cover of ${bookmark.title}`} 
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="bg-gray-200 w-full h-96 flex items-center justify-center">
                  <span className="text-gray-500">No cover available</span>
                </div>
              )}
              
              {/* Staking Controls */}
              <div className="p-4 border-t">
                <h3 className="text-lg font-semibold mb-2">Support This Book</h3>
                {isConnected ? (
                  <DelegationControls bookmarkId={bookmark.id} currentStake={0} />
                ) : (
                  <div className="text-center p-4 bg-gray-100 rounded">
                    <p>Connect your wallet to stake tokens on this book</p>
                  </div>
                )}
                
                <div className="mt-4 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Staked:</span>
                    <span className="font-medium">{bookmark.totalStake || 0} $BOOKMARK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Stakers:</span>
                    <span className="font-medium">{bookmark.stakeCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Book Details Section */}
        <div className="md:w-2/3">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{bookmark.title}</h1>
              <div className="text-xl text-gray-700 mb-4">
                by{' '}
                <span className="font-semibold">
                  {bookmark.author}
                  {bookmark.verifiedAuthor && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Verified Author
                    </span>
                  )}
                </span>
              </div>
              
              {/* Description */}
              <div className="prose max-w-none my-6">
                <h2 className="text-xl font-semibold mb-2">About this Book</h2>
                <p className="whitespace-pre-line">{bookmark.description}</p>
              </div>
              
              {/* Publication Details */}
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">Publication Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmark.publisher && (
                    <div>
                      <span className="text-gray-600">Publisher:</span> {bookmark.publisher}
                    </div>
                  )}
                  {bookmark.publishDate && (
                    <div>
                      <span className="text-gray-600">Published:</span> {bookmark.publishDate}
                    </div>
                  )}
                  {bookmark.language && (
                    <div>
                      <span className="text-gray-600">Language:</span> {bookmark.language}
                    </div>
                  )}
                  {bookmark.pageCount && (
                    <div>
                      <span className="text-gray-600">Pages:</span> {bookmark.pageCount}
                    </div>
                  )}
                  {bookmark.edition && (
                    <div>
                      <span className="text-gray-600">Edition:</span> {bookmark.edition}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Identifiers */}
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">Identifiers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmark.isbn13 && (
                    <div>
                      <span className="text-gray-600">ISBN-13:</span> {bookmark.isbn13}
                    </div>
                  )}
                  {bookmark.isbn10 && (
                    <div>
                      <span className="text-gray-600">ISBN-10:</span> {bookmark.isbn10}
                    </div>
                  )}
                  {bookmark.doi && (
                    <div>
                      <span className="text-gray-600">DOI:</span> {bookmark.doi}
                    </div>
                  )}
                  {bookmark.contractAddress && (
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-1">Contract:</span>
                      <a 
                        href={`https://basescan.org/address/${bookmark.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center"
                      >
                        <FaEthereum className="mr-1" />
                        {bookmark.contractAddress.substring(0, 6)}...{bookmark.contractAddress.substring(38)}
                        <FaExternalLinkAlt className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {bookmark.ipfsHash && (
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-1">IPFS:</span>
                      <a 
                        href={`https://ipfs.io/ipfs/${bookmark.ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center"
                      >
                        <SiIpfs className="mr-1" />
                        {bookmark.ipfsHash.substring(0, 6)}...
                        <FaExternalLinkAlt className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Categories */}
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">Categories</h2>
                <div className="mb-3">
                  <span className="text-gray-600 mr-2">Genres:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {bookmark.genres && bookmark.genres.map((genre, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
                {bookmark.tags && bookmark.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600 mr-2">Tags:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {bookmark.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* External Links */}
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">External Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bookmark.websiteUrl && (
                    <a 
                      href={bookmark.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-500 hover:underline"
                    >
                      <FaExternalLinkAlt className="mr-2" /> Official Website
                    </a>
                  )}
                  {bookmark.purchaseUrl && (
                    <a 
                      href={bookmark.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-500 hover:underline"
                    >
                      <FaBook className="mr-2" /> Purchase Book
                    </a>
                  )}
                  {bookmark.metadata?.podcastUrl && (
                    <a 
                      href={bookmark.metadata.podcastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-500 hover:underline"
                    >
                      <FaPodcast className="mr-2" /> Related Podcast
                    </a>
                  )}
                  {bookmark.metadata?.youtubeChannelId && (
                    <a 
                      href={`https://youtube.com/channel/${bookmark.metadata.youtubeChannelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-500 hover:underline"
                    >
                      <FaYoutube className="mr-2" /> YouTube Channel
                    </a>
                  )}
                </div>
              </div>
              
              {/* Custom Metadata */}
              {renderCustomMetadata()}
            </div>
          </div>
          
          {/* Additional sections could be added here: */}
          {/* - Similar bookmarks */}
          {/* - Reader reviews/comments */}
          {/* - Reading group discussions */}
        </div>
      </div>
    </div>
  );
};

export default BookmarkDetail;