export const AUTH_CONSTANTS = {
  SESSION_TOKEN_KEY: 'bookmarks_session_token',
  SESSION_DURATION_DAYS: 7,
};

export const TOKEN_CONSTANTS = {
  WELCOME_BONUS: 5,
  BOOK_ADDITION_REWARD: 10,
  AUTHOR_VERIFICATION_REWARD: 50,
};

export const API_ENDPOINTS = {
  AUTH: '/.netlify/functions/auth',
  USER: '/.netlify/functions/user',
  TOKEN_BALANCE: '/.netlify/functions/token-balance',
  AWARD_TOKENS: '/.netlify/functions/award-tokens',
};