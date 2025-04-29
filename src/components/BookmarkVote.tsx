import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getUserStakedBalance } from '../services/blockchain';
import { supabase } from '../config/supabase';

interface BookmarkVoteProps {
  bookmarkId: string;
}

export function BookmarkVote({ bookmarkId }: BookmarkVoteProps) {
  const { address } = useAccount();
  const [lockedBalance, setLockedBalance] = useState('0');
  const [currentVotes, setCurrentVotes] = useState(0);
  const [userVotes, setUserVotes] = useState(0);
  const [voteAmount, setVoteAmount] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [weeklyReset, setWeeklyReset] = useState('');

  // Calculate time until weekly reset (Sunday)
  useEffect(() => {
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      nextSunday.setHours(0, 0, 0, 0);
      
      const timeUntilReset = nextSunday.getTime() - now.getTime();
      const days = Math.floor(timeUntilReset / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      return `${days}d ${hours}h until votes reset`;
    };
    
    setWeeklyReset(calculateTimeUntilReset());
    const interval = setInterval(() => {
      setWeeklyReset(calculateTimeUntilReset());
    }, 3600000); // Update every hour
    
    return () => clearInterval(interval);
  }, []);

  // Fetch user's locked balance and current votes
  useEffect(() => {
    if (!address || !bookmarkId) return;

    const fetchData = async () => {
      try {
        // Get user's locked balance (wNSI)
        const balance = await getUserStakedBalance(address);
        setLockedBalance(balance);
        
        // Get total votes for this bookmark
        const { data: votesData, error: votesError } = await supabase
          .from('stakes')
          .select('amount')
          .eq('bookmark_id', bookmarkId);
          
        if (votesError) throw votesError;
        
        const totalVotes = votesData?.reduce((sum, vote) => sum + (vote.amount || 0), 0) || 0;
        setCurrentVotes(totalVotes);
        
        // Get user's votes for this bookmark
        const { data: userVotesData, error: userVotesError } = await supabase
          .from('stakes')
          .select('amount')
          .eq('bookmark_id', bookmarkId)
          .eq('user_id', address)
          .single();
          
        if (userVotesError && userVotesError.code !== 'PGRST116') throw userVotesError;
        
        setUserVotes(userVotesData?.amount || 0);
      } catch (err) {
        console.error('Error fetching vote data:', err);
      }
    };

    fetchData();
  }, [address, bookmarkId]);

  const handleVote = async () => {
    if (!address || !bookmarkId) {
      setError('Please connect your wallet');
      return;
    }

    if (voteAmount <= 0) {
      setError('Please enter a valid vote amount');
      return;
    }

    const availableVotes = parseFloat(lockedBalance) - userVotes;
    if (voteAmount > availableVotes) {
      setError(`You only have ${availableVotes} votes available`);
      return;
    }

    try {
      setIsVoting(true);
      setError('');
      setSuccess('');

      // Record vote in Supabase
      const newVoteAmount = userVotes + voteAmount;
      
      const { error: upsertError } = await supabase
        .from('stakes')
        .upsert({
          user_id: address,
          bookmark_id: bookmarkId,
          amount: newVoteAmount,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,bookmark_id'
        });
        
      if (upsertError) throw upsertError;
      
      // Update UI
      setUserVotes(newVoteAmount);
      setCurrentVotes(currentVotes + voteAmount);
      setVoteAmount(0);
      
      setSuccess(`Successfully voted with ${voteAmount} tokens`);
    } catch (err) {
      console.error('Error voting:', err);
      setError('Failed to submit vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  if (!address) {
    return <div>Please connect your wallet to vote.</div>;
  }

  return (
    <div className="bookmark-vote">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Vote on this Bookmark</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-500">Current Votes</h3>
          <p className="text-2xl font-bold text-gray-800">{currentVotes}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-500">Your Votes</h3>
          <p className="text-2xl font-bold text-gray-800">{userVotes}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-500">Available Voting Power</h3>
          <p className="text-2xl font-bold text-gray-800">{Math.max(0, parseFloat(lockedBalance) - userVotes)}</p>
        </div>
      </div>
      
      <div className="bg-blue-50 text-blue-700 p-3 rounded-md mb-6">
        <p className="text-sm font-medium">{weeklyReset}</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
          {success}
        </div>
      )}
      
      <div className="flex space-x-4 mb-6">
        <input
          type="number"
          value={voteAmount || ''}
          onChange={(e) => setVoteAmount(parseInt(e.target.value) || 0)}
          placeholder="Number of votes"
          min="1"
          max={Math.max(0, parseFloat(lockedBalance) - userVotes)}
          disabled={isVoting}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          onClick={handleVote} 
          disabled={isVoting || voteAmount <= 0 || voteAmount > (parseFloat(lockedBalance) - userVotes)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isVoting ? 'Voting...' : 'Submit Votes'}
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-600">
        <p className="mb-2">Each locked token gives you one vote per week.</p>
        <p className="mb-2">Votes reset every Sunday at midnight UTC.</p>
        <p>Your locked tokens remain locked and will generate new votes next week.</p>
      </div>
    </div>
  );
}