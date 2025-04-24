import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
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

// Interface for MetaMask errors
interface MetaMaskError extends Error {
  code?: number;
  reason?: string;
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
  
  // Refs to track ongoing operations
  const isSigningInRef = useRef(false);
  const authCheckInProgressRef = useRef(false);

  // Initialize - check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      // Prevent multiple simultaneous auth checks
      if (authCheckInProgressRef.current) return;
      authCheckInProgressRef.current = true;
      
      setIsLoading(true);
      setError(null);
      
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
              try {
                await deleteSession(storedToken);
              } catch (err) {
                console.warn('Error deleting mismatched session:', err);
              }
              setIsAuthenticated(false);
              setUserId(null);
              setSessionToken(null);
            }
          } else {
            // Invalid or expired session
            localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
            setIsAuthenticated(false);
            setUserId(null);
            setSessionToken(null);
          }
        } else {
          // No stored token
          setIsAuthenticated(false);
          setUserId(null);
          setSessionToken(null);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
        localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
        setIsAuthenticated(false);
        setUserId(null);
        setSessionToken(null);
      } finally {
        setIsLoading(false);
        authCheckInProgressRef.current = false;
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
    
    // Cleanup function
    return () => {
      // No active connections to clean up in this effect
    };
  }, [address, isConnected]);

  // Sign in function with improved error handling and race condition prevention
  const signIn = async () => {
    // Prevent multiple simultaneous sign-in attempts
    if (isSigningInRef.current) {
      console.log('Sign-in already in progress, ignoring duplicate request');
      return;
    }
    
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }
    
    isSigningInRef.current = true;
    setIsLoading(true);
    setError(null);
    
    try {
      const message = `Sign this message to authenticate with Bookmarks: ${nonce}`;
      
      // Request signature from wallet
      console.log('Requesting signature for message:', message);
      const signature = await signMessageAsync({ message });
      console.log('Signature received:', signature.substring(0, 10) + '...');
      
      // Verify signature on server and handle user creation/lookup
      console.log('Sending verification request to server');
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
      console.log('Server verification response received');
      
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
        console.log('Authentication successful');
      } else {
        throw new Error('Authentication failed without specific error');
      }
    } catch (err) {
      console.error('Error signing in:', err);
      
      // Check for specific error types with proper type checking
      if (typeof err === 'object' && err !== null) {
        const metaMaskErr = err as MetaMaskError;
        if (metaMaskErr.code === 4001) {
          console.log('User rejected signature request');
          setError(new Error('Signature request was rejected'));
        } else {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } else {
        setError(new Error('Unknown error'));
      }
      
      // Clear any partial authentication state
      setIsAuthenticated(false);
      setUserId(null);
      setSessionToken(null);
    } finally {
      setIsLoading(false);
      isSigningInRef.current = false;
    }
  };

  // Sign out function with improved error handling
  const signOut = async () => {
    setIsLoading(true);
    
    try {
      if (sessionToken) {
        try {
          await deleteSession(sessionToken);
          console.log('Session deleted successfully');
        } catch (err) {
          console.error('Error deleting session:', err);
          // Continue with local cleanup even if server deletion fails
        }
      }
      
      localStorage.removeItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
      setIsAuthenticated(false);
      setUserId(null);
      setSessionToken(null);
      console.log('Signed out successfully');
    } catch (err) {
      console.error('Error during sign out:', err);
      setError(err instanceof Error ? err : new Error('Unknown error during sign out'));
    } finally {
      setIsLoading(false);
    }
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