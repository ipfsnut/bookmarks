import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useWallet();
  
  if (isLoading) {
    return <div>Loading authentication status...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};