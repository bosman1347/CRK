import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trophy, LogOut, Calendar, Users, Settings, Crown, Archive, Trash2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const Dashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: null, item: null });
  const { user, logout, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tournamentsRes, championshipsRes] = await Promise.all([
        axios.get(`${API}/tournaments`, { headers: getAuthHeader() }),
        axios.get(`${API}/championships`, { headers: getAuthHeader() })
      ]);
      setTournaments(tournamentsRes.data);
      setChampionships(championshipsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openDeleteDialog = (type, item, e) => {
    e.stopPropagation(); // Prevent card click navigation
    setDeleteDialog({ open: true, type, item });
  };

  const handleDelete = async () => {
    const { type, item } = deleteDialog;
    try {
      if (type === 'tournament') {
        await axios.delete(`${API}/tournaments/${item.id}`, { headers: getAuthHeader() });
        toast.success('Tournament deleted');
      } else {
        await axios.delete(`${API}/championships/${item.id}`, { headers: getAuthHeader() });
        toast.success('Championship deleted');
      }
      setDeleteDialog({ open: false, type: null, item: null });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      setup: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      round_robin: 'bg-emerald-100 text-emerald-700',
      knockout: 'bg-amber-100 text-amber-700',
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
              <img src={CLUB_LOGO} alt="Centurion Bowls Club" className="w-20 h-20 object-contain bg-white/10 rounded-lg p-1" />
              <div>
                <h1 className="text-2xl md:text-3xl font-heading" data-testid="dashboard-title">Centurion Bowls Club</h1>
                <p className="text-2xl md:text-3xl font-heading text-emerald-200">Centurion Rolbalklub</p>
                <p className="text-base text-emerald-100 mt-2">Welcome back, {user?.name}</p>
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
                onClick={() => navigate('/archives')}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archives
              </Button>
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
        {/* Championships Section */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              Club Championships
            </h2>
            <Button
              onClick={() => navigate('/championships/create')}
              className="bg-amber-500 hover:bg-amber-600"
              data-testid="create-championship-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Championship
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : championships.length === 0 ? (
            <Card className="floating-card border-amber-200 bg-amber-50/50">
              <CardContent className="py-8 text-center">
                <Crown className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                <h3 className="text-lg font-heading mb-2">No Championships Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Create a club championship for singles, pairs, triples, or fours</p>
                <Button
                  onClick={() => navigate('/championships/create')}
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Championship
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {championships.map((championship) => (
                <Card
                  key={championship.id}
                  className="floating-card border-amber-200 cursor-pointer hover:border-amber-300 transition-colors"
                  onClick={() => navigate(`/championships/${championship.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Crown className="w-10 h-10 text-amber-500" />
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(championship.status)}`}>
                        {championship.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-heading">{championship.name}</CardTitle>
                    <CardDescription>
                      <span className="capitalize">{championship.competition_type}</span> • <span className="capitalize">{championship.gender_category}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="capitalize">{championship.current_stage.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tournaments Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Social Tournaments
            </h2>
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
            <p className="text-muted-foreground">Loading...</p>
          ) : tournaments.length === 0 ? (
            <Card className="floating-card border-stone-200">
              <CardContent className="py-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-heading mb-2">No Tournaments Yet</h3>
                <p className="text-muted-foreground text-sm mb-4">Create a social tournament with Skins or Standard scoring</p>
                <Button
                  onClick={() => navigate('/tournaments/create')}
                  variant="outline"
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
    </div>
  );
};

export default Dashboard;