import React, { useState, useEffect } from 'react';
import { searchBisacCodes, getMainCategories, BisacCode, BisacCategory } from '../services/bisac.service';

interface BisacSelectorProps {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
}

export const BisacSelector: React.FC<BisacSelectorProps> = ({ selectedCodes, onChange }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<BisacCode[]>([]);
  const [categories, setCategories] = useState<BisacCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoryResults, setCategoryResults] = useState<BisacCode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getMainCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error loading BISAC categories:', error);
      }
    };
    
    loadCategories();
  }, []);
  
  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const results = await searchBisacCodes(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching BISAC codes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timer = setTimeout(performSearch, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Handle category selection
  useEffect(() => {
    const loadCategoryResults = async () => {
      if (!selectedCategory) {
        setCategoryResults([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const results = await getCodesByCategory(selectedCategory);
        setCategoryResults(results);
      } catch (error) {
        console.error('Error loading category codes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCategoryResults();
  }, [selectedCategory]);
  
  // Handle code selection
  const handleCodeSelect = (code: string) => {
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter(c => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };
  
  return (
    <div className="bisac-selector">
      <h3 className="text-lg font-medium mb-3">BISAC Categories</h3>
      
      {/* Search input */}
      <div className="mb-4">
        <label htmlFor="bisac-search" className="block text-sm font-medium text-gray-700 mb-1">
          Search BISAC codes
        </label>
        <input
          id="bisac-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter at least 3 characters to search"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>
      
      {/* Category dropdown */}
      <div className="mb-4">
        <label htmlFor="bisac-category" className="block text-sm font-medium text-gray-700 mb-1">
          Browse by category
        </label>
        <select
          id="bisac-category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category.name} value={category.name}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center py-2">
          <div className="inline-block animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
          Loading...
        </div>
      )}
      
      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Search Results</h4>
          <div className="max-h-60 overflow-y-auto border rounded-md p-2">
            {searchResults.map(code => (
              <div 
                key={code.code} 
                className={`p-2 cursor-pointer hover:bg-gray-100 rounded ${
                  selectedCodes.includes(code.code) ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleCodeSelect(code.code)}
              >
                <div className="text-sm font-medium">{code.code}</div>
                <div className="text-xs text-gray-600">{code.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Category results */}
      {categoryResults.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Category: {selectedCategory}</h4>
          <div className="max-h-60 overflow-y-auto border rounded-md p-2">
            {categoryResults.map(code => (
              <div 
                key={code.code} 
                className={`p-2 cursor-pointer hover:bg-gray-100 rounded ${
                  selectedCodes.includes(code.code) ? 'bg-blue-100' : ''
                }`}
                onClick={() => handleCodeSelect(code.code)}
              >
                <div className="text-sm font-medium">{code.code}</div>
                <div className="text-xs text-gray-600">{code.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected codes */}
      {selectedCodes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Categories</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCodes.map(code => {
              const codeObj = [...searchResults, ...categoryResults].find(c => c.code === code);
              return (
                <div 
                  key={code}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
                >
                  <span>{codeObj ? codeObj.description : code}</span>
                  <button 
                    type="button"
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    onClick={() => handleCodeSelect(code)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get codes by category
async function getCodesByCategory(category: string): Promise<BisacCode[]> {
  try {
    const response = await fetch(
      `/.netlify/functions/bisac-codes?type=by_category&q=${encodeURIComponent(category)}`
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
}