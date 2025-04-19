import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { API_ENDPOINTS } from '../config/constants';
import { BisacSelector } from './BisacSelector';

interface BookmarkFormProps {
  onSuccess?: (bookmark: any) => void;
  onCancel?: () => void;
}

export const BookmarkForm = ({ onSuccess, onCancel }: BookmarkFormProps) => {
  const { sessionToken } = useWallet();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bisacCodes, setBisacCodes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const bookmarkData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        cover_url: coverUrl.trim() || null,
        bisac_codes: bisacCodes.length > 0 ? bisacCodes : null
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
      
      const newBookmark = await response.json();
      
      // Reset form
      setTitle('');
      setAuthor('');
      setDescription('');
      setCoverUrl('');
      setBisacCodes([]);
      
      // Notify parent component
      if (onSuccess) {
        onSuccess(newBookmark);
      }
    } catch (err) {
      console.error('Error creating bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to create bookmark');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bookmark-form-container" style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginTop: 0, color: '#343a40' }}>Add New Bookmark</h2>
      
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="title"
            style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: 'bold'
            }}
          >
            Book Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter book title"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ced4da'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="author"
            style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: 'bold'
            }}
          >
            Author *
          </label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter book author"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ced4da'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label 
            htmlFor="description"
            style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: 'bold'
            }}
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter book description"
            rows={4}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="coverUrl"
            style={{ 
              display: 'block', 
              marginBottom: '5px',
              fontWeight: 'bold'
            }}
          >
            Cover Image URL
          </label>
          <input
            id="coverUrl"
            type="url"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ced4da'
            }}
          />
          {coverUrl && (
            <div style={{ marginTop: '10px' }}>
              <img 
                src={coverUrl} 
                alt="Cover preview" 
                style={{ 
                  maxWidth: '100px', 
                  maxHeight: '150px',
                  border: '1px solid #ddd'
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
        
        {/* BISAC Selector */}
        <div style={{ marginBottom: '20px' }}>
          <BisacSelector 
            selectedCodes={bisacCodes}
            onChange={setBisacCodes}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '10px 15px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '10px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Adding...' : 'Add Bookmark'}
          </button>
        </div>
      </form>
    </div>
  );
};