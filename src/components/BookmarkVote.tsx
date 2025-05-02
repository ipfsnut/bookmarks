import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useBookmarkVoting, useCardCatalog, formatBigInt, parseToBigInt } from '../utils/contracts';
import { ethers } from 'ethers';

interface BookmarkVoteProps {
  bookmarkId: string;
}

export function BookmarkVote({ bookmarkId }: BookmarkVoteProps) {
  const { address } = useAccount();
  const bookmarkVoting = useBookmarkVoting();
  const cardCatalog = useCardCatalog();
  
  const [totalVotes, setTotalVotes] = useState<string>('0');
  const [userVotes, setUserVotes] = useState<string>('0');
  const [remainingVotingPower, setRemainingVotingPower] = useState<string>('0');
  const [voteAmount, setVoteAmount] = useState<string>('1');
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [currentCycle, setCurrentCycle] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Calculate time remaining in current cycle
  useEffect(() => {
    if (!bookmarkVoting) return;
    
    const updateTimeRemaining = async () => {
      try {
        const timeRemainingSeconds = await bookmarkVoting.getTimeRemainingInCurrentCycle();
        const days = Math.floor(Number(timeRemainingSeconds) / (24 * 60 * 60));
        const hours = Math.floor((Number(timeRemainingSeconds) % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((Number(timeRemainingSeconds) % (60 * 60)) / 60);
        
        setTimeRemaining(`${days}d ${hours}h ${minutes}m until votes reset`);
      } catch (err) {
        console.error('Error fetching time remaining:', err);
        setTimeRemaining('Unable to fetch time remaining');
      }
    };
    
    updateTimeRemaining();
    
    // Update every minute
    const intervalId = setInterval(updateTimeRemaining, 60000);
    
    return () => clearInterval(intervalId);
  }, [bookmarkVoting]);

  // Fetch voting data
  useEffect(() => {
    if (!address || !bookmarkId || !bookmarkVoting) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Convert bookmarkId from string to BigNumber
        const tokenId = ethers.toBigInt(bookmarkId);
        
        // Get total votes for this bookmark
        const totalVotesRaw = await bookmarkVoting.getBookmarkVotes(tokenId);
        setTotalVotes(formatBigInt(totalVotesRaw));
        
        // Get user's votes for this bookmark
        const userVotesRaw = await bookmarkVoting.getUserVotesForBookmark(address, tokenId);
        setUserVotes(formatBigInt(userVotesRaw));
        
        // Get user's remaining voting power
        const votingPowerRaw = await bookmarkVoting.getRemainingVotingPower(address);
        setRemainingVotingPower(formatBigInt(votingPowerRaw));
        
        // Get current voting cycle
        const cycle = await bookmarkVoting.getCurrentCycle();
        setCurrentCycle(Number(cycle));
      } catch (err) {
        console.error('Error fetching vote data:', err);
        setError('Failed to load voting data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchData, 30000);
    
    return () => clearInterval(intervalId);
  }, [address, bookmarkId, bookmarkVoting]);

  const handleVote = async () => {
    if (!address || !bookmarkId || !bookmarkVoting) {
      setError('Please connect your wallet');
      return;
    }

    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      setError('Please enter a valid vote amount');
      return;
    }

    const voteAmountNum = parseFloat(voteAmount);
    const remainingPower = parseFloat(remainingVotingPower);
    
    if (voteAmountNum > remainingPower) {
      setError(`You only have ${remainingPower} voting power available`);
      return;
    }

    try {
      setIsVoting(true);
      setError(null);
      setSuccess(null);

      // Convert bookmarkId from string to BigNumber
      const tokenId = ethers.toBigInt(bookmarkId);
      
      // Convert vote amount to the correct format for the contract
      const voteAmountBigInt = parseToBigInt(voteAmount);
      
      // Call the delegateVotes function on the contract
      const tx = await bookmarkVoting.delegateVotes(tokenId, voteAmountBigInt);
      
      setSuccess('Transaction submitted. Waiting for confirmation...');
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Update UI
      const newTotalVotes = (parseFloat(totalVotes) + voteAmountNum).toString();
      setTotalVotes(newTotalVotes);
      
      const newUserVotes = (parseFloat(userVotes) + voteAmountNum).toString();
      setUserVotes(newUserVotes);
      
      // Update remaining voting power
      const newVotingPower = await bookmarkVoting.getRemainingVotingPower(address);
      setRemainingVotingPower(formatBigInt(newVotingPower));
      
      setSuccess(`Successfully voted with ${voteAmount} tokens`);
      setVoteAmount('1'); // Reset input field
    } catch (err) {
      console.error('Error voting:', err);
      setError('Failed to submit vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };
  
  const handleUnvote = async () => {
    if (!address || !bookmarkId || !bookmarkVoting) {
      setError('Please connect your wallet');
      return;
    }

    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const voteAmountNum = parseFloat(voteAmount);
    const currentVotes = parseFloat(userVotes);
    
    if (voteAmountNum > currentVotes) {
      setError(`You only have ${currentVotes} tokens locked in`);
      return;
    }

    try {
      setIsVoting(true);
      setError(null);
      setSuccess(null);

      // Convert bookmarkId from string to BigNumber
      const tokenId = ethers.toBigInt(bookmarkId);
      
      // Convert vote amount to the correct format for the contract
      const voteAmountBigInt = parseToBigInt(voteAmount);
      
      // Call the undelegateVotes function on the contract
      const tx = await bookmarkVoting.undelegateVotes(tokenId, voteAmountBigInt);
      
      setSuccess('Transaction submitted. Waiting for confirmation...');
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Update UI
      const newTotalVotes = (parseFloat(totalVotes) - voteAmountNum).toString();
      setTotalVotes(newTotalVotes);
      
      const newUserVotes = (currentVotes - voteAmountNum).toString();
      setUserVotes(newUserVotes);
      
      // Update remaining voting power
      const newVotingPower = await bookmarkVoting.getRemainingVotingPower(address);
      setRemainingVotingPower(formatBigInt(newVotingPower));
      
      setSuccess(`Successfully unlocked ${voteAmount} tokens`);
      setVoteAmount('1'); // Reset input field
    } catch (err) {
      console.error('Error unvoting:', err);
      setError('Failed to unlock tokens. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  if (!address) {
    return <div className="text-center p-4">Please connect your wallet to vote.</div>;
  }
  
  if (isLoading) {
    return (
      <div className="text-center p-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <p>Loading voting data...</p>
      </div>
    );
  }

  return (
    <div className="bookmark-vote">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Vote on this Bookmark</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-500">Current Votes</h3>
          <p className="text-2xl font-bold text-gray-800">{totalVotes}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-500">Your Votes</h3>
          <p className="text-2xl font-bold text-gray-800">{userVotes}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-500">Available Voting Power</h3>
          <p className="text-2xl font-bold text-gray-800">{remainingVotingPower}</p>
        </div>
      </div>
      
      <div className="bg-blue-50 text-blue-700 p-3 rounded-md mb-6">
        <p className="text-sm font-medium">{timeRemaining}</p>
        <p className="text-sm font-medium">Current Voting Cycle: {currentCycle}</p>
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
      
      <div className="mb-4">
        <label htmlFor="voteAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <input
          type="number"
          id="voteAmount"
          value={voteAmount}
          onChange={(e) => setVoteAmount(e.target.value)}
          placeholder="Enter amount"
          min="0.1"
          step="0.1"
          disabled={isVoting}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div className="flex space-x-4 mb-6">
        <button 
          onClick={handleVote} 
          disabled={isVoting || parseFloat(remainingVotingPower) <= 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isVoting ? 'Processing...' : 'Lock In Tokens'}
        </button>
        
        <button 
          onClick={handleUnvote} 
          disabled={isVoting || parseFloat(userVotes) <= 0}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          {isVoting ? 'Processing...' : 'Unlock Tokens'}
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
