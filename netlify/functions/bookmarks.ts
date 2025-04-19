import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../src/types/database.types';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in bookmarks function');
}

const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: { persistSession: false },
  }
);

const handler: Handler = async (event) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // Verify authentication
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required' })
    };
  }

  try {
    console.log('Function environment:', { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseServiceKey,
      nodeEnv: process.env.NODE_ENV
    });
    
    // For development, use mock data if Supabase is not configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Using mock data for bookmarks function');
      
      if (event.httpMethod === 'GET') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            bookmarks: [
              {
                id: 'mock-1',
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                description: 'A novel about the American Dream.',
                cover_url: 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg',
                added_by: 'dev-user-123',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                total_delegations: 12
              },
              {
                id: 'mock-2',
                title: '1984',
                author: 'George Orwell',
                description: 'A dystopian novel about totalitarianism.',
                cover_url: 'https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg',
                added_by: 'dev-user-123',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                total_delegations: 8
              }
            ]
          })
        };
      }
      
      if (event.httpMethod === 'POST') {
        const bookmarkData = JSON.parse(event.body || '{}');
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            id: 'mock-new',
            ...bookmarkData,
            added_by: 'dev-user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        };
      }
    }
    
    // Decode token to get user ID
    const tokenParts = Buffer.from(token, 'base64').toString().split(':');
    const userId = tokenParts[0];
    
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    console.log('Bookmarks function called with method:', event.httpMethod);
    
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET': {
        // Get bookmarks (either all bookmarks or user's bookmarks)
        const userOnly = event.queryStringParameters?.userOnly === 'true';
        const sortBy = event.queryStringParameters?.sortBy || 'created_at';
        const limit = parseInt(event.queryStringParameters?.limit || '50');
        
        console.log('Fetching bookmarks with params:', { userOnly, sortBy, limit });
        
        let query = supabase
          .from('books')
          .select(`
            *,
            stakes(id, amount, user_id)
          `);
          
        if (userOnly) {
          query = query.eq('added_by', userId);
        }
        
        // Apply sorting - avoid using total_delegations column which doesn't exist
        query = query.order('created_at', { ascending: false });
        
        // Apply limit
        query = query.limit(limit);
        
        const { data, error } = await query;

        if (error) {
          console.error('Error fetching bookmarks:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error fetching bookmarks' })
          };
        }

        // Process the data to calculate total delegations
        const processedData = data?.map(bookmark => {
          // Calculate total delegations from stakes
          const totalDelegations = bookmark.stakes?.reduce((sum, stake) => 
            sum + (typeof stake.amount === 'number' ? stake.amount : 0), 0) || 0;
          
          // Create a new object without the stakes array
          const { stakes, ...bookmarkWithoutStakes } = bookmark;
          
          return {
            ...bookmarkWithoutStakes,
            total_delegations: totalDelegations
          };
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ bookmarks: processedData || [] })
        };
      }

      case 'POST': {
        // Create a new bookmark
        const bookmarkData = JSON.parse(event.body || '{}');
        
        console.log('Creating bookmark with data:', bookmarkData);
        
        // Validate required fields
        if (!bookmarkData.title) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Title is required' })
          };
        }
        
        if (!bookmarkData.author) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Author is required' })
          };
        }
        
        // Prepare bookmark data matching the schema
        const newBookmark = {
          title: bookmarkData.title,
          author: bookmarkData.author,
          description: bookmarkData.description || null,
          cover_url: bookmarkData.cover_url || null,
          added_by: userId
        };
        
        const { data, error } = await supabase
          .from('books')
          .insert([newBookmark])
          .select()
          .single();

        if (error) {
          console.error('Error creating bookmark:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error creating bookmark' })
          };
        }

        console.log('Bookmark created successfully:', data);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data)
        };
      }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Bookmarks function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler };