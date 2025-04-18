import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../src/types/database.types';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in token-balance function');
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

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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
    // For development, use a mock response if Supabase is not configured
    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          balance: 5,
          transactions: [
            {
              id: 'tx-1',
              amount: 5,
              type: 'welcome',
              created_at: new Date().toISOString()
            }
          ]
        })
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

    // Get token balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('token_balances')
      .select('amount')
      .eq('user_id', userId)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching token balance:', balanceError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error fetching token balance' })
      };
    }

    // Get recent transactions
    const { data: transactions, error: txError } = await supabase
      .from('token_transactions')
      .select('id, amount, type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (txError) {
      console.error('Error fetching transactions:', txError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error fetching transactions' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        balance: balanceData?.amount || 0,
        transactions: transactions || []
      })
    };
  } catch (error) {
    console.error('Token balance function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler };