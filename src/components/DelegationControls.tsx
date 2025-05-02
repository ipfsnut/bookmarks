import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useBookmarkVoting, useCardCatalog, formatBigInt, parseToBigInt } from '../utils/contracts';
import { ethers } from 'ethers';

interface DelegationControlsProps {
  bookmarkId: string;
  currentStake: number;
}

export const DelegationControls: React.FC<DelegationControlsProps> = ({ 
  bookmarkId, 
  currentStake 
}) => {
  const { address } = useAccount();
  const bookmarkVoting = useBookmarkVoting();
  const cardCatalog = useCardCatalog();
  
  const [remainingVotingPower, setRemainingVotingPower] = useState<string>('0');
  const [userVotes, setUserVotes] = useState<string>('0');
  const [voteAmount, setVoteAmount] = useState<string>('1');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentCycle, setCurrentCycle] = useState<number>(0);
  
  // Fetch user's voting power and current votes
  useEffect(() => {
    if (!address || !bookmarkId || !bookmarkVoting || !cardCatalog) return;
    
    const fetchVotingData = async () => {
      try {
        // Convert bookmarkId from string to BigNumber
        const tokenId = ethers.toBigInt(bookmarkId);
        
        // Get user's remaining voting power
        const votingPower = await bookmarkVoting.getRemainingVotingPower(address);
        setRemainingVotingPower(formatBigInt(votingPower));
        
        // Get user's current votes for this bookmark
        const votes = await bookmarkVoting.getUserVotesForBookmark(address, tokenId);
        setUserVotes(formatBigInt(votes));
        
        // Get current voting cycle
        const cycle = await bookmarkVoting.getCurrentCycle();
        setCurrentCycle(Number(cycle));
      } catch (err) {
        console.error('Error fetching voting data:', err);
        setError('Failed to load voting data');
      }
    };
    
    fetchVotingData();
    
    // Refresh every 30 seconds
    const intervalId = setInterval(fetchVotingData, 30000);
    
    return () => clearInterval(intervalId);
  }, [address, bookmarkId, bookmarkVoting, cardCatalog]);
  
  // Handle delegation (locking in tokens)
  const handleDelegate = async () => {
    if (!address || !bookmarkId || !bookmarkVoting) {
      setError('Wallet not connected or contract not available');
      return;
    }
    
    if (!voteAmount || parseFloat(voteAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    const voteAmountNum = parseFloat(voteAmount);
    const remainingPower = parseFloat(remainingVotingPower);
    
    if (voteAmountNum > remainingPower) {
      setError(`You only have ${remainingPower} voting power available`);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
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
      const newUserVotes = (parseFloat(userVotes) + voteAmountNum).toString();
      setUserVotes(newUserVotes);
      
      // Update remaining voting power
      const newVotingPower = await bookmarkVoting.getRemainingVotingPower(address);
      setRemainingVotingPower(formatBigInt(newVotingPower));
      
      setSuccess(`Successfully locked in ${voteAmount} tokens`);
      setVoteAmount('1'); // Reset input field
    } catch (err) {
      console.error('Error delegating votes:', err);
      setError('Failed to lock in tokens. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle undelegation (unlocking tokens)
  const handleUndelegate = async () => {
    if (!address || !bookmarkId || !bookmarkVoting) {
      setError('Wallet not connected or contract not available');
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
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
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
      const newUserVotes = (currentVotes - voteAmountNum).toString();
      setUserVotes(newUserVotes);
      
      // Update remaining voting power
      const newVotingPower = await bookmarkVoting.getRemainingVotingPower(address);
      setRemainingVotingPower(formatBigInt(newVotingPower));
      
      setSuccess(`Successfully unlocked ${voteAmount} tokens`);
      setVoteAmount('1'); // Reset input field
    } catch (err) {
      console.error('Error undelegating votes:', err);
      setError('Failed to unlock tokens. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!address) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Lock in $BOOKMARK Tokens</h3>
        <p className="text-sm text-gray-600 mb-2">
          Connect your wallet to lock in tokens on this bookmark.
        </p>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Lock in $BOOKMARK Tokens</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Your current locked tokens: <span className="font-medium">{userVotes} $BOOKMARK</span>
        </p>
        <p className="text-sm text-gray-600">
          Your available voting power: <span className="font-medium">{remainingVotingPower} $BOOKMARK</span>
        </p>
        <p className="text-sm text-gray-600">
          Current voting cycle: <span className="font-medium">{currentCycle}</span>
        </p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md">
          {success}
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="voteAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount
        </label>
        <div className="flex items-center">
          <input
            type="number"
            id="voteAmount"
            min="0.1"
            step="0.1"
            value={voteAmount}
            onChange={(e) => setVoteAmount(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            disabled={isProcessing}
          />
          <span className="ml-2 text-sm text-gray-500">$BOOKMARK</span>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={handleDelegate}
          disabled={isProcessing || parseFloat(remainingVotingPower) <= 0}
          className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing...' : 'Lock In Tokens'}
        </button>
        
        <button
          onClick={handleUndelegate}
          disabled={isProcessing || parseFloat(userVotes) <= 0}
          className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing...' : 'Unlock Tokens'}
        </button>
      </div>
      
      <p className="mt-2 text-xs text-gray-500">
        By locking in tokens, you're signaling this bookmark's quality to the community.
        Tokens remain locked until you explicitly unlock them or until the end of the voting cycle.
      </p>
    </div>
  );
};