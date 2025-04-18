export interface User {
  id: string;
  walletAddress: string;
  fid?: number;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  userId: string;
  walletAddress: string;
  token: string;
  expiresAt: string;
}

export interface TokenBalance {
  userId: string;
  amount: number;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  reason: string;
  createdAt: string;
}