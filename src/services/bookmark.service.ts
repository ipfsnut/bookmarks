import { Bookmark, BookmarkInput } from '../types/bookmark.types';
import { AUTH_CONSTANTS } from '../config/constants';

// Helper to get the session token
const getSessionToken = (): string | null => {
  return localStorage.getItem(AUTH_CONSTANTS.SESSION_TOKEN_KEY);
};

// Helper to add auth headers if a token exists
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Fetch a single bookmark by ID
export const fetchBookmarkById = async (id: string): Promise<Bookmark> => {
  try {
    // For viewing bookmarks, we don't need to include auth headers
    // The serverless function will allow public access for GET requests
    const response = await fetch(`/.netlify/functions/bookmarks?id=${id}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch bookmark');
    }
    
    const data = await response.json();
    return data.bookmark;
  } catch (error) {
    console.error('Error fetching bookmark:', error);
    throw error;
  }
};

// Fetch all bookmarks
export const fetchAllBookmarks = async (userOnly: boolean = false): Promise<Bookmark[]> => {
  try {
    let url = '/.netlify/functions/bookmarks';
    let headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    // If fetching user-specific bookmarks, we need to include auth headers
    // and add the userOnly parameter
    if (userOnly) {
      url += '?userOnly=true';
      const token = getSessionToken();
      if (!token) {
        throw new Error('Authentication required to view your bookmarks');
      }
      
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch bookmarks');
    }
    
    const data = await response.json();
    return data.bookmarks;
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    throw error;
  }
};

// Add a new bookmark
export const addBookmark = async (bookmarkData: BookmarkInput): Promise<Bookmark> => {
  try {
    // For adding bookmarks, we need authentication
    const token = getSessionToken();
    if (!token) {
      throw new Error('Authentication required to add a bookmark');
    }
    
    const response = await fetch('/.netlify/functions/bookmarks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookmarkData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add bookmark');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    throw error;
  }
};

// Update an existing bookmark
export const updateBookmark = async (id: string, bookmarkData: Partial<BookmarkInput>): Promise<Bookmark> => {
  try {
    // For updating bookmarks, we need authentication
    const token = getSessionToken();
    if (!token) {
      throw new Error('Authentication required to update a bookmark');
    }
    
    const response = await fetch(`/.netlify/functions/bookmarks?id=${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(bookmarkData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update bookmark');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating bookmark:', error);
    throw error;
  }
};

// Delete a bookmark
export const deleteBookmark = async (id: string): Promise<void> => {
  try {
    // For deleting bookmarks, we need authentication
    const token = getSessionToken();
    if (!token) {
      throw new Error('Authentication required to delete a bookmark');
    }
    
    const response = await fetch(`/.netlify/functions/bookmarks?id=${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete bookmark');
    }
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    throw error;
  }
};