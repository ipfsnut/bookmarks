import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler: Handler = async (event) => {
  // This function should only be triggered by a scheduled event
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    // Get current week number
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const currentWeek = Math.floor(diff / oneWeek) + 1;
    const year = now.getFullYear();

    // 1. Fetch all stakes
    const { data: stakes, error: stakesError } = await supabase
      .from('stakes')
      .select('*');

    if (stakesError) throw stakesError;

    // 2. Group stakes by bookmark
    const bookmarkVotes = new Map();
    stakes?.forEach(stake => {
      const bookmarkId = stake.bookmark_id;
      const votes = stake.amount || 0;
      
      if (bookmarkVotes.has(bookmarkId)) {
        bookmarkVotes.set(bookmarkId, bookmarkVotes.get(bookmarkId) + votes);
      } else {
        bookmarkVotes.set(bookmarkId, votes);
      }
    });

    // 3. Convert to array and sort by votes
    const rankedBookmarks = Array.from(bookmarkVotes.entries())
      .map(([bookmarkId, votes]) => ({ bookmarkId, votes }))
      .sort((a, b) => b.votes - a.votes);

    // 4. Store the leaderboard in the database
    const leaderboardEntries = rankedBookmarks.map((item, index) => ({
      bookmark_id: item.bookmarkId,
      votes: item.votes,
      rank: index + 1,
      week: currentWeek,
      year: year,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('leaderboards')
      .insert(leaderboardEntries);

    if (insertError) throw insertError;

    // 5. Create a leaderboard NFT record (placeholder for actual NFT minting)
    const { error: nftError } = await supabase
      .from('leaderboard_nfts')
      .insert({
        week: currentWeek,
        year: year,
        ipfs_hash: 'placeholder', // This would be replaced with actual IPFS hash
        created_at: new Date().toISOString()
      });

    if (nftError) throw nftError;

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Votes tallied successfully',
        week: currentWeek,
        year: year,
        bookmarks_ranked: rankedBookmarks.length
      }),
    };
  } catch (error) {
    console.error('Error tallying votes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error tallying votes', error }),
    };
  }
};

export { handler };