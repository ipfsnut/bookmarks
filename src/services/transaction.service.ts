import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { eventListenerService, EventType, eventEmitter } from './event-listener.service';

// Transaction status enum
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

// Transaction interface
export interface Transaction {
  id: string;
  hash: string;
  description: string;
  status: TransactionStatus;
  createdAt: number;
  confirmedAt?: number;
  error?: string;
  data?: any;
}

// Transaction queue
class TransactionService {
  private transactions: Map<string, Transaction> = new Map();
  
  /**
   * Add a transaction to the queue
   */
  public addTransaction(
    hash: string,
    description: string,
    data?: any
  ): Transaction {
    const id = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const transaction: Transaction = {
      id,
      hash,
      description,
      status: TransactionStatus.PENDING,
      createdAt: Date.now(),
      data
    };
    
    this.transactions.set(id, transaction);
    
    // Emit transaction pending event
    eventListenerService.emitCustomEvent(EventType.TRANSACTION_PENDING, {
      transaction
    });
    
    console.log(`Transaction added to queue: ${description} (${hash})`);
    
    return transaction;
  }
  
  /**
   * Update a transaction's status
   */
  public updateTransaction(
    id: string,
    status: TransactionStatus,
    error?: string
  ): Transaction | null {
    const transaction = this.transactions.get(id);
    
    if (!transaction) {
      console.warn(`Transaction with ID ${id} not found`);
      return null;
    }
    
    const updatedTransaction: Transaction = {
      ...transaction,
      status,
      confirmedAt: status === TransactionStatus.CONFIRMED ? Date.now() : transaction.confirmedAt,
      error: error || transaction.error
    };
    
    this.transactions.set(id, updatedTransaction);
    
    // Emit appropriate event
    if (status === TransactionStatus.CONFIRMED) {
      eventListenerService.emitCustomEvent(EventType.TRANSACTION_CONFIRMED, {
        transaction: updatedTransaction
      });
    } else if (status === TransactionStatus.FAILED) {
      eventListenerService.emitCustomEvent(EventType.TRANSACTION_FAILED, {
        transaction: updatedTransaction,
        error
      });
    }
    
    console.log(`Transaction ${id} updated to ${status}`);
    
    return updatedTransaction;
  }
  
  /**
   * Get a transaction by ID
   */
  public getTransaction(id: string): Transaction | null {
    return this.transactions.get(id) || null;
  }
  
  /**
   * Get all transactions
   */
  public getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }
  
  /**
   * Get recent transactions
   */
  public getRecentTransactions(limit: number = 10): Transaction[] {
    return this.getAllTransactions()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
  
  /**
   * Wait for a transaction to be confirmed
   */
  public async waitForTransaction(
    hash: string,
    description: string,
    data?: any
  ): Promise<Transaction> {
    // Add the transaction to the queue
    const transaction = this.addTransaction(hash, description, data);
    
    try {
      // Create a provider
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      
      // Wait for the transaction to be confirmed
      const receipt = await provider.waitForTransaction(hash);
      
      if (receipt && receipt.status === 1) {
        // Transaction confirmed successfully
        return this.updateTransaction(transaction.id, TransactionStatus.CONFIRMED) as Transaction;
      } else {
        // Transaction failed
        return this.updateTransaction(
          transaction.id,
          TransactionStatus.FAILED,
          'Transaction failed'
        ) as Transaction;
      }
    } catch (error: any) {
      // Error waiting for transaction
      return this.updateTransaction(
        transaction.id,
        TransactionStatus.FAILED,
        error.message || 'Error waiting for transaction'
      ) as Transaction;
    }
  }
  
  /**
   * Clear old transactions
   */
  public clearOldTransactions(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    this.getAllTransactions().forEach(transaction => {
      const age = now - transaction.createdAt;
      
      if (age > maxAgeMs) {
        this.transactions.delete(transaction.id);
      }
    });
    
    console.log('Old transactions cleared');
  }
}

// Export a singleton instance
export const transactionService = new TransactionService();

/**
 * Hook to use the transaction service in components
 */
export function useTransactions(limit: number = 10) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  useEffect(() => {
    // Get initial transactions
    setTransactions(transactionService.getRecentTransactions(limit));
    
    // Set up event listeners to update transactions
    const handleTransactionEvent = () => {
      setTransactions(transactionService.getRecentTransactions(limit));
    };
    



    eventEmitter.on(EventType.TRANSACTION_PENDING, handleTransactionEvent);
    eventEmitter.on(EventType.TRANSACTION_CONFIRMED, handleTransactionEvent);
    eventEmitter.on(EventType.TRANSACTION_FAILED, handleTransactionEvent);
    
    // Clean up event listeners
    return () => {



      eventEmitter.off(EventType.TRANSACTION_PENDING, handleTransactionEvent);
      eventEmitter.off(EventType.TRANSACTION_CONFIRMED, handleTransactionEvent);
      eventEmitter.off(EventType.TRANSACTION_FAILED, handleTransactionEvent);
    };
  }, [limit]);
  
  return transactions;
}

/**
 * Hook to track a specific transaction
 */
export function useTransaction(id: string | null) {
  const [transaction, setTransaction] = useState<Transaction | null>(
    id ? transactionService.getTransaction(id) : null
  );
  
  useEffect(() => {
    if (!id) {
      setTransaction(null);
      return;
    }
    
    // Get initial transaction
    setTransaction(transactionService.getTransaction(id));
    
    // Set up event listeners to update transaction
    const handleTransactionEvent = () => {
      setTransaction(transactionService.getTransaction(id));
    };
    



    eventEmitter.on(EventType.TRANSACTION_PENDING, handleTransactionEvent);
    eventEmitter.on(EventType.TRANSACTION_CONFIRMED, handleTransactionEvent);
    eventEmitter.on(EventType.TRANSACTION_FAILED, handleTransactionEvent);
    
    // Clean up event listeners
    return () => {



      eventEmitter.off(EventType.TRANSACTION_PENDING, handleTransactionEvent);
      eventEmitter.off(EventType.TRANSACTION_CONFIRMED, handleTransactionEvent);
      eventEmitter.off(EventType.TRANSACTION_FAILED, handleTransactionEvent);
    };
  }, [id]);
  
  return transaction;
}

// Export everything
export default transactionService;