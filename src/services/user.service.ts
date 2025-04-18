import { supabase } from '../config/supabase';
import { User, TokenBalance, TokenTransaction } from '../types/user.types';
import { AUTH_CONSTANTS, API_ENDPOINTS } from '../config/constants';

/**
 * Gets the current user's profile
 */
export const getUserProfile = async (): Promise<User | null> => {
  const sessionToken = localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
  
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(API_ENDPOINTS.USER, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    walletAddress: data.wallet_address,
    fid: data.fid || undefined,
    username: data.username || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Updates the current user's profile
 */
export const updateUserProfile = async (
  updates: Partial<Pick<User, 'username' | 'fid'>>
): Promise<User | null> => {
  const sessionToken = localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
  
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(API_ENDPOINTS.USER, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }
  
  const data = await response.json();
  
  return {
    id: data.id,
    walletAddress: data.wallet_address,
    fid: data.fid || undefined,
    username: data.username || undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * Gets the current user's token balance
 */
export const getTokenBalance = async (): Promise<number> => {
  const sessionToken = localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
  
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(API_ENDPOINTS.TOKEN_BALANCE, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch token balance');
  }
  
  const data = await response.json();
  return data.balance;
};

/**
 * Gets the current user's token transactions
 */
export const getTokenTransactions = async (): Promise<TokenTransaction[]> => {
  const sessionToken = localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
  
  if (!sessionToken) {
    throw new Error('Not authenticated');
  }
  
  const { data, error } = await supabase
    .from('token_transactions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw error;
  }
  
  return data.map(tx => ({
    id: tx.id,
    userId: tx.user_id,
    amount: tx.amount,
    type: tx.type as 'credit' | 'debit',
    reason: tx.reason,
    createdAt: tx.created_at,
  }));
};