import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useBookmarkNFT } from '../utils/contracts';
import { Bookmark } from '../types/bookmark.types';
import { fetchBookmarkById } from '../services/bookmark.service';
import { FaExternalLinkAlt, FaBook, FaPodcast, FaYoutube, FaEthereum } from 'react-icons/fa';
import { SiIpfs } from 'react-icons/si';
import { DelegationControls } from './DelegationControls';
import StakedBalance from './StakedBalance';
import NFTTransferModal from './NFTTransferModal';
import NFTApprovalModal from './NFTApprovalModal';


const BookmarkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { address, isConnected } = useWallet();
  const bookmarkNFT = useBookmarkNFT();
  
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add NFT-specific states
  const [isNFT, setIsNFT] = useState<boolean>(false);
  const [nftOwner, setNftOwner] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showApprovalModal, setShowApprovalModal] = useState<boolean>(false);
  const [tokenId, setTokenId] = useState<string | null>(null);

  useEffect(() => {
    const loadBookmark = async () => {
      try {
        setLoading(true);

        const bookmarkData = await fetchBookmarkById(id as string);
        setBookmark(bookmarkData);
        
        // Check if this is an NFT - try both naming conventions
        const bookmarkTokenId = bookmarkData.tokenId;
        if (bookmarkTokenId) {
          setIsNFT(true);
          setTokenId(bookmarkTokenId.toString());
        }
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
  
  // Add NFT ownership check
  useEffect(() => {
    const checkNFTOwnership = async () => {
      if (!bookmarkNFT || !tokenId || !isNFT) return;
      
      try {
        const owner = await bookmarkNFT.ownerOf(tokenId);
        setNftOwner(owner);
        
        if (address && owner.toLowerCase() === address.toLowerCase()) {
          setIsOwner(true);
        } else {
          setIsOwner(false);
        }
      } catch (err) {
        console.error('Error checking NFT ownership:', err);
      }
    };
    
    checkNFTOwnership();
  }, [bookmark, bookmarkNFT, address, isNFT, tokenId]);
  
  // Add handlers for NFT actions
  const handleTransfer = () => {
    setShowTransferModal(true);
  };
  
  const handleApprove = () => {
    setShowApprovalModal(true);
  };
  
  const handleTransactionSuccess = async () => {
    if (!bookmarkNFT || !tokenId) return;
    
    try {
      const owner = await bookmarkNFT.ownerOf(tokenId);
      setNftOwner(owner);
      
      if (address && owner.toLowerCase() === address.toLowerCase()) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }
    } catch (err) {
      console.error('Error refreshing NFT data:', err);
    }
  };

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

  // Helper function to safely access properties with different naming conventions
  const getProperty = (obj: any, snakeCaseProp: string, camelCaseProp: string) => {
    return obj[snakeCaseProp] !== undefined ? obj[snakeCaseProp] : obj[camelCaseProp];
  };

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
  
  // Add NFT information section
  const renderNFTInfo = () => {
    if (!isNFT) return null;
    
    return (
      <div className="my-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-3 text-blue-800">NFT Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-blue-700 font-medium">Token ID:</span>{' '}
            <span>{tokenId}</span>
          </div>
          
          <div>
            <span className="text-blue-700 font-medium">Owner:</span>{' '}
            {nftOwner ? (
              <span>
                {nftOwner.substring(0, 6)}...{nftOwner.substring(nftOwner.length - 4)}
                {isOwner && <span className="ml-2 text-green-600 font-medium">(You)</span>}
              </span>
            ) : (
              <span className="text-gray-500">Loading...</span>
            )}
          </div>
        </div>
        
        {isOwner && (
          <div className="mt-4 flex gap-3">
            <button 
              onClick={handleTransfer}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Transfer NFT
            </button>
            <button 
              onClick={handleApprove}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Approve Operator
            </button>
          </div>
        )}
      </div>
    );
  };

  // Get properties using the helper function to handle both naming conventions
  const coverUrl = getProperty(bookmark, 'cover_url', 'coverUrl');
  const totalStake = getProperty(bookmark, 'total_stake', 'totalStake') || 0;
  const stakeCount = getProperty(bookmark, 'stake_count', 'stakeCount') || 0;
  const verifiedAuthor = getProperty(bookmark, 'verified_author', 'verifiedAuthor');
  const publisher = getProperty(bookmark, 'publisher', 'publisher');
  const publishDate = getProperty(bookmark, 'publish_date', 'publishDate');
  const language = getProperty(bookmark, 'language', 'language');
  const pageCount = getProperty(bookmark, 'page_count', 'pageCount');
  const edition = getProperty(bookmark, 'edition', 'edition');
  const isbn13 = getProperty(bookmark, 'isbn13', 'isbn13');
  const isbn10 = getProperty(bookmark, 'isbn10', 'isbn10');
  const doi = getProperty(bookmark, 'doi', 'doi');
  const contractAddress = getProperty(bookmark, 'contract_address', 'contractAddress');
  const ipfsHash = getProperty(bookmark, 'ipfs_hash', 'ipfsHash');
  const websiteUrl = getProperty(bookmark, 'website_url', 'websiteUrl');
  const purchaseUrl = getProperty(bookmark, 'purchase_url', 'purchaseUrl');

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Add StakedBalance component to display user's voting power */}
      {address && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Your Voting Power</h3>
          <StakedBalance address={address} />
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-8">
        {/* Book Cover and Staking Section */}
        <div className="md:w-1/3">
          <div className="sticky top-8">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Add NFT badge if this is an NFT */}
              {isNFT && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                  NFT
                </div>
              )}
              
              {coverUrl ? (
                <img 
                  src={coverUrl} 
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
                    <span className="font-medium">{totalStake} $BOOKMARK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unique Stakers:</span>
                    <span className="font-medium">{stakeCount}</span>
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
                  {verifiedAuthor && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Verified Author
                    </span>
                  )}
                </span>
              </div>
              
              {/* Add NFT Information section */}
              {renderNFTInfo()}
              
              {/* Description */}
              <div className="prose max-w-none my-6">
                <h2 className="text-xl font-semibold mb-2">About this Book</h2>
                <p className="whitespace-pre-line">{bookmark.description}</p>
              </div>
              
              {/* Publication Details */}
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">Publication Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publisher && (
                    <div>
                      <span className="text-gray-600">Publisher:</span> {publisher}
                    </div>
                  )}
                  {publishDate && (
                    <div>
                      <span className="text-gray-600">Published:</span> {publishDate}
                    </div>
                  )}
                  {language && (
                    <div>
                      <span className="text-gray-600">Language:</span> {language}
                    </div>
                  )}
                  {pageCount && (
                    <div>
                      <span className="text-gray-600">Pages:</span> {pageCount}
                    </div>
                  )}
                  {edition && (
                    <div>
                      <span className="text-gray-600">Edition:</span> {edition}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Identifiers */}
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">Identifiers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isbn13 && (
                    <div>
                      <span className="text-gray-600">ISBN-13:</span> {isbn13}
                    </div>
                  )}
                  {isbn10 && (
                    <div>
                      <span className="text-gray-600">ISBN-10:</span> {isbn10}
                    </div>
                  )}
                  {doi && (
                    <div>
                      <span className="text-gray-600">DOI:</span> {doi}
                    </div>
                  )}
                  {contractAddress && (
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-1">Contract:</span>
                      <a 
                        href={`https://basescan.org/address/${contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center"
                      >
                        <FaEthereum className="mr-1" />
                        {contractAddress.substring(0, 6)}...{contractAddress.substring(38)}
                        <FaExternalLinkAlt className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {ipfsHash && (
                    <div className="flex items-center">
                      <span className="text-gray-600 mr-1">IPFS:</span>
                      <a 
                        href={`https://ipfs.io/ipfs/${ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center"
                      >
                        <SiIpfs className="mr-1" />
                        {ipfsHash.substring(0, 6)}...
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
                  {websiteUrl && (
                    <a 
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-500 hover:underline"
                    >
                      <FaExternalLinkAlt className="mr-2" /> Official Website
                    </a>
                  )}
                  {purchaseUrl && (
                    <a 
                      href={purchaseUrl}
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
      
      {/* Add NFT modals */}
      {showTransferModal && tokenId && (
        <NFTTransferModal
          tokenId={tokenId}
          onClose={() => setShowTransferModal(false)}
          onSuccess={handleTransactionSuccess}
        />
      )}
      
      {showApprovalModal && tokenId && (
        <NFTApprovalModal
          tokenId={tokenId}
          onClose={() => setShowApprovalModal(false)}
          onSuccess={handleTransactionSuccess}
        />
      )}
    </div>
  );
};

export default BookmarkDetail;