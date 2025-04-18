import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { API_ENDPOINTS } from '../config/constants';

interface UserData {
  id: string;
  wallet_address: string;
  farcaster_id: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
  token_balance: number;
}

export const UserProfile = () => {
  const { isAuthenticated, sessionToken } = useWallet();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [farcasterId, setFarcasterId] = useState<string>('');

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated || !sessionToken) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('Fetching user data with token:', sessionToken ? 'present' : 'missing');
        const response = await fetch(API_ENDPOINTS.USER, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          }
        });

        console.log('User data response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('User data received:', data);
        setUserData(data);
        setUsername(data.username || '');
        setFarcasterId(data.farcaster_id || '');
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user profile');
      } finally {
        setIsLoading(false);
      }    };

    fetchUserData();
  }, [isAuthenticated, sessionToken]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !sessionToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.USER, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          username: username || null,
          farcaster_id: farcasterId || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedData = await response.json();
      setUserData(updatedData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="user-profile-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please connect your wallet and sign in to view your profile.</p>
      </div>
    );
  }

  if (isLoading && !userData) {
    return (
      <div className="user-profile-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="user-profile-container" style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
        <p>Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile-container" style={{ 
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginTop: 0, color: '#343a40' }}>User Profile</h2>
      
      {userData && (
        <div className="profile-details">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#6c757d', marginBottom: '5px' }}>Wallet Address</h3>
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#e9ecef', 
              borderRadius: '4px',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {userData.wallet_address}
            </div>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#6c757d', marginBottom: '5px' }}>Token Balance</h3>
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#e9ecef', 
              borderRadius: '4px',
              fontWeight: 'bold',
              color: '#28a745'
            }}>
              {userData.token_balance} TOKENS
            </div>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleSubmit} style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da'
                  }}
                  placeholder="Enter a username"
                />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Farcaster ID
                </label>
                <input
                  type="text"
                  value={farcasterId}
                  onChange={(e) => setFarcasterId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ced4da'
                  }}
                  placeholder="Enter your Farcaster ID"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                    flex: 1
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(userData.username || '');
                    setFarcasterId(userData.farcaster_id || '');
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
              
              {error && (
                <div style={{ 
                  color: '#dc3545', 
                  marginTop: '10px', 
                  padding: '10px', 
                  backgroundColor: '#f8d7da', 
                  borderRadius: '4px' 
                }}>
                  {error}
                </div>
              )}
            </form>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#6c757d', marginBottom: '5px' }}>Username</h3>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '4px'
                }}>
                  {userData.username || 'Not set'}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#6c757d', marginBottom: '5px' }}>Farcaster ID</h3>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '4px'
                }}>
                  {userData.farcaster_id || 'Not linked'}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', color: '#6c757d', marginBottom: '5px' }}>Member Since</h3>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '4px'
                }}>
                  {formatDate(userData.created_at)}
                </div>
              </div>
              
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '10px'
                }}
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};