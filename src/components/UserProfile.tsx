import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { API_ENDPOINTS } from '../config/constants';
import StakedBalance from './StakedBalance';

export const UserProfile = () => {
  const { isAuthenticated, sessionToken } = useWallet();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [username, setUsername] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Fetch user data
  const fetchUserData = async () => {
    if (!isAuthenticated || !sessionToken) {
      setIsLoading(false);
      return;
    }
    
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
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update user profile
  const updateProfile = async () => {
    if (!isAuthenticated || !sessionToken) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const response = await fetch(API_ENDPOINTS.USER, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          username: username.trim() || null
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error updating profile:', errorText);
        throw new Error('Failed to update profile');
      }
      
      const updatedData = await response.json();
      setUserData(updatedData);
      setIsEditing(false);
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Load user data on component mount
  useEffect(() => {
    fetchUserData();
  }, [isAuthenticated, sessionToken]);
  
  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  if (!isAuthenticated) {
    return (
      <div className="user-profile-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>Please connect your wallet and sign in to view your profile.</p>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="user-profile-container" style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="user-profile-container" style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
        <p>Error: {error}</p>
        <button 
          onClick={fetchUserData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Try Again
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
      <h2 style={{ marginTop: 0, color: '#343a40' }}>Your Profile</h2>
      
      {/* Wallet Address */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#495057', marginBottom: '8px' }}>Wallet Address</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          backgroundColor: '#e9ecef',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace'
        }}>
          <span style={{ flex: 1 }}>{userData?.wallet_address}</span>
          <button
            onClick={() => {
              if (userData?.wallet_address) {
                navigator.clipboard.writeText(userData.wallet_address);
                alert('Address copied to clipboard!');
              }
            }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Copy
          </button>
        </div>
      </div>
      
      {/* Username */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#495057', marginBottom: '8px' }}>Username</h3>
        
        {isEditing ? (
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter a username"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                marginBottom: '10px'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={updateProfile}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setUsername(userData?.username || '');
                }}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ 
              flex: 1,
              padding: '10px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              fontStyle: userData?.username ? 'normal' : 'italic',
              color: userData?.username ? '#212529' : '#6c757d'
            }}>
              {userData?.username || 'No username set'}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                marginLeft: '10px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Edit
            </button>
          </div>
        )}
        
        {saveSuccess && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: '#d4edda', 
            color: '#155724',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            Profile updated successfully!
          </div>
        )}
  </div>
      
  {/* Token Balance */}
  <div style={{ marginBottom: '20px' }}>
    <h3 style={{ fontSize: '16px', color: '#495057', marginBottom: '8px' }}>Token Balance</h3>
    <StakedBalance address={userData?.wallet_address} />
  </div>
      
      {/* Account Info */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#495057', marginBottom: '8px' }}>Account Info</h3>
        <div style={{ 
          padding: '10px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '5px' }}>
            <strong>Created:</strong> {new Date(userData?.created_at).toLocaleDateString()}
          </div>
          <div>
            <strong>Last Updated:</strong> {new Date(userData?.updated_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};