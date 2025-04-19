// Base URL for API endpoints
const API_BASE = '/.netlify/functions';

export const AUTH_CONSTANTS = {
  SESSION_TOKEN_KEY: 'bookmarks_session_token',
  NONCE_LENGTH: 16,
  SESSION_DURATION_DAYS: 7 // Session duration in days
};

export const TOKEN_CONSTANTS = {
  WELCOME_BONUS: 5,
  DAILY_LIMIT: 100,
  TRANSACTION_TYPES: {
    WELCOME: 'welcome',
    STAKE: 'stake',
    REWARD: 'reward',
    ADMIN: 'admin'
  }
};

export const API_ENDPOINTS = {
  AUTH: `${API_BASE}/auth`,
  USER: `${API_BASE}/user`,
  TOKEN_BALANCE: `${API_BASE}/token-balance`,
  AWARD_TOKENS: `${API_BASE}/award-tokens`,
  BOOKMARKS: `${API_BASE}/bookmarks`
};// Contract Constants - to be filled with actual addresses when deployed
export const CONTRACT_CONSTANTS = {
  BOOKMARK_CONTRACT_ADDRESS: import.meta.env.VITE_BOOKMARK_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000'};