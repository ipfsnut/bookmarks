import { API_ENDPOINTS } from '../config/constants';

export interface BisacCode {
  code: string;
  description: string;
  mainCategory: string;
  subCategory: string | null;
  level: number;
}

export interface BisacCategory {
  name: string;
  count: number;
}

// Search BISAC codes
export const searchBisacCodes = async (query: string, limit = 50): Promise<BisacCode[]> => {
  if (query.length < 3) return [];
  
  try {
    const response = await fetch(
      `${API_ENDPOINTS.BISAC_CODES}?type=search&q=${encodeURIComponent(query)}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to search BISAC codes');
    }
    
    const data = await response.json();
    return data.bisacCodes || [];
  } catch (error) {
    console.error('Error searching BISAC codes:', error);
    return [];
  }
};

// Get main BISAC categories
export const getMainCategories = async (): Promise<BisacCategory[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.BISAC_CODES}?type=categories`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch BISAC categories');
    }
    
    const data = await response.json();
    return data.bisacCodes || [];
  } catch (error) {
    console.error('Error fetching BISAC categories:', error);
    return [];
  }
};

// Get codes for a specific category
export const getCodesByCategory = async (category: string, limit = 100): Promise<BisacCode[]> => {
  try {
    const response = await fetch(
      `${API_ENDPOINTS.BISAC_CODES}?type=by_category&q=${encodeURIComponent(category)}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch BISAC codes by category');
    }
    
    const data = await response.json();
    return data.bisacCodes || [];
  } catch (error) {
    console.error('Error fetching BISAC codes by category:', error);
    return [];
  }
};

// Get details for specific BISAC codes
export const getBisacCodeDetails = async (codes: string[]): Promise<BisacCode[]> => {
  if (codes.length === 0) return [];
  
  try {
    const response = await fetch(
      `${API_ENDPOINTS.BISAC_CODES}?type=by_codes&q=${encodeURIComponent(codes.join(','))}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch BISAC code details');
    }
    
    const data = await response.json();
    return data.bisacCodes || [];
  } catch (error) {
    console.error('Error fetching BISAC code details:', error);
    return [];
  }
};