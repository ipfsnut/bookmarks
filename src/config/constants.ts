export const AUTH_CONSTANTS = {
  SESSION_TOKEN_KEY: 'bookmarks_session_token',
  NONCE_LENGTH: 16,
  SESSION_DURATION: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
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
  AUTH: '/.netlify/functions/auth',
  USER: '/.netlify/functions/user',
  TOKEN_BALANCE: '/.netlify/functions/token-balance',
  AWARD_TOKENS: '/.netlify/functions/award-tokens'};