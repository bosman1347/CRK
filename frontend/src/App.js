import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateTournament from './pages/CreateTournament';
import TournamentDetail from './pages/TournamentDetail';
import MatchScore from './pages/MatchScore';
import UmpireDashboard from './pages/UmpireDashboard';
import UmpireTournament from './pages/UmpireTournament';
import PublicStandings from './pages/PublicStandings';
import PublicSummary from './pages/PublicSummary';
import Settings from './pages/Settings';
import '@/App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const UmpireRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) return <Navigate to="/login" />;
  if (!user.is_umpire) return <Navigate to="/" />;
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/tournaments/create" element={<PrivateRoute><CreateTournament /></PrivateRoute>} />
      <Route path="/tournaments/:id" element={<PrivateRoute><TournamentDetail /></PrivateRoute>} />
      <Route path="/match/:token" element={<MatchScore />} />
      <Route path="/umpire" element={<UmpireRoute><UmpireDashboard /></UmpireRoute>} />
      <Route path="/umpire/tournaments/:id" element={<UmpireRoute><UmpireTournament /></UmpireRoute>} />
      <Route path="/standings/:id" element={<PublicStandings />} />
      <Route path="/summary/:id" element={<PublicSummary />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="App">
          <AppRoutes />
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;