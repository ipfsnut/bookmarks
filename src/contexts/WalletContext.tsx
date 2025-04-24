import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { supabase } from '../config/supabase';
import { generateNonce, validateSession, createSession, deleteSession } from '../services/auth.service';
import { AUTH_CONSTANTS, API_ENDPOINTS } from '../config/constants';

// Define the shape of our context
interface WalletContextType {
  address: string | undefined;
  isConnected: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  userId: string | null;
  sessionToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Create the context with a default value
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get wallet information from wagmi
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // Local state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string>('');

  // Initialize - check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Check if we have a session token in localStorage
        const storedToken = localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
        
        if (storedToken) {
          // Validate the session token
          const { valid, userId: validUserId, walletAddress } = await validateSession(storedToken);
          
          if (valid && validUserId && walletAddress && address) {
            // Verify the session belongs to the connected wallet
            if (walletAddress.toLowerCase() === address.toLowerCase()) {
              setUserId(validUserId);
              setSessionToken(storedToken);
              setIsAuthenticated(true);
            } else {
              // Connected wallet doesn't match session
              localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
              await deleteSession(storedToken);
            }
          } else {
            // Invalid or expired session
            localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
          }
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Generate a new nonce for signing
    setNonce(generateNonce());
    
    // Only check auth if wallet is connected
    if (isConnected && address) {
      checkAuth();
    } else {
      setIsAuthenticated(false);
      setUserId(null);
      setSessionToken(null);
      setIsLoading(false);
    }
  }, [address, isConnected]);

  // Sign in function
  const signIn = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const message = `Sign this message to authenticate with Bookmarks: ${nonce}`;
      
      // Request signature from wallet
      const signature = await signMessageAsync({ message });
      
      // Verify signature on server and handle user creation/lookup
      const verifyResponse = await fetch(API_ENDPOINTS.AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: address.toLowerCase(), 
          signature, 
          message 
        }),
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      const responseData = await verifyResponse.json();
      
      // If we got a successful response, consider the user authenticated
      if (responseData.success) {
        // Save session token if provided
        if (responseData.token) {
          localStorage.setItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY, responseData.token);
          setSessionToken(responseData.token);
        }
        
        // Set user ID if provided
        if (responseData.userId) {
          setUserId(responseData.userId);
        }
        
        setIsAuthenticated(true);
        
        // Generate new nonce for next sign-in
        setNonce(generateNonce());
      } else {
        throw new Error('Authentication failed without specific error');
      }
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };
  // Sign out function
  const signOut = async () => {
    if (sessionToken) {
      try {
        await deleteSession(sessionToken);
      } catch (err) {
        console.error('Error deleting session:', err);
      }
    }
    
    localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
    setIsAuthenticated(false);
    setUserId(null);
    setSessionToken(null);
  };

  // Context value
  const value = {
    address,
    isConnected,
    isAuthenticated,
    isLoading,
    error,
    userId,
    sessionToken,
    signIn,
    signOut,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};