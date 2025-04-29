import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getUserStakedBalance, formatBigInt, parseToBigInt } from '../services/blockchain';
import { supabase } from '../config/supabase';

export function TokenLocker() {
  const { address } = useAccount();
  const [nsiBalance, setNsiBalance] = useState('0');
  const [wNsiBalance, setWNsiBalance] = useState('0');
  const [lockAmount, setLockAmount] = useState('');
  const [unlockAmount, setUnlockAmount] = useState('');
  const [isLocking, setIsLocking] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch balances
  useEffect(() => {
    if (!address) return;

    const fetchBalances = async () => {
      try {
        // Use the existing function to get wNSI balance
        const wNsiBalance = await getUserStakedBalance(address);
        setWNsiBalance(wNsiBalance);
        
        // For NSI balance, we would need to add a function
        // For now, this is a placeholder
        setNsiBalance('10.0'); // Placeholder
      } catch (err) {
        console.error('Error fetching balances:', err);
      }
    };

    fetchBalances();
    // Set up an interval to refresh balances
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [address]);

  const handleLock = async () => {
    if (!address || !lockAmount || parseFloat(lockAmount) <= 0) {
      setError('Please enter a valid amount to lock');
      return;
    }

    try {
      setIsLocking(true);
      setError('');
      setSuccess('');

      // Convert input amount to token units
      const amountBigInt = parseToBigInt(lockAmount, 18);
      
      // This would call the contract's wrap function
      // For now, this is a placeholder
      // await wrapTokens(amountBigInt);
      
      // Simulate successful transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update balances after successful transaction
      const newWNsiBalance = (parseFloat(wNsiBalance) + parseFloat(lockAmount)).toString();
      setWNsiBalance(newWNsiBalance);
      setNsiBalance((parseFloat(nsiBalance) - parseFloat(lockAmount)).toString());
      
      // Record transaction in Supabase
      if (address) {
        await supabase.from('token_transactions').insert({
          user_id: address,
          type: 'lock',
          amount: parseFloat(lockAmount),
          timestamp: new Date().toISOString()
        });
      }
      
      setSuccess(`Successfully locked ${lockAmount} tokens`);
      setLockAmount('');
    } catch (err) {
      console.error('Error locking tokens:', err);
      setError('Failed to lock tokens. Please try again.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!address || !unlockAmount || parseFloat(unlockAmount) <= 0) {
      setError('Please enter a valid amount to unlock');
      return;
    }

    if (parseFloat(unlockAmount) > parseFloat(wNsiBalance)) {
      setError('Insufficient locked balance');
      return;
    }

    try {
      setIsUnlocking(true);
      setError('');
      setSuccess('');

      // Convert input amount to token units
      const amountBigInt = parseToBigInt(unlockAmount, 18);
      
      // This would call the contract's unwrap function
      // For now, this is a placeholder
      // await unwrapTokens(amountBigInt);
      
      // Simulate successful transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update balances after successful transaction
      const newWNsiBalance = (parseFloat(wNsiBalance) - parseFloat(unlockAmount)).toString();
      setWNsiBalance(newWNsiBalance);
      setNsiBalance((parseFloat(nsiBalance) + parseFloat(unlockAmount)).toString());
      
      // Record transaction in Supabase
      if (address) {
        await supabase.from('token_transactions').insert({
          user_id: address,
          type: 'unlock',
          amount: parseFloat(unlockAmount),
          timestamp: new Date().toISOString()
        });
      }
      
      setSuccess(`Successfully initiated unlock of ${unlockAmount} tokens. Tokens will be available after the 7-day cooldown period.`);
      setUnlockAmount('');
    } catch (err) {
      console.error('Error unlocking tokens:', err);
      setError('Failed to unlock tokens. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  if (!address) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        Please connect your wallet to lock or unlock tokens.
      </div>
    );
  }

  return (
    <div className="token-locker bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Lock & Unlock Tokens</h2>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Available NSI</h3>
          <p className="text-2xl font-bold text-gray-900">{nsiBalance}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Locked wNSI</h3>
          <p className="text-2xl font-bold text-gray-900">{wNsiBalance}</p>
          <p className="text-sm text-gray-500 mt-1">These tokens represent your weekly voting power</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-blue-800 mb-2">Lock Tokens</h3>
          <p className="text-sm text-blue-600 mb-4">Lock your NSI tokens to receive wNSI and voting power.</p>
          
          <div className="flex space-x-3">
            <input
              type="number"
              value={lockAmount}
              onChange={(e) => setLockAmount(e.target.value)}
              placeholder="Amount to lock"
              min="0"
              step="0.01"
              disabled={isLocking}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleLock} 
              disabled={isLocking || !lockAmount || parseFloat(lockAmount) <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLocking ? 'Locking...' : 'Lock Tokens'}
            </button>
          </div>
        </div>
        
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-purple-800 mb-2">Unlock Tokens</h3>
          <p className="text-sm text-purple-600 mb-4">Unlock your wNSI tokens to receive NSI. A 7-day cooldown period applies.</p>
          
          <div className="flex space-x-3">
            <input
              type="number"
              value={unlockAmount}
              onChange={(e) => setUnlockAmount(e.target.value)}
              placeholder="Amount to unlock"
              min="0"
              step="0.01"
              disabled={isUnlocking}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button 
              onClick={handleUnlock} 
              disabled={isUnlocking || !unlockAmount || parseFloat(unlockAmount) <= 0}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock Tokens'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}