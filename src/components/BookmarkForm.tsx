import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { API_ENDPOINTS } from '../config/constants';

interface BookmarkFormProps {
  onSuccess?: (bookmark: any) => void;
  onCancel?: () => void;
}

// Define the enhanced metadata fields
interface MetadataField {
  key: string;
  value: string;
}

export const BookmarkForm = ({ onSuccess, onCancel }: BookmarkFormProps) => {
  const { sessionToken } = useWallet();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [isbn, setIsbn] = useState('');
  const [genres, setGenres] = useState('');
  const [tags, setTags] = useState('');
  const [metadataFields, setMetadataFields] = useState<MetadataField[]>([{ key: '', value: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Handle adding a new metadata field
  const addMetadataField = () => {
    setMetadataFields([...metadataFields, { key: '', value: '' }]);
  };
  
  // Handle removing a metadata field
  const removeMetadataField = (index: number) => {
    const updatedFields = [...metadataFields];
    updatedFields.splice(index, 1);
    setMetadataFields(updatedFields);
  };
  
  // Handle metadata field changes
  const handleMetadataChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedFields = [...metadataFields];
    updatedFields[index][field] = value;
    setMetadataFields(updatedFields);
  };
  
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
      // Process metadata fields into an object
      const metadata: Record<string, string> = {};
      metadataFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          metadata[field.key.trim()] = field.value.trim();
        }
      });
      
      // Process genres and tags into arrays
      const genresArray = genres.split(',').map(g => g.trim()).filter(g => g);
      const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      
      const bookmarkData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        cover_url: coverUrl.trim() || null,
        publisher: publisher.trim() || null,
        publish_date: publishDate.trim() || null,
        isbn: isbn.trim() || null,
        genres: genresArray.length > 0 ? genresArray : null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null
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
      setPublisher('');
      setPublishDate('');
      setIsbn('');
      setGenres('');
      setTags('');
      setMetadataFields([{ key: '', value: '' }]);
      setShowAdvanced(false);
      
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
      maxWidth: '800px', 
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
        {/* Basic Information */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Basic Information</h3>
          
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
          
          <div style={{ marginBottom: '15px' }}>
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
        </div>
        
        {/* Toggle for advanced options */}
        <div 
          style={{ 
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold' }}>
              {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </span>
            <span>{showAdvanced ? '▲' : '▼'}</span>
          </div>
        </div>
        
        {/* Advanced Options */}
        {showAdvanced && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#495057' }}>Publication Details</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="publisher"
                style={{ 
                  display: 'block', 
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                Publisher
              </label>
              <input
                id="publisher"
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Enter publisher name"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="publishDate"
                style={{ 
                  display: 'block', 
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                Publication Date
              </label>
              <input
                id="publishDate"
                type="text"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                placeholder="YYYY-MM-DD or YYYY"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="isbn"
                style={{ 
                  display: 'block', 
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                ISBN
              </label>
              <input
                id="isbn"
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="Enter ISBN (10 or 13 digits)"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da'
                }}
              />
            </div>
            
            <h3 style={{ fontSize: '18px', marginBottom: '15px', marginTop: '25px', color: '#495057' }}>Categories</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="genres"
                style={{ 
                  display: 'block', 
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                Genres
              </label>
              <input
                id="genres"
                type="text"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="Fiction, Fantasy, Science Fiction (comma separated)"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da'
                }}
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#6c757d' }}>
                Separate multiple genres with commas
              </small>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label 
                htmlFor="tags"
                style={{ 
                  display: 'block', 
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}
              >
                Tags
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="bestseller, award-winner, classic (comma separated)"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da'
                }}
              />
              <small style={{ display: 'block', marginTop: '5px', color: '#6c757d' }}>
                Separate multiple tags with commas
              </small>
            </div>
            
            <h3 style={{ fontSize: '18px', marginBottom: '15px', marginTop: '25px', color: '#495057' }}>Additional Metadata</h3>
            
            {metadataFields.map((field, index) => (
              <div key={index} style={{ 
                marginBottom: '15px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={field.key}
                    onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
                    placeholder="Field name (e.g., 'websiteUrl')"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      marginBottom: '5px'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
                    placeholder="Value (e.g., 'https://example.com')"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #ced4da',
                      marginBottom: '5px'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMetadataField(index)}
                  style={{
                    padding: '10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMetadataField}
              style={{
                padding: '8px 15px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '15px'
              }}
            >
              + Add Metadata Field
            </button>
            
            <small style={{ display: 'block', marginTop: '5px', color: '#6c757d' }}>
              Add custom metadata like websiteUrl, podcastUrl, youtubeChannelId, etc.
            </small>
          </div>
        )}
        
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
