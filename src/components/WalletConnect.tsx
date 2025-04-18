import { useConnect, useDisconnect } from 'wagmi';
import { useWallet } from '../contexts/WalletContext';

export const WalletConnect = () => {
  const { connect, connectors, isLoading: isConnectLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const { 
    address, 
    isConnected, 
    isAuthenticated, 
    isLoading, 
    error, 
    signIn, 
    signOut 
  } = useWallet();
  
  const handleConnect = (connector: any) => {
    connect({ connector });
  };
  
  const handleDisconnect = () => {
    signOut();
    disconnect();
  };
  
  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };
  
  return (
    <div className="wallet-connect">
      {isConnected ? (
        <div>
          <p>Connected: {address}</p>
          {isAuthenticated ? (
            <button onClick={handleDisconnect}>Disconnect</button>
          ) : (
            <button 
              onClick={handleSignIn} 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign Message to Login'}
            </button>
          )}
        </div>
      ) : (
        <div>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isConnectLoading}
            >
              Connect {connector.name}
            </button>
          ))}
        </div>
      )}
      
      {error && <p className="error">{error.message}</p>}
    </div>
  );
};