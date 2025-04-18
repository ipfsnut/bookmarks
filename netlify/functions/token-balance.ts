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
 * Get token balance for authenticated user
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

    // Get token balance
    const { data, error } = await supabase
      .from('token_balances')
      .select('amount')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no balance record exists, return 0
      if (error.code === 'PGRST116') { // PGRST116 = no rows returned
        return {
          statusCode: 200,
          body: JSON.stringify({ balance: 0 }),
        };
      }
      
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ balance: data.amount }),
    };
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };