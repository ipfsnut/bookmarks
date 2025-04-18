import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';

export const UserProfile = () => {
  const { userId, isAuthenticated } = useWallet();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Simplified version for now, just to get things working
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated || !userId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Just use the userId for now until we implement the API properly
        setUserProfile({
          id: userId,
          walletAddress: 'Loading...',
          username: 'User',
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error loading user data:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [isAuthenticated, userId]);
  
  if (isLoading) {
    return <div>Loading profile...</div>;
  }
  
  if (error) {
    return <div className="error">Error: {error.message}</div>;
  }
  
  if (!userProfile) {
    return <div>No user profile found.</div>;
  }
  
  return (
    <div className="user-profile">
      <h2>Your Profile</h2>
      
      <div className="profile-details">
        <p><strong>User ID:</strong> {userProfile.id}</p>
        {userProfile.walletAddress && (
          <p><strong>Wallet Address:</strong> {userProfile.walletAddress}</p>
        )}
        {userProfile.username && (
          <p><strong>Username:</strong> {userProfile.username}</p>
        )}
        <p><strong>Joined:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};