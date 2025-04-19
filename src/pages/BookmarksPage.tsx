import { useState } from 'react';
import { BookmarkList } from '../components/BookmarkList';
import { BookmarkForm } from '../components/BookmarkForm';
import { useWallet } from '../contexts/WalletContext';

export const BookmarksPage = () => {
  const { isAuthenticated } = useWallet();
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const handleBookmarkAdded = () => {
    // Close the form
    setShowAddForm(false);
    
    // Trigger a refresh of the bookmark list
    setRefreshTrigger(prev => prev + 1);
    
    // Switch to "My Bookmarks" tab
    setActiveTab('mine');
  };
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: 0 }}>Bookmarks</h1>
        
        {isAuthenticated && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>+</span>
            <span>Add Bookmark</span>
          </button>
        )}
      </div>
      
      {showAddForm && (
        <div style={{ marginBottom: '30px' }}>
          <BookmarkForm 
            onSuccess={handleBookmarkAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
      
      {isAuthenticated && (
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'all' ? '#007bff' : '#e9ecef',
              color: activeTab === 'all' ? 'white' : '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: activeTab === 'all' ? 'bold' : 'normal'
            }}
          >
            All Bookmarks
          </button>
          
          <button
            onClick={() => setActiveTab('mine')}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === 'mine' ? '#007bff' : '#e9ecef',
              color: activeTab === 'mine' ? 'white' : '#212529',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: activeTab === 'mine' ? 'bold' : 'normal'
            }}
          >
            My Bookmarks
          </button>
        </div>
      )}
      
      <div key={refreshTrigger}>
        <BookmarkList 
          userOnly={activeTab === 'mine'} 
          limit={50}
        />
      </div>
    </div>
  );
};