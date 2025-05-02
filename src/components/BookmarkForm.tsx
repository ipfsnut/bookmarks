import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useBookmarkNFT } from '../utils/contracts';
import { API_ENDPOINTS } from '../config/constants';
import { BisacSelector } from './BisacSelector';

interface BookmarkFormProps {
  onSuccess?: (bookmark: any) => void;
  onCancel?: () => void;
}

export const BookmarkForm = ({ onSuccess, onCancel }: BookmarkFormProps) => {
  const { sessionToken, address } = useWallet();
  const bookmarkNFT = useBookmarkNFT();
  
  // Form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bisacCodes, setBisacCodes] = useState<string[]>([]);
  
  // Additional NFT metadata fields
  const [isbn, setIsbn] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [publisher, setPublisher] = useState('');
  const [language, setLanguage] = useState('');
  const [edition, setEdition] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [externalUrl, setExternalUrl] = useState('');
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<string>('');
  const [mintingStep, setMintingStep] = useState<number>(0);
  
  // Check if BookmarkNFT contract is available
  const [contractReady, setContractReady] = useState(false);
  
  useEffect(() => {
    if (bookmarkNFT) {
      setContractReady(true);
    }
  }, [bookmarkNFT]);
  
  // Handle tag input
  const [tagInput, setTagInput] = useState('');
  
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };
  
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Create metadata object for NFT
  const createMetadata = () => {
    const metadata = {
      name: title.trim(),
      description: description.trim() || `Bookmark for "${title}" by ${author}`,
      image: coverUrl.trim() || null,
      external_url: externalUrl.trim() || null,
      attributes: [
        { trait_type: 'Author', value: author.trim() },
        ...(publisher ? [{ trait_type: 'Publisher', value: publisher.trim() }] : []),
        ...(publishDate ? [{ trait_type: 'Publish Date', value: publishDate.trim() }] : []),
        ...(language ? [{ trait_type: 'Language', value: language.trim() }] : []),
        ...(edition ? [{ trait_type: 'Edition', value: edition.trim() }] : []),
        ...(pageCount ? [{ trait_type: 'Page Count', value: pageCount.trim() }] : []),
        ...(isbn ? [{ trait_type: 'ISBN', value: isbn.trim() }] : []),
        ...bisacCodes.map(code => ({ trait_type: 'BISAC Code', value: code })),
        ...tags.map(tag => ({ trait_type: 'Tag', value: tag }))
      ],
      properties: {
        bisac_codes: bisacCodes.length > 0 ? bisacCodes : null,
        tags: tags.length > 0 ? tags : null,
        isbn: isbn.trim() || null,
        publish_date: publishDate.trim() || null,
        publisher: publisher.trim() || null,
        language: language.trim() || null,
        edition: edition.trim() || null,
        page_count: pageCount.trim() ? parseInt(pageCount.trim()) : null,
        created_by: address
      }
    };
    
    return metadata;
  };
  
  // Store metadata in Supabase
  const storeMetadata = async (metadata: any, tokenId: string) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BOOKMARKS}/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          token_id: tokenId,
          metadata: metadata
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to store metadata');
      }
      
      const data = await response.json();
      return data.metadata_uri;
    } catch (err) {
      console.error('Error storing metadata:', err);
      throw err;
    }
  };
  
  // Mint NFT using BookmarkNFT contract
  const mintNFT = async (metadataUri: string) => {
    if (!bookmarkNFT || !address) {
      throw new Error('Contract or wallet not connected');
    }
    
    try {
      setTransactionStatus('Sending transaction to mint NFT...');
      
      // Call the mintBookmark function on the contract
      const tx = await bookmarkNFT.mintBookmark(
        metadataUri,
        title.trim(),
        author.trim()
      );
      
      setTransactionHash(tx.hash);
      setTransactionStatus('Transaction submitted. Waiting for confirmation...');
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Find the BookmarkCreated event to get the tokenId
      const event = receipt.logs
        .map((log: any) => {
          try {
            return bookmarkNFT.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'BookmarkCreated');
      
      if (!event) {
        throw new Error('Could not find BookmarkCreated event in transaction receipt');
      }
      
      const tokenId = event.args.tokenId.toString();
      
      setTransactionStatus('NFT minted successfully!');
      return tokenId;
    } catch (err) {
      console.error('Error minting NFT:', err);
      throw err;
    }
  };
  
  // Create bookmark in database
  const createBookmarkInDB = async (tokenId: string, metadataUri: string) => {
    try {
      const bookmarkData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        cover_url: coverUrl.trim() || null,
        bisac_codes: bisacCodes.length > 0 ? bisacCodes : null,
        token_id: tokenId,
        metadata_uri: metadataUri,
        isbn: isbn.trim() || null,
        publish_date: publishDate.trim() || null,
        publisher: publisher.trim() || null,
        language: language.trim() || null,
        edition: edition.trim() || null,
        page_count: pageCount.trim() ? parseInt(pageCount.trim()) : null,
        tags: tags.length > 0 ? tags : null,
        external_url: externalUrl.trim() || null
      };
      
      const response = await fetch(API_ENDPOINTS.BOOKMARKS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(bookmarkData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bookmark');
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error creating bookmark in database:', err);
      throw err;
    }
  };
  
  // Main submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!author.trim()) {
      setError('Author is required');
      return;
    }
    
    if (!sessionToken) {
      setError('You must be logged in to create a bookmark');
      return;
    }
    
    if (!contractReady) {
      setError('BookmarkNFT contract is not available. Please try again later.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setMintingStep(1);
    
    try {
      // Step 1: Create metadata object
      const metadata = createMetadata();
      setTransactionStatus('Creating metadata...');
      
      // Step 2: Store metadata in Supabase
      setMintingStep(2);
      const metadataUri = await storeMetadata(metadata, 'pending');
      setTransactionStatus(`Metadata stored. URI: ${metadataUri}`);
      
      // Step 3: Mint NFT
      setMintingStep(3);
      const tokenId = await mintNFT(metadataUri);
      
      // Step 4: Update metadata with actual tokenId
      setMintingStep(4);
      setTransactionStatus('Updating metadata with token ID...');
      await storeMetadata(metadata, tokenId);
      
      // Step 5: Create bookmark in database
      setMintingStep(5);
      setTransactionStatus('Creating bookmark record...');
      const newBookmark = await createBookmarkInDB(tokenId, metadataUri);
      
      // Reset form
      setTitle('');
      setAuthor('');
      setDescription('');
      setCoverUrl('');
      setBisacCodes([]);
      setIsbn('');
      setPublishDate('');
      setPublisher('');
      setLanguage('');
      setEdition('');
      setPageCount('');
      setTags([]);
      setExternalUrl('');
      
      // Complete
      setMintingStep(6);
      setTransactionStatus('Bookmark NFT created successfully!');
      
      // Notify parent component
      if (onSuccess) {
        onSuccess(newBookmark);
      }
    } catch (err) {
      console.error('Error creating bookmark NFT:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bookmark NFT');
      setTransactionStatus('Error creating bookmark NFT. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bookmark-form-container">
      <h2>Create Bookmark NFT</h2>
      
      {!contractReady && (
        <div className="alert alert-warning">
          Initializing BookmarkNFT contract. Please wait...
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}
      
      {transactionHash && (
        <div className="alert alert-success">
          <p>Transaction submitted: <a 
            href={`https://basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on BaseScan
          </a></p>
          <p>{transactionStatus}</p>
        </div>
      )}
      
      {mintingStep > 0 && mintingStep < 6 && (
        <div className="minting-progress">
          <div className="progress-steps">
            {[1, 2, 3, 4, 5].map((step) => (
              <div 
                key={step}
                className={`step ${mintingStep >= step ? 'active' : ''}`}
              >
                <div className="step-number">{step}</div>
                <div className="step-label">
                  {step === 1 && 'Metadata'}
                  {step === 2 && 'Storage'}
                  {step === 3 && 'Minting'}
                  {step === 4 && 'Updating'}
                  {step === 5 && 'Finalizing'}
                </div>
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${(mintingStep - 1) * 25}%` }} 
            />
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          {/* Required Fields Section */}
          <div className="section-header">
            <h3>Required Information</h3>
          </div>
          
          <div className="form-group">
            <label htmlFor="title">Book Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter book title"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="author">Author *</label>
            <input
              id="author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Enter book author"
              required
            />
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter book description"
              rows={4}
            />
          </div>
          
          <div className="form-group full-width">
            <label htmlFor="coverUrl">Cover Image URL</label>
            <input
              id="coverUrl"
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {coverUrl && (
              <div className="image-preview">
                <img 
                  src={coverUrl} 
                  alt="Cover preview" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Additional Metadata Section */}
          <div className="section-header">
            <h3>Additional Metadata</h3>
          </div>
          
          <div className="form-group">
            <label htmlFor="isbn">ISBN</label>
            <input
              id="isbn"
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="e.g., 978-3-16-148410-0"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="publisher">Publisher</label>
            <input
              id="publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Publishing company name"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="publishDate">Publish Date</label>
            <input
              id="publishDate"
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="language">Language</label>
            <input
              id="language"
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g., English"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="edition">Edition</label>
            <input
              id="edition"
              type="text"
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              placeholder="e.g., First Edition"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="pageCount">Page Count</label>
            <input
              id="pageCount"
              type="number"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              placeholder="Number of pages"
              min="1"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="externalUrl">External URL</label>
            <input
              id="externalUrl"
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com/book-page"
            />
          </div>
          
          {/* Tags Section */}
          <div className="form-group full-width">
            <label htmlFor="tags">Tags</label>
            <div className="tag-input">
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tags (press Enter or click Add)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={addTag}
                className="btn-secondary"
              >
                Add
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="tag-list">
                {tags.map((tag, index) => (
                  <div key={index} className="tag">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="tag-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* BISAC Selector */}
          <div className="form-group full-width">
            <BisacSelector 
              selectedCodes={bisacCodes}
              onChange={setBisacCodes}
            />
          </div>
        </div>
        
        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting || !contractReady}
            className="btn-primary"
          >
            {isSubmitting ? 'Creating NFT...' : 'Create Bookmark NFT'}
          </button>
        </div>
      </form>
      
      {/* Information about NFTs */}
      <div className="info-box">
        <h4>About Bookmark NFTs</h4>
        <p>
          Creating a Bookmark NFT will:
        </p>
        <ul>
          <li>Mint a unique NFT on the Base blockchain</li>
          <li>Store the book's metadata securely</li>
          <li>Allow others to stake tokens on your bookmark</li>
          <li>Make your bookmark eligible for the weekly leaderboard</li>
        </ul>
        <p>
          Gas fees will apply for the minting transaction.
        </p>
      </div>
    </div>
  );
};
