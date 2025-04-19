export interface Bookmark {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverImageUrl: string | null;
  
  // BISAC categorization
  bisacCodes: string[]; // Array of BISAC codes
  bisacCategories: string[]; // Human-readable BISAC categories
  
  // Traditional publishing identifiers
  isbn10?: string;
  isbn13?: string;
  doi?: string;
  oclc?: string;
  
  // Publication details
  publisher?: string;
  publishDate?: string;
  edition?: string;
  language?: string;
  pageCount?: number;
  
  // Categorization
  genres: string[]; // Primary genres
  tags: string[]; // More specific tags/themes
  
  // Web3 and digital identifiers
  contractAddress?: string; // For tokenized books
  tokenId?: string; // NFT token ID if applicable
  ipfsHash?: string; // IPFS content identifier
  
  // External links
  websiteUrl?: string;
  purchaseUrl?: string;
  readUrl?: string; // For free/sample content
  
  // Open-ended metadata (EPUB3.2-inspired approach)
  metadata: {
    [key: string]: any; // Allows for any custom metadata fields
  };
  
  // Community data
  totalStake?: number; // Total $BOOKMARK tokens staked
  stakeCount?: number; // Number of unique stakers
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Creator/submitter info
  createdBy: string; // User ID who added the bookmark
  verifiedAuthor: boolean; // Is the author verified
  authorId?: string; // ID of verified author if applicable
}

// For bookmark creation/editing
export interface BookmarkInput {
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  bisacCodes?: string[];
  isbn10?: string;
  isbn13?: string;
  doi?: string;
  oclc?: string;
  publisher?: string;
  publishDate?: string;
  edition?: string;
  language?: string;
  pageCount?: number;
  genres?: string[];
  tags?: string[];
  contractAddress?: string;
  tokenId?: string;
  ipfsHash?: string;
  websiteUrl?: string;
  purchaseUrl?: string;
  readUrl?: string;
  metadata?: {
    [key: string]: any;
  };
  createdBy?: string;
  verifiedAuthor?: boolean;
  authorId?: string;
}
// For displaying author information
export interface Author {
  id: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  website?: string;
  farcasterUser?: string;
  verified: boolean;
  bookmarks: string[]; // IDs of bookmarks by this author
}

// For stake information
export interface Stake {
  id: string;
  bookmarkId: string;
  userId: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}