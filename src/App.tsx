import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { WalletConnect } from "./components/WalletConnect";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { UserProfile } from "./components/UserProfile";
import { BookmarkForm } from "./components/BookmarkForm";
import { BookmarkList } from "./components/BookmarkList";
import { useWallet } from "./contexts/WalletContext";
import BookmarkDetailPage from "./pages/BookmarkDetail";
import TokenManagementPage from "./pages/TokenManagement";
import LeaderboardPage from "./pages/LeaderboardPage";

// Simple Home component
function Home() {
  return (
    <div>
      <h1>Bookmarks Platform</h1>
      <p>Share and discover great books with the community!</p>
      <WalletConnect />
      <div style={{ marginTop: "20px" }}>
        <Link to="/dashboard">Go to Dashboard</Link>
      </div>
    </div>
  );
}

// Dashboard component with navigation
function Dashboard() {
  const { address } = useAccount();
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Connected wallet: {address}</p>
      
      <nav style={{ 
        display: 'flex', 
        gap: '20px', 
        marginBottom: '30px',
        padding: '10px 0',
        borderBottom: '1px solid #dee2e6'
      }}>
        <Link to="/dashboard">Overview</Link>
        <Link to="/bookmarks">Browse Bookmarks</Link>
        <Link to="/my-bookmarks">My Bookmarks</Link>
        <Link to="/add-bookmark">Add Bookmark</Link>
        <Link to="/tokens">Manage Tokens</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/profile">My Profile</Link>
      </nav>
      
      <div style={{ marginTop: "20px" }}>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
}

// Bookmarks Browse Page
function BookmarksPage() {
  return (
    <div>
      <Dashboard />
      <BookmarkList sortBy="delegations" />
    </div>
  );
}

// My Bookmarks Page
function MyBookmarksPage() {
  return (
    <div>
      <Dashboard />
      <BookmarkList userOnly={true} />
    </div>
  );
}

// Add Bookmark Page
function AddBookmarkPage() {
  return (
    <div>
      <Dashboard />
      <BookmarkForm 
        onSuccess={(bookmark) => {
          alert(`Bookmark "${bookmark.title}" created successfully!`);
          // Optionally redirect to My Bookmarks page
          window.location.href = '/my-bookmarks';
        }}
      />
    </div>
  );
}

// Profile Page
function ProfilePage() {
  return (
    <div>
      <Dashboard />
      <UserProfile />
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
        
        <Route path="/bookmarks" element={
          <ProtectedRoute>
            <BookmarksPage />
          </ProtectedRoute>
        } />
        
        <Route path="/my-bookmarks" element={
          <ProtectedRoute>
            <MyBookmarksPage />
          </ProtectedRoute>
        } />
        
        <Route path="/add-bookmark" element={
          <ProtectedRoute>
            <AddBookmarkPage />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        
        {/* Add the new route for bookmark details */}
        <Route path="/bookmark/:id" element={
          <ProtectedRoute>
            <BookmarkDetailPage />
          </ProtectedRoute>
        } />
        
        {/* Add the new route for token management */}
        <Route path="/tokens" element={
          <ProtectedRoute>
            <TokenManagementPage />
          </ProtectedRoute>
        } />
        
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;