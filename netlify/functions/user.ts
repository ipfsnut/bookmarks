import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../src/types/database.types';
import { validateSession } from '../../src/services/auth.service';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

/**
 * Handle user profile operations
 */
const handler: Handler = async (event) => {
  // Check for authorization header
  const authHeader = event.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    // Get token from header
    const token = authHeader.split(' ')[1];
    
    // Validate session
    const { valid, userId } = await validateSession(token);
    
    if (!valid || !userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired session' }),
      };
    }
    
    // Handle different HTTP methods
    switch (event.httpMethod) {
      case 'GET':
        return getUserProfile(userId);
      case 'PUT':
        return updateUserProfile(userId, event.body);
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error in user function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * Get user profile
 */
async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch user profile' }),
    };
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}

/**
 * Update user profile
 */
async function updateUserProfile(userId: string, requestBody: string | null) {
  if (!requestBody) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing request body' }),
    };
  }
  
  // Parse request body
  const updates = JSON.parse(requestBody);
  
  // Validate updates
  if (updates.fid && typeof updates.fid !== 'number') {
    // Try to parse fid as number if it's a string
    if (typeof updates.fid === 'string') {
      updates.fid = parseInt(updates.fid, 10);
      
      if (isNaN(updates.fid)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Farcaster ID must be a number' }),
        };
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Farcaster ID must be a number' }),
      };
    }
  }
  
  // Prepare updates object
  const profileUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  
  // Only include fields that were provided
  if (updates.username !== undefined) {
    profileUpdates.username = updates.username;
  }
  
  if (updates.fid !== undefined) {
    profileUpdates.fid = updates.fid;
  }
  
  // Update user profile
  const { data, error } = await supabase
    .from('users')
    .update(profileUpdates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update user profile' }),
    };
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}

export { handler };