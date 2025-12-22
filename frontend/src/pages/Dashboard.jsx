import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Trophy, LogOut, Calendar, Users, Settings } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${API}/tournaments`, {
        headers: getAuthHeader()
      });
      setTournaments(response.data);
    } catch (error) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = (status) => {
    const badges = {
      setup: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700'
    };
    return badges[status] || badges.setup;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <img src={CLUB_LOGO} alt="Centurion Lawn Bowls Club" className="w-20 h-20 object-contain bg-white/10 rounded-lg p-1" />
              <div>
                <h1 className="text-3xl md:text-4xl font-heading mb-1" data-testid="dashboard-title">Centurion Lawn Bowls Club</h1>
                <p className="text-sm text-emerald-200">Centurion Rolbalklub</p>
                <p className="text-lg text-emerald-100 mt-1">Welcome back, {user?.name}</p>
                <Button
                  onClick={() => navigate('/umpire')}
                  variant="outline"
                  className="mt-3 bg-white/10 text-white border-white/30 hover:bg-white/20"
                  data-testid="umpire-dashboard-button"
                >
                  Manage Tournaments
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                data-testid="settings-button"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-heading">Your Tournaments</h2>
          <Button
            onClick={() => navigate('/tournaments/create')}
            className="bg-primary hover:bg-primary/90"
            data-testid="create-tournament-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12" data-testid="loading-state">
            <p className="text-muted-foreground">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="floating-card border-stone-200" data-testid="empty-state">
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading mb-2">No tournaments yet</h3>
              <p className="text-muted-foreground mb-6">Create your first lawn bowls tournament to get started</p>
              <Button
                onClick={() => navigate('/tournaments/create')}
                className="bg-primary hover:bg-primary/90"
                data-testid="empty-create-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Tournament
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="tournament-grid">
            {tournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="floating-card border-stone-200 cursor-pointer"
                onClick={() => navigate(`/tournaments/${tournament.id}`)}
                data-testid={`tournament-card-${tournament.id}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Trophy className="w-10 h-10 text-primary" />
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(tournament.status)}`}>
                      {tournament.status}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-heading">{tournament.name}</CardTitle>
                  <CardDescription>Created {new Date(tournament.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="stats-number">Round {tournament.current_round}/{tournament.num_rounds || 7}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;