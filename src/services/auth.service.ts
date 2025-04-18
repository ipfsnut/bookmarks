import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { AUTH_CONSTANTS } from '../config/constants';

/**
 * Generates a random nonce for wallet signature verification
 */
export const generateNonce = (): string => {
  return `${Math.floor(Math.random() * 1000000)}-${Date.now()}`;
};

/**
 * Generates a unique session token
 */
export const generateSessionToken = (): string => {
  return uuidv4();
};

/**
 * Creates a new session for a user
 */
export const createSession = async (userId: string, walletAddress: string): Promise<string> => {
  // Generate a unique session token
  const sessionToken = generateSessionToken();
  
  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_CONSTANTS.SESSION_DURATION_DAYS);
  
  // Store session in database
  const { error } = await supabase
    .from('sessions')
    .insert([{
      user_id: userId,
      wallet_address: walletAddress.toLowerCase(),
      token: sessionToken,
      expires_at: expiresAt.toISOString(),
    }]);
  
  if (error) throw error;
  
  // Return the session token
  return sessionToken;
};

/**
 * Validates a session token
 */
export const validateSession = async (sessionToken: string): Promise<{ 
  valid: boolean; 
  userId?: string;
  walletAddress?: string;
}> => {
  // Check if session exists and is not expired
  const { data, error } = await supabase
    .from('sessions')
    .select('user_id, wallet_address, expires_at')
    .eq('token', sessionToken)
    .single();
  
  if (error || !data) {
    return { valid: false };
  }
  
  // Check if session is expired
  if (new Date(data.expires_at) < new Date()) {
    // Delete expired session
    await supabase
      .from('sessions')
      .delete()
      .eq('token', sessionToken);
      
    return { valid: false };
  }
  
  return { 
    valid: true, 
    userId: data.user_id,
    walletAddress: data.wallet_address
  };
};

/**
 * Deletes a session
 */
export const deleteSession = async (sessionToken: string): Promise<void> => {
  await supabase
    .from('sessions')
    .delete()
    .eq('token', sessionToken);
};