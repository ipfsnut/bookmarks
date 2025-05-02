import React, { useState } from 'react';
import { useBookmarkNFT } from '../utils/contracts';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';

interface NFTApprovalModalProps {
  tokenId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NFTApprovalModal: React.FC<NFTApprovalModalProps> = ({ 
  tokenId, 
  onClose, 
  onSuccess 
}) => {
  const [operatorAddress, setOperatorAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  const bookmarkNFT = useBookmarkNFT();
  const { isConnected } = useWallet();
  
  const handleApprove = async () => {
    if (!bookmarkNFT) {
      setError('Contract not available');
      return;
    }
    
    if (!operatorAddress) {
      setError('Please enter an operator address');
      return;
    }
    
    if (!isConnected) {
      setError('Wallet not connected');
      return;
    }
    
    // Validate the address format
    if (!ethers.isAddress(operatorAddress)) {
      setError('Invalid Ethereum address format');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Call the approve function on the contract
      const tx = await bookmarkNFT.approve(
        operatorAddress,
        tokenId
      );
      
      setTransactionHash(tx.hash);
      
      // Wait for transaction to be mined
      await tx.wait();
      
      // Call onSuccess to update the UI
      onSuccess();
      
      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error approving operator:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve operator');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Approve Operator</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>
        
        <div className="mb-6">
          <p className="mb-4">You are about to approve an operator to transfer NFT #{tokenId} on your behalf.</p>
          
          <div className="mb-4">
            <label htmlFor="operator-address" className="block text-sm font-medium text-gray-700 mb-1">
              Operator Address:
            </label>
            <input
              id="operator-address"
              type="text"
              value={operatorAddress}
              onChange={(e) => setOperatorAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isProcessing}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}
          
          {transactionHash && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md mb-4">
              <p className="mb-2">Transaction submitted!</p>
              <a 
                href={`https://basescan.org/tx/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                View on BaseScan
              </a>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            disabled={isProcessing || !operatorAddress || !isConnected}
          >
            {isProcessing ? 'Processing...' : 'Approve Operator'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NFTApprovalModal;