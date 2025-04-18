import { useState, useEffect } from 'react';
import { useConnect, useDisconnect, useAccount } from 'wagmi';
import { useWallet } from '../contexts/WalletContext';

// Simple loading indicator component
const LoadingIndicator = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px',
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '3px solid rgba(0, 0, 0, 0.1)',
        borderTop: '3px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '8px'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ margin: 0, fontSize: '14px' }}>{message}</p>
    </div>
  );
};

// Debug info component
const DebugInfo = ({ data }: { data: any }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div style={{
      margin: '20px 0',
      padding: '10px',
      border: '1px dashed #ccc',
      borderRadius: '4px',
      backgroundColor: '#f8f8f8',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ 
          cursor: 'pointer', 
          fontWeight: 'bold', 
          marginBottom: expanded ? '10px' : 0 
        }}
      >
        🔍 Debug Info {expanded ? '(click to hide)' : '(click to expand)'}
      </div>
      
      {expanded && (
        <pre style={{ 
          overflow: 'auto', 
          maxHeight: '200px',
          margin: 0,
          padding: '10px',
          backgroundColor: '#eee'
        }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export const WalletConnect = () => {
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const wagmiAccount = useAccount();
  
  const { 
    address, 
    isConnected, 
    isAuthenticated, 
    isLoading, 
    error, 
    signIn, 
    signOut 
  } = useWallet();
  
  const [connectingConnector, setConnectingConnector] = useState<string | null>(null);
  const [signingStatus, setSigningStatus] = useState<string>('');
  const [debugLogs, setDebugLogs] = useState<any[]>([]);
  
  // Add debug logs when component state changes
  useEffect(() => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      walletContext: {
        address,
        isConnected,
        isAuthenticated,
        isLoading,
        hasError: !!error
      },
      wagmiAccount: {
        address: wagmiAccount.address,
        isConnected: wagmiAccount.isConnected,
        status: wagmiAccount.status
      },
      connectInfo: {
        isPending: isConnectPending,
        connectingConnector,
        availableConnectors: connectors.map(c => ({
          id: c.id,
          name: c.name
        }))
      }
    };
    
    console.log('WalletConnect state updated:', debugInfo);
    setDebugLogs(prev => [debugInfo, ...prev].slice(0, 5));
  }, [
    address, 
    isConnected, 
    isAuthenticated, 
    isLoading, 
    error, 
    wagmiAccount.address, 
    wagmiAccount.isConnected,
    isConnectPending,
    connectingConnector,
    connectors
  ]);
  
  const handleConnect = (connector: any) => {
    console.log('Attempting to connect with:', connector.id, connector.name);
    setConnectingConnector(connector.id);
    
    try {
      // In newer wagmi versions, connect doesn't return a result object
      connect({ connector });
      
      // Log success message
      console.log('Connection initiated');
      
      // Set a timeout to clear the connecting state
      setTimeout(() => {
        setConnectingConnector(null);
        console.log('Connection settled');
      }, 1000);
    } catch (err) {
      console.error(`Error triggering connect:`, err);
      setTimeout(() => setConnectingConnector(null), 1000);
    }
  };    const handleDisconnect = () => {
    console.log('Disconnecting wallet');
    signOut();
    disconnect();
  };
  const handleSignIn = async () => {
    console.log('Starting sign in process');
    try {
      setSigningStatus('Requesting signature from your wallet...');
      console.log('About to call signIn() from WalletContext');
      
      // Improved fetch interceptor that doesn't consume the response
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        console.log('Fetch request:', args);
        const response = await originalFetch(...args);
        
        // Create a clone before reading the response
        const cloneForLogging = response.clone();
        
        // Log the response without affecting the original
        cloneForLogging.text().then(text => {
          try {
            const data = JSON.parse(text);
            console.log('Fetch response (JSON):', data);
          } catch (e) {
            console.log('Fetch response (text):', text);
          }
        }).catch(err => {
          console.log('Error reading response:', err);
        });
        
        // Return the original response untouched
        return response;
      };
      
      try {
        await signIn();
        console.log('Sign in completed successfully');
      } finally {
        // Restore original fetch
        window.fetch = originalFetch;
      }
      
      setSigningStatus('');
    } catch (error) {
      console.error('Error signing in:', error);
      setSigningStatus('');
    }
  };    // Format address for display - handles undefined case
  const formatAddress = (addr: string | undefined): string => {
    if (!addr) return 'Not connected';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };
  
  // Create debug data object
  const debugData = {
    walletContextState: {
      address,
      isConnected,
      isAuthenticated,
      isLoading,
      hasError: error ? true : false,
      errorMessage: error?.message
    },
    wagmiState: {
      address: wagmiAccount.address,
      isConnected: wagmiAccount.isConnected,
      status: wagmiAccount.status
    },
    connectState: {
      isPending: isConnectPending,
      connectingConnector,
      availableConnectors: connectors.map(c => ({
        id: c.id,
        name: c.name
      }))
    },
    logs: debugLogs
  };
  
  return (
    <div className="wallet-connect" style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      {/* Debug section */}
      <DebugInfo data={debugData} />
      
      {isLoading && signingStatus && (
        <div style={{ marginBottom: '20px' }}>
          <LoadingIndicator message={signingStatus} />
        </div>
      )}
      
      {isConnected ? (
        <div style={{ 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '20px', 
          backgroundColor: '#f8f9fa' 
        }}>
          <p style={{ margin: '0 0 8px 0' }}><strong>Connected:</strong></p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#eee',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>
              {formatAddress(address)}
            </span>
            <button 
              onClick={() => {
                if (address) {
                  navigator.clipboard.writeText(address);
                  alert('Address copied to clipboard!');
                }
              }}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#0066cc'
              }}
            >
              Copy
            </button>
          </div>
          
          {isAuthenticated ? (
            <button 
              onClick={handleDisconnect}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 15px',
                borderRadius: '4px',
                marginTop: '10px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 'bold'
              }}
            >
              Disconnect Wallet
            </button>
          ) : (
            <div>
              <button 
                onClick={handleSignIn} 
                disabled={isLoading}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 15px',
                  borderRadius: '4px',
                  marginTop: '10px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: isLoading ? 0.7 : 1,
                  fontWeight: 'bold'
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign Message to Login'}
              </button>
              <p style={{fontSize: '12px', color: '#666', marginTop: '8px'}}>
                Click this button to trigger the signature request
              </p>
            </div>
          )}
          
          {isAuthenticated && (
            <p style={{ 
              fontSize: '13px', 
              color: '#28a745', 
              margin: '10px 0 0 0', 
              textAlign: 'center' 
            }}>
              ✓ Successfully authenticated
            </p>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '10px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Connect Your Wallet</h3>
          
          {connectingConnector && (
            <LoadingIndicator message={`Connecting to wallet...`} />
          )}
          
          {!connectingConnector && connectors.map((connector) => {
            // Determine connector-specific styles and text
            const isMetaMask = connector.id === 'injected';
            const bgColor = isMetaMask ? '#f6851b' : '#1da1f2';
            const icon = isMetaMask ? '🦊' : '🔗';
            const buttonText = isMetaMask ? 
              'Connect with MetaMask' : 
              `Connect with ${connector.name}`;
            
            return (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isConnectPending}
                style={{ 
                  padding: '12px 15px', 
                  margin: '5px 0',
                  backgroundColor: bgColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isConnectPending ? 'not-allowed' : 'pointer',
                  opacity: isConnectPending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '15px'
                }}
              >
                <span style={{ marginRight: '8px' }}>{icon}</span>
                {buttonText}
                {isConnectPending && ' (connecting...)'}
              </button>
            );
          })}
          
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginTop: '15px', 
            textAlign: 'center' 
          }}>
            Connect your wallet to access all features
          </p>
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: '#721c24',
          backgroundColor: '#f8d7da',
          padding: '12px 15px',
          marginTop: '15px',
          borderRadius: '4px',
          borderLeft: '4px solid #f5c6cb',
          fontSize: '14px'
        }}>
          <strong>Error:</strong> {error.message}
        </div>
      )}
    </div>
  );
};