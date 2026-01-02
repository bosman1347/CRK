import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Calendar } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = process.env.REACT_APP_CLUB_LOGO_URL || "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const UmpireDashboard = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${API}/umpire/tournaments`, {
        headers: getAuthHeader()
      });
      setTournaments(response.data);
    } catch (error) {
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
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
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <img src={CLUB_LOGO} alt="Centurion Bowls Club" className="w-16 h-16 object-contain bg-white/10 rounded-lg p-1" />
            <div>
              <h1 className="text-2xl md:text-3xl font-heading" data-testid="umpire-dashboard-title">Tournament Management</h1>
              <p className="text-base text-emerald-200">Centurion Bowls Club • Centurion Rolbalklub</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <h2 className="text-2xl font-heading mb-8">Your Tournaments</h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tournaments...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <Card className="floating-card border-stone-200">
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading mb-2">No tournaments assigned</h3>
              <p className="text-muted-foreground">Tournament organizers will assign you to tournaments</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="floating-card border-stone-200 cursor-pointer"
                onClick={() => navigate(`/umpire/tournaments/${tournament.id}`)}
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span className="stats-number">Round {tournament.current_round}/{tournament.num_rounds || 7}</span>
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

export default UmpireDashboard;