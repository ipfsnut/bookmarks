import { Handler } from '@netlify/functions';
import fs from 'fs';
import path from 'path';

// Define the data structure type
interface BisacData {
  codes: Array<{
    code: string;
    description: string;
    mainCategory: string;
    subCategory: string | null;
    level: number;
  }>;
  categories: Array<{
    name: string;
    count: number;
  }>;
}

// Define the type for a single BISAC code
type BisacCode = BisacData['codes'][0];

// Define the type for a category
type BisacCategory = BisacData['categories'][0];

// Load the BISAC codes data
let bisacData: BisacData | null = null;

const loadBisacData = (): BisacData => {
  if (bisacData) return bisacData;
  
  try {
    // Try multiple possible paths for the file
    let dataPath;
    const possiblePaths = [
      // Path for local development
      path.join(__dirname, '../../public/data/bisac-codes.json'),
      // Path for Netlify functions-serve
      path.join(process.cwd(), 'public/data/bisac-codes.json'),
      // Another possible path
      path.join(__dirname, '../../../public/data/bisac-codes.json')
    ];
    
    // Try each path until we find one that exists
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          dataPath = p;
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    if (!dataPath) {
      throw new Error('Could not find BISAC codes data file');
    }
    
    console.log('Loading BISAC data from:', dataPath);
    const rawData = fs.readFileSync(dataPath, 'utf8');
    bisacData = JSON.parse(rawData);
    return bisacData as BisacData;
  } catch (error) {
    console.error('Error loading BISAC data:', error);
    // Return a default empty structure instead of null
    return { codes: [], categories: [] };
  }
};
const handler: Handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const data = loadBisacData();
    const queryType = event.queryStringParameters?.type || 'search';
    const query = event.queryStringParameters?.q || '';
    const limit = parseInt(event.queryStringParameters?.limit || '50');
    
    let result: Array<BisacCode | BisacCategory> = [];
    
    switch (queryType) {
      case 'search':
        // Search by code or description
        if (query) {
          const lowerQuery = query.toLowerCase();
          result = data.codes.filter(code => 
            code.code.toLowerCase().includes(lowerQuery) || 
            code.description.toLowerCase().includes(lowerQuery)
          ).slice(0, limit);
        }
        break;
        
      case 'categories':
        // Get main categories
        result = data.categories;
        break;
        
      case 'by_category':
        // Get codes for a specific category
        if (query) {
          result = data.codes
            .filter(code => code.mainCategory === query)
            .slice(0, limit);
        }
        break;
        
      case 'by_codes':
        // Get specific codes
        if (query) {
          const codes = query.split(',');
          result = data.codes.filter(code => codes.includes(code.code));
        }
        break;
        
      default:
        // Return empty result for unknown query type
        result = [];
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ bisacCodes: result })
    };
  } catch (error) {
    console.error('BISAC codes function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler };