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
        // Handle GET request with mock data
        const bookmarkId = event.queryStringParameters?.id;
        
        if (bookmarkId) {
          // Return a single mock bookmark
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              bookmark: {
                id: bookmarkId,
                title: 'The Great Gatsby',
                author: 'F. Scott Fitzgerald',
                description: 'A novel about the American Dream.',
                cover_url: 'https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg',
                added_by: 'dev-user-123',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                total_delegations: 12
              }
            })
          };
        }
        
        // Return mock bookmarks list
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
        // For POST requests, we would normally require authentication
        // But for mock data, we'll just return a success response
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
    
    // Handle GET requests - allow public access
    if (event.httpMethod === 'GET') {
      const bookmarkId = event.queryStringParameters?.id;
      const userOnly = event.queryStringParameters?.userOnly === 'true';
      const sortBy = event.queryStringParameters?.sortBy || 'created_at';
      const limit = parseInt(event.queryStringParameters?.limit || '50');
      
      console.log('Fetching bookmarks with params:', { bookmarkId, userOnly, sortBy, limit });
      
      // If requesting user-specific bookmarks, we need authentication
      if (userOnly) {
        const authHeader = event.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required for user-specific bookmarks' })
          };
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
        
        // Fetch user-specific bookmarks
        let query = supabase
          .from('bookmarks')
          .select(`
            *,
            stakes(id, amount, user_id)
          `)
          .eq('added_by', userId);
        
        // Apply sorting
        query = query.order('created_at', { ascending: false });
        
        // Apply limit
        query = query.limit(limit);
        
        const { data, error } = await query;
        
        if (error) {
          console.error('Error fetching user bookmarks:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error fetching bookmarks' })
          };
        }
        
        // Process the data
        const processedData = data?.map(bookmark => {
          const totalDelegations = bookmark.stakes?.reduce((sum, stake) => 
            sum + (typeof stake.amount === 'number' ? stake.amount : 0), 0) || 0;
          
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
      
      // If fetching a specific bookmark by ID
      if (bookmarkId) {
        const { data, error } = await supabase
          .from('bookmarks')
          .select(`
            *,
            stakes(id, amount, user_id)
          `)
          .eq('id', bookmarkId)
          .single();
          
        if (error) {
          console.error('Error fetching bookmark by ID:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error fetching bookmark' })
          };
        }
        
        if (!data) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Bookmark not found' })
          };
        }
        
        // Process the data
        const totalDelegations = data.stakes?.reduce((sum, stake) => 
          sum + (typeof stake.amount === 'number' ? stake.amount : 0), 0) || 0;
        
        const { stakes, ...bookmarkWithoutStakes } = data;
        
        const processedBookmark = {
          ...bookmarkWithoutStakes,
          total_delegations: totalDelegations
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ bookmark: processedBookmark })
        };
      }
      
      // If fetching all bookmarks (public access)
      let query = supabase
        .from('bookmarks')
        .select(`
          *,
          stakes(id, amount, user_id)
        `);
      
      // Apply sorting
      query = query.order('created_at', { ascending: false });
      
      // Apply limit
      query = query.limit(limit);
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching all bookmarks:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error fetching bookmarks' })
        };
      }
      
      // Process the data
      const processedData = data?.map(bookmark => {
        const totalDelegations = bookmark.stakes?.reduce((sum, stake) => 
          sum + (typeof stake.amount === 'number' ? stake.amount : 0), 0) || 0;
        
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
    
    // For non-GET requests (POST, PUT, DELETE), require authentication
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
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
          bisac_codes: bookmarkData.bisac_codes || null,
          added_by: userId
        };
        
        const { data, error } = await supabase
          .from('bookmarks')
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

      case 'PUT': {
        // Update an existing bookmark
        const bookmarkId = event.queryStringParameters?.id;
        
        if (!bookmarkId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Bookmark ID is required' })
          };
        }
        
        // First, verify the user owns this bookmark
        const { data: existingBookmark, error: fetchError } = await supabase
          .from('bookmarks')
          .select('added_by')
          .eq('id', bookmarkId)
          .single();
        
        if (fetchError) {
          console.error('Error fetching bookmark for update:', fetchError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error fetching bookmark for update' })
          };
        }
        
        if (!existingBookmark) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Bookmark not found' })
          };
        }
        
        // Check ownership
        if (existingBookmark.added_by !== userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'You do not have permission to update this bookmark' })
          };
        }
        
        // Get update data
        const updateData = JSON.parse(event.body || '{}');
        
        // Filter to allowed fields
        const allowedFields = ['title', 'author', 'description', 'cover_url', 'bisac_codes'];
        const filteredUpdate = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {});
        
        // Add updated_at timestamp
        filteredUpdate['updated_at'] = new Date().toISOString();
        
        // Perform update
        const { data, error } = await supabase
          .from('bookmarks')
          .update(filteredUpdate)
          .eq('id', bookmarkId)
          .select()
          .single();
        
        if (error) {
          console.error('Error updating bookmark:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error updating bookmark' })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data)
        };
      }

      case 'DELETE': {
        // Delete a bookmark
        const bookmarkId = event.queryStringParameters?.id;
        
        if (!bookmarkId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Bookmark ID is required' })
          };
        }
        
        // First, verify the user owns this bookmark
        const { data: existingBookmark, error: fetchError } = await supabase
          .from('bookmarks')
          .select('added_by')
          .eq('id', bookmarkId)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
          console.error('Error fetching bookmark for deletion:', fetchError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error fetching bookmark for deletion' })
          };
        }
        
        if (!existingBookmark) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Bookmark not found' })
          };
        }
        
        // Check ownership
        if (existingBookmark.added_by !== userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'You do not have permission to delete this bookmark' })
          };
        }
        
        // Perform deletion
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', bookmarkId);
        
        if (error) {
          console.error('Error deleting bookmark:', error);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error deleting bookmark' })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true })
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