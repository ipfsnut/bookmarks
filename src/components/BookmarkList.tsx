import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { API_ENDPOINTS } from '../config/constants';

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
}

interface BookmarkListProps {
  userOnly?: boolean;
  limit?: number;
  sortBy?: 'created_at' | 'delegations';
}

export const BookmarkList = ({ 
  userOnly = false, 
  limit = 50,
  sortBy = 'created_at'
}: BookmarkListProps) => {
  const { sessionToken } = useWallet();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSort, setCurrentSort] = useState<'created_at' | 'delegations'>(
    sortBy === 'delegations' ? 'delegations' : 'created_at'
  );
  
  const fetchBookmarks = async () => {
    if (!sessionToken) {
      setIsLoading(false);
      setError('You must be logged in to view bookmarks');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (userOnly) queryParams.append('userOnly', 'true');
      queryParams.append('sortBy', currentSort);
      queryParams.append('limit', limit.toString());
      
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
  }, [sessionToken, userOnly, currentSort]);
  
  // Update currentSort if sortBy prop changes
  useEffect(() => {
    if (sortBy === 'delegations' || sortBy === 'created_at') {
      setCurrentSort(sortBy);
    }
  }, [sortBy]);
  
  const handleSortChange = (newSortBy: 'created_at' | 'delegations') => {
    setCurrentSort(newSortBy);
  };
  
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '0 auto',
          border: '4px solid rgba(0, 0, 0, 0.1)',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '20px' }}>Loading bookmarks...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '8px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <p style={{ marginBottom: '15px' }}><strong>Error:</strong> {error}</p>
        <button
          onClick={fetchBookmarks}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (bookmarks.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <p style={{ marginBottom: '15px' }}>
          {userOnly 
            ? "You haven't added any bookmarks yet." 
            : "No bookmarks found."}
        </p>
        <p>Be the first to add a bookmark!</p>
      </div>
    );
  }
  
  return (
    <div className="bookmark-list" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>
          {userOnly ? 'Your Bookmarks' : 'All Bookmarks'}
        </h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleSortChange('created_at')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentSort === 'created_at' ? '#007bff' : '#e9ecef',
              color: currentSort === 'created_at' ? 'white' : '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Newest
          </button>
          <button
            onClick={() => handleSortChange('delegations')}
            style={{
              padding: '8px 16px',
              backgroundColor: currentSort === 'delegations' ? '#007bff' : '#e9ecef',
              color: currentSort === 'delegations' ? 'white' : '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Most Popular
          </button>
        </div>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {bookmarks.map(bookmark => (
          <div 
            key={bookmark.id}
            style={{
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            {bookmark.cover_url ? (
              <div style={{ 
                height: '180px', 
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={bookmark.cover_url} 
                  alt={`Cover for ${bookmark.title}`}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Replace with placeholder on error
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x180?text=No+Cover';
                  }}
                />
              </div>
            ) : (
              <div style={{ 
                height: '180px', 
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6c757d'
              }}>
                No Cover Available
              </div>
            )}
            
            <div style={{ padding: '15px' }}>
              <h3 style={{ 
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#212529'
              }}>
                {bookmark.title}
              </h3>
              
              <p style={{ 
                margin: '0 0 12px 0',
                fontSize: '14px',
                color: '#6c757d'
              }}>
                by {bookmark.author}
              </p>
              
              {bookmark.description && (
                <p style={{ 
                  margin: '0 0 15px 0',
                  fontSize: '14px',
                  color: '#212529',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {bookmark.description}
                </p>
              )}
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '15px',
                fontSize: '14px',
                color: '#6c757d'
              }}>
                <span>
                  Added: {new Date(bookmark.created_at).toLocaleDateString()}
                </span>
                
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 'bold',
                  color: bookmark.total_delegations ? '#28a745' : '#6c757d'
                }}>
                  <span>🔖</span>
                  <span>{bookmark.total_delegations || 0}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};