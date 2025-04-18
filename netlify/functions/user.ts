import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../src/types/database.types';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Function environment:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseServiceKey,
  nodeEnv: process.env.NODE_ENV
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in user function');
}

// Create Supabase client with proper headers
const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: { persistSession: false },
    global: {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
    },
  }
);

const handler: Handler = async (event) => {
  console.log('User function called with method:', event.httpMethod);
  
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
  
  console.log('Auth header present:', !!authHeader);
  
  if (!token) {
    console.log('No token provided');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Authentication required' })
    };
  }

  try {
    console.log('Processing request with token');
    
    // For development, use a mock user if Supabase is not configured
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('Using development mock data');
      if (event.httpMethod === 'GET') {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            id: 'dev-user-123',
            wallet_address: '0xC6cD1A73fe649fEbBD2b400717c8CF5C5b5BFD8f',
            farcaster_id: null,
            username: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            token_balance: 5
          })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Development mode - operation simulated' })
      };
    }

    // Decode token to get user ID
    console.log('Decoding token');
    let userId;
    try {
      const tokenParts = Buffer.from(token, 'base64').toString().split(':');
      userId = tokenParts[0];
      console.log('Decoded userId:', userId);
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token format' })
      };
    }
    
    if (!userId) {
      console.log('No userId found in token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET': {
        console.log('Processing GET request for user:', userId);
        // Get user profile
        try {
          const { data: user, error } = await supabase
            .from('users')
            .select(`
              id, 
              wallet_address, 
              username, 
              created_at, 
              updated_at,
              token_balances (amount)
            `)
            .eq('id', userId)
            .single();
          if (error) {
            console.error('Error fetching user:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Error fetching user data', details: error })
            };
          }

          console.log('User data retrieved:', user ? 'success' : 'not found');
          
          if (!user) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'User not found' })
            };
          }

          // Format the response
          const formattedUser = {
            ...user,
            token_balance: user.token_balances && user.token_balances.length > 0 
              ? user.token_balances[0].amount || 0 
              : 0
          };

          // Instead of using delete, create a new object without the property
          const { token_balances, ...userWithoutTokenBalances } = formattedUser;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(userWithoutTokenBalances)
          };
        } catch (dbError) {
          console.error('Database error:', dbError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Database error', details: dbError.message })
          };
        }
      }

      case 'PUT': {
        console.log('Processing PUT request for user:', userId);
        // Update user profile
        try {
          const updates = JSON.parse(event.body || '{}');
          
          // Only allow updating certain fields
          const allowedUpdates = ['username', 'farcaster_id'];
          const filteredUpdates = Object.keys(updates)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
              obj[key] = updates[key];
              return obj;
            }, {});
          
          if (Object.keys(filteredUpdates).length === 0) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'No valid fields to update' })
            };
          }

          const { data, error } = await supabase
            .from('users')
            .update(filteredUpdates)
            .eq('id', userId)
            .select()
            .single();

          if (error) {
            console.error('Error updating user:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Error updating user data', details: error })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(data)
          };
        } catch (updateError) {
          console.error('Update error:', updateError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error processing update', details: updateError.message })
          };
        }
      }

      default:
        console.log('Method not allowed:', event.httpMethod);
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('User function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

export { handler };