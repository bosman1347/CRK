import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from './components/ui/sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateTournament from './pages/CreateTournament';
import TournamentDetail from './pages/TournamentDetail';
import MatchScore from './pages/MatchScore';
import RoundScoreEntry from './pages/RoundScoreEntry';
import UmpireDashboard from './pages/UmpireDashboard';
import UmpireTournament from './pages/UmpireTournament';
import PublicStandings from './pages/PublicStandings';
import PublicSummary from './pages/PublicSummary';
import Settings from './pages/Settings';
// Championship imports
import CreateChampionship from './pages/CreateChampionship';
import ChampionshipManage from './pages/ChampionshipManage';
import ChampionshipScoreEntry from './pages/ChampionshipScoreEntry';
import PublicChampionshipStandings from './pages/PublicChampionshipStandings';
// Archive import
import Archives from './pages/Archives';
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
  // Allow all authenticated users (organizers can also manage tournaments)
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
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/match/:token" element={<MatchScore />} />
      <Route path="/round/:token" element={<RoundScoreEntry />} />
      <Route path="/umpire" element={<UmpireRoute><UmpireDashboard /></UmpireRoute>} />
      <Route path="/umpire/tournaments/:id" element={<UmpireRoute><UmpireTournament /></UmpireRoute>} />
      <Route path="/standings/:id" element={<PublicStandings />} />
      <Route path="/summary/:id" element={<PublicSummary />} />
      {/* Championship routes */}
      <Route path="/championships/create" element={<PrivateRoute><CreateChampionship /></PrivateRoute>} />
      <Route path="/championships/:id" element={<PrivateRoute><ChampionshipManage /></PrivateRoute>} />
      <Route path="/championship-round/:token" element={<ChampionshipScoreEntry />} />
      <Route path="/championship-standings/:id" element={<PublicChampionshipStandings />} />
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