import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, Medal, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicStandings = () => {
  const { id } = useParams();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchStandings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStandings, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchStandings = async () => {
    try {
      const response = await axios.get(`${API}/public/tournaments/${id}/standings`);
      setTeams(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load standings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading standings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="standings-title">Live Standings</h1>
              <p className="text-lg text-emerald-100">Tournament Leaderboard</p>
            </div>
            <Button
              onClick={fetchStandings}
              variant="outline"
              className="bg-white/10 text-white border-white/30 hover:bg-white/20"
              data-testid="refresh-button"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
            <Badge className="bg-green-100 text-green-700">Live</Badge>
          </div>

          {teams.length === 0 ? (
            <Card className="floating-card border-stone-200">
              <CardContent className="py-12 text-center">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-heading mb-2">No Standings Yet</h3>
                <p className="text-muted-foreground">Standings will appear once matches are verified</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="floating-card border-stone-200">
              <CardHeader>
                <CardTitle className="text-3xl font-heading flex items-center gap-3">
                  <Trophy className="w-10 h-10 text-secondary" />
                  Tournament Standings
                </CardTitle>
                <CardDescription className="text-base">Based on verified matches only</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teams.map((team, index) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-6 rounded-xl border transition-all ${
                        index === 0 ? 'gradient-gold text-white border-amber-500 shadow-lg' :
                        index === 1 ? 'bg-gray-100 border-gray-300' :
                        index === 2 ? 'bg-orange-50 border-orange-300' :
                        'bg-white border-stone-200'
                      }`}
                      data-testid={`team-rank-${index + 1}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0 ? 'bg-white text-amber-500' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-200 text-orange-700' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {index < 3 ? <Medal className="w-7 h-7" /> : index + 1}
                        </div>
                        <div>
                          <p className={`font-bold text-xl mb-1 ${index === 0 ? 'text-white' : 'text-foreground'}`}>
                            {team.name}
                          </p>
                          <p className={`text-sm ${index === 0 ? 'text-white/90' : 'text-muted-foreground'}`}>
                            {team.matches_played} matches • {team.matches_won} wins
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-4xl font-mono font-bold ${index === 0 ? 'text-white' : 'text-foreground'}`}>
                          {team.total_points.toFixed(1)}
                        </p>
                        <p className={`text-sm ${index === 0 ? 'text-white/90' : 'text-muted-foreground'}`}>points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
            <p className="text-sm text-blue-900">
              Standings update automatically every 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStandings;