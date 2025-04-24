import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

interface DelegationControlsProps {
  bookmarkId: string;
  currentStake: number;
}

export const DelegationControls: React.FC<DelegationControlsProps> = ({ bookmarkId, currentStake }) => {
  const wallet = useWallet();
  const [stakeAmount, setStakeAmount] = useState<number>(1);
  const [isStaking, setIsStaking] = useState<boolean>(false);
  
  // This is a placeholder - actual implementation will connect to blockchain
  const handleStake = async () => {
    setIsStaking(true);
    try {
      // Placeholder for actual staking logic
      console.log(`Staking ${stakeAmount} tokens on bookmark ${bookmarkId}`);
      // Here you would call your contract or API to perform the actual staking
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`Successfully staked ${stakeAmount} tokens! (This is a placeholder)`);
    } catch (error) {
      console.error('Error staking tokens:', error);
      alert('Failed to stake tokens. Please try again.');
    } finally {
      setIsStaking(false);
    }
  };
  
  // Check if user is connected - adjust based on actual WalletContext properties
  const isConnected = wallet.address !== undefined && wallet.address !== null;
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium mb-3">Stake $BOOKMARK Tokens</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Your current stake: <span className="font-medium">{currentStake} $BOOKMARK</span>
        </p>
        <p className="text-sm text-gray-600">
          Your wallet balance: <span className="font-medium">100 $BOOKMARK</span> (placeholder)
        </p>
      </div>
      
      <div className="mb-4">
        <label htmlFor="stakeAmount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount to stake
        </label>
        <div className="flex items-center">
          <input
            type="number"
            id="stakeAmount"
            min="1"
            max="100"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(Number(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <span className="ml-2 text-sm text-gray-500">$BOOKMARK</span>
        </div>
      </div>
      
      <button
        onClick={handleStake}
        disabled={isStaking || stakeAmount <= 0 || !isConnected}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
      >
        {isStaking ? 'Processing...' : 'Stake Tokens'}
      </button>
      
      <p className="mt-2 text-xs text-gray-500">
        By staking tokens, you're signaling this bookmark's quality to the community.
      </p>
    </div>
  );
};