import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { WalletConnect } from "./components/WalletConnect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { UserProfile } from "./components/UserProfile";
import { useWallet } from "./contexts/WalletContext";

// Simple Home component
function Home() {
  return (
    <div>
      <h1>Home Page</h1>
      <WalletConnect />
      <div style={{ marginTop: "20px" }}>
        <Link to="/dashboard">Go to Dashboard</Link>
      </div>
    </div>
  );
}

// Simple Dashboard component
function Dashboard() {
  const { address } = useAccount();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Connected wallet: {address}</p>
      <UserProfile />
      <div style={{ marginTop: "20px" }}>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Let Farcaster Frame know the app is ready
    sdk.actions.ready();
  }, []);

  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;