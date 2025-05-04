import { Bookmark, BookmarkInput } from '../types/bookmark.types';
import { AUTH_CONSTANTS, CONTRACT_ADDRESSES } from '../config/constants';
import { contractService } from './contract.service';
import { transactionService, TransactionStatus } from './transaction.service';
import { eventEmitter, EventType } from './event-listener.service';
import BookmarkNFTABI from '../config/abis/BookmarkNFT.json';
import { ethers } from 'ethers';

// Helper to get the session token
const getSessionToken = (): string | null => {
  return localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
};

// Helper to add auth headers if a token exists
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Define the bookmark metadata interface
export interface BookmarkMetadata {
  name: string;
  description?: string;
  image?: string;
  author: string;
  bisac_codes?: string[];
  isbn?: string;
  publish_date?: string;
  publisher?: string;
  language?: string;
  edition?: string;
  page_count?: number;
  tags?: string[];
  external_url?: string;
}

/**
 * Store metadata on IPFS
 */
export const storeMetadataOnIPFS = async (metadata: BookmarkMetadata): Promise<string> => {
  try {
    // Use the API endpoint for storing metadata
    const response = await fetch('/.netlify/functions/store-metadata', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ metadata })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to store metadata');
    }
    
    const data = await response.json();
    return data.metadataUri;
  } catch (error) {
    console.error('Error storing metadata on IPFS:', error);
    throw error;
  }
};

/**
 * Mint a new bookmark NFT
 */
export const mintBookmarkNFT = async (metadataUri: string): Promise<string> => {
  try {
    // Get the signer from the wallet
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Get the contract with signer
    const bookmarkNFTContract = new ethers.Contract(
      CONTRACT_ADDRESSES.BOOKMARK_NFT,
      BookmarkNFTABI,
      signer
    );
    
    // Mint the NFT
    const tx = await bookmarkNFTContract.mint(await signer.getAddress(), metadataUri);
    
    // Add the transaction to the queue
    transactionService.addTransaction(
      tx.hash,
      'Minting Bookmark NFT',
      { metadataUri }
    );
    
    // Wait for the transaction to be confirmed
    const receipt = await tx.wait();
    
    // Get the token ID from the event
    const event = receipt.logs
      .map((log: any) => {
        try {
          return bookmarkNFTContract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event && event.name === 'Transfer');
    
    if (!event) {
      throw new Error('Could not find Transfer event in transaction receipt');
    }
    
    const tokenId = event.args[2].toString();
    
    // Emit event
    eventEmitter.emit(EventType.BOOKMARK_CREATED, {
      eventName: EventType.BOOKMARK_CREATED,
      args: [{ tokenId, metadataUri }],
      timestamp: Date.now()
    });
    
    return tokenId;
  } catch (error) {
    console.error('Error minting bookmark NFT:', error);
    throw error;
  }
};

/**
 * Create a bookmark with NFT first approach
 */
export const createBookmarkWithNFT = async (bookmarkData: BookmarkInput): Promise<Bookmark> => {
  try {
    // 1. Create metadata object
    const metadata: BookmarkMetadata = {
      name: bookmarkData.title,
      description: bookmarkData.description,
      image: bookmarkData.coverUrl,
      author: bookmarkData.author,
      bisac_codes: bookmarkData.bisac_codes,
      isbn: bookmarkData.isbn,
      publish_date: bookmarkData.publish_date,
      publisher: bookmarkData.publisher,
      language: bookmarkData.language,
      edition: bookmarkData.edition,
      page_count: bookmarkData.page_count ? Number(bookmarkData.page_count) : undefined,
      tags: bookmarkData.tags,
      external_url: bookmarkData.external_url
    };
    
    // 2. Store metadata on IPFS
    const metadataUri = await storeMetadataOnIPFS(metadata);
    
    // 3. Mint NFT
    const tokenId = await mintBookmarkNFT(metadataUri);
    
    // 4. Create bookmark in database with tokenId
    const response = await fetch('/.netlify/functions/bookmarks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...bookmarkData,
        tokenId,
        metadataUri
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add bookmark to database');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating bookmark with NFT:', error);
    throw error;
  }
};

// Fetch a single bookmark by ID
export const fetchBookmarkById = async (id: string): Promise<Bookmark> => {
  try {
    // First try to fetch from blockchain if it's a token ID
    try {
      const bookmarkNFTContract = contractService.getContract(
        CONTRACT_ADDRESSES.BOOKMARK_NFT,
        BookmarkNFTABI
      );
      
      // Check if token exists
      const exists = await contractService.callContract<boolean>(
        bookmarkNFTContract,
        'exists',
        [id],
        false
      );
      
      if (exists) {
        // Get token URI
        const tokenURI = await contractService.callContract<string>(
          bookmarkNFTContract,
          'tokenURI',
          [id],
          ''
        );
        
        // Get owner
        const owner = await contractService.callContract<string>(
          bookmarkNFTContract,
          'ownerOf',
          [id],
          ''
        );
        
        // Fetch metadata
        const metadata = await fetchMetadata(tokenURI);
        
        // Create bookmark object
        const bookmark: Bookmark = {
          id,
          tokenId: id,
          title: metadata.name || `Bookmark #${id}`,
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
          isNFT: true
        };
        
        return bookmark;
      }
    } catch (error) {
      console.warn('Error fetching from blockchain, falling back to database:', error);
    }
    
    // For viewing bookmarks, we don't need to include auth headers
    // The serverless function will allow public access for GET requests
    const response = await fetch(`/.netlify/functions/bookmarks?id=${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch bookmark');
    }
    
    const data = await response.json();
    return data.bookmark;
  } catch (error) {
    console.error('Error fetching bookmark:', error);
    throw error;
  }
};

/**
 * Fetch metadata from URI
 */
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

// Fetch all bookmarks
export const fetchAllBookmarks = async (userOnly: boolean = false): Promise<Bookmark[]> => {
  try {
    // First try to fetch from blockchain
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
      
      if (totalSupply > BigInt(0)) {
        console.log(`Fetching ${totalSupply} bookmarks from blockchain`);
        
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
        
        // Filter by user if needed
        if (userOnly) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const userAddress = await provider.getSigner().getAddress();
          
          return bookmarks.filter(
            bookmark => bookmark.owner_address?.toLowerCase() === userAddress.toLowerCase()
          );
        }
        
        return bookmarks;
      }
    } catch (error) {
      console.warn('Error fetching from blockchain, falling back to database:', error);
    }
    
    // Fallback to database
    let url = '/.netlify/functions/bookmarks';
    let headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    // If fetching user-specific bookmarks, we need to include auth headers
    // and add the userOnly parameter
    if (userOnly) {
      url += '?userOnly=true';
      const token = getSessionToken();
      if (!token) {
        throw new Error('Authentication required to view your bookmarks');
      }
      
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch bookmarks');
    }
    
    const data = await response.json();
    return data.bookmarks;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    throw error;
  }
};

/**
 * Fetch a bookmark by its index
 */
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
      isNFT: true
    };
  } catch (error) {
    console.error(`Error fetching bookmark at index ${index}:`, error);
    return null;
  }
};

// Add a new bookmark
export const addBookmark = async (bookmarkData: BookmarkInput): Promise<Bookmark> => {
  try {
    // For adding bookmarks, we need authentication
    const token = getSessionToken();
    if (!token) {
      throw new Error('Authentication required to add a bookmark');
    }
    
    // Use the NFT-first approach
    return createBookmarkWithNFT(bookmarkData);
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
};

// Update an existing bookmark
export const updateBookmark = async (id: string, bookmarkData: Partial<BookmarkInput>): Promise<Bookmark> => {
  try {
    // For updating bookmarks, we need authentication
    const token = getSessionToken();
    if (!token) {
      throw new Error('Authentication required to update a bookmark');
    }
    
    // Check if this is an NFT
    try {
      const bookmarkNFTContract = contractService.getContract(
        CONTRACT_ADDRESSES.BOOKMARK_NFT,
        BookmarkNFTABI
      );
      
      // Check if token exists
      const exists = await contractService.callContract<boolean>(
        bookmarkNFTContract,
        'exists',
        [id],
        false
      );
      
      if (exists) {
        // Get the owner
        const owner = await contractService.callContract<string>(
          bookmarkNFTContract,
          'ownerOf',
          [id],
          ''
        );
        
        // Check if the current user is the owner
        const provider = new ethers.BrowserProvider(window.ethereum);
        const userAddress = await provider.getSigner().getAddress();
        
        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
          throw new Error('You are not the owner of this bookmark');
        }
        
        // For NFTs, we need to update the metadata
        // Get token URI
        const tokenURI = await contractService.callContract<string>(
          bookmarkNFTContract,
          'tokenURI',
          [id],
          ''
        );
        
        // Fetch current metadata
        const currentMetadata = await fetchMetadata(tokenURI);
        
        // Create updated metadata
        const updatedMetadata: BookmarkMetadata = {
          name: bookmarkData.title || currentMetadata.name,
          description: bookmarkData.description || currentMetadata.description,
          image: bookmarkData.coverUrl || currentMetadata.image,
          author: bookmarkData.author || currentMetadata.author,
          bisac_codes: bookmarkData.bisac_codes || currentMetadata.bisac_codes,
          isbn: bookmarkData.isbn || currentMetadata.isbn,
          publish_date: bookmarkData.publish_date || currentMetadata.publish_date,
          publisher: bookmarkData.publisher || currentMetadata.publisher,
          language: bookmarkData.language || currentMetadata.language,
          edition: bookmarkData.edition || currentMetadata.edition,
          page_count: bookmarkData.page_count ? Number(bookmarkData.page_count) : currentMetadata.page_count,
          tags: bookmarkData.tags || currentMetadata.tags,
          external_url: bookmarkData.external_url || currentMetadata.external_url
        };
        
        // Store updated metadata
        const metadataUri = await storeMetadataOnIPFS(updatedMetadata);
        
        // Update token URI
        const signer = await provider.getSigner();
        const bookmarkNFTWithSigner = new ethers.Contract(
          CONTRACT_ADDRESSES.BOOKMARK_NFT,
          BookmarkNFTABI,
          signer
        );
        
        const tx = await bookmarkNFTWithSigner.setTokenURI(id, metadataUri);
        
        // Add the transaction to the queue
        transactionService.addTransaction(
          tx.hash,
          'Updating Bookmark NFT Metadata',
          { id, metadataUri }
        );
        
        // Wait for the transaction to be confirmed
        await tx.wait();
      }
    } catch (error) {
      console.warn('Error updating NFT metadata, falling back to database update only:', error);
    }
    
    // Update in database
    const response = await fetch(`/.netlify/functions/bookmarks?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookmarkData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update bookmark');
    }
    
    const data = await response.json();
    
    // Emit event
    eventEmitter.emit(EventType.BOOKMARK_UPDATED, {
      eventName: EventType.BOOKMARK_UPDATED,
      args: [data],
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error updating bookmark:', error);
    throw error;
  }
};

// Delete a bookmark
export const deleteBookmark = async (id: string): Promise<void> => {
  try {
    // For deleting bookmarks, we need authentication
    const token = getSessionToken();
    if (!token) {
      throw new Error('Authentication required to delete a bookmark');
    }
    
    // Check if this is an NFT
    try {
      const bookmarkNFTContract = contractService.getContract(
        CONTRACT_ADDRESSES.BOOKMARK_NFT,
        BookmarkNFTABI
      );
      
      // Check if token exists
      const exists = await contractService.callContract<boolean>(
        bookmarkNFTContract,
        'exists',
        [id],
        false
      );
      
      if (exists) {
        // Get the owner
        const owner = await contractService.callContract<string>(
          bookmarkNFTContract,
          'ownerOf',
          [id],
          ''
        );
        
        // Check if the current user is the owner
        const provider = new ethers.BrowserProvider(window.ethereum);
        const userAddress = await provider.getSigner().getAddress();
        
        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
          throw new Error('You are not the owner of this bookmark');
        }
        
        // For NFTs, we can't actually delete them, but we can transfer to a burn address
        const signer = await provider.getSigner();
        const bookmarkNFTWithSigner = new ethers.Contract(
          CONTRACT_ADDRESSES.BOOKMARK_NFT,
          BookmarkNFTABI,
          signer
        );
        
        const burnAddress = '0x000000000000000000000000000000000000dEaD';
        
        const tx = await bookmarkNFTWithSigner.transferFrom(userAddress, burnAddress, id);
        
        // Add the transaction to the queue
        transactionService.addTransaction(
          tx.hash,
          'Burning Bookmark NFT',
          { id }
        );
        
        // Wait for the transaction to be confirmed
        await tx.wait();
      }
    } catch (error) {
      console.warn('Error burning NFT, falling back to database delete only:', error);
    }
    
    // Delete from database
    const response = await fetch(`/.netlify/functions/bookmarks?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete bookmark');
    }
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    throw error;
  }
};