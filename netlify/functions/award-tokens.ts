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
 * Award tokens to a user
 */
const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Check for authorization header (only required for non-system operations)
  const authHeader = event.headers.authorization;
  const isSystemOperation = event.headers['x-system-operation'] === 'true';

  // Verify authentication for non-system operations
  let authenticatedUserId: string | null = null;
  
  if (!isSystemOperation) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const token = authHeader.split(' ')[1];
    const { valid, userId } = await validateSession(token);
    
    if (!valid || !userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired session' }),
      };
    }
    
    authenticatedUserId = userId;
  }

  try {
    // Parse request body
    const { userId, amount, reason, relatedEntityId, relatedEntityType } = JSON.parse(event.body || '{}');

    if (!userId || !amount || !reason) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // For non-system operations, can only award tokens to self
    if (!isSystemOperation && authenticatedUserId !== userId) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Forbidden' }),
      };
    }

    // Begin transaction
    const { error: txError } = await supabase.rpc('begin_transaction');
    if (txError) throw txError;

    try {
      // 1. Add token transaction record
      const { error: insertError } = await supabase
        .from('token_transactions')
        .insert([{
          user_id: userId,
          amount,
          type: 'credit',
          reason,
          related_entity_id: relatedEntityId || null,
          related_entity_type: relatedEntityType || null,
        }]);

      if (insertError) throw insertError;

      // 2. Update token balance or create if doesn't exist
      const { data: existingBalance, error: fetchError } = await supabase
        .from('token_balances')
        .select('id, amount')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingBalance) {
        // Update existing balance
        const { error: updateError } = await supabase
          .from('token_balances')
          .update({ 
            amount: existingBalance.amount + amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingBalance.id);

        if (updateError) throw updateError;
      } else {
        // Create new balance
        const { error: createError } = await supabase
          .from('token_balances')
          .insert([{
            user_id: userId,
            amount,
          }]);

        if (createError) throw createError;
      }

      // Commit transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) throw commitError;

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    } catch (error) {
      // Rollback transaction on error
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  } catch (error) {
    console.error('Error awarding tokens:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };