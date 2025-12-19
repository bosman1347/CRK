import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Play, ChevronRight, Medal } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TournamentDetail = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [currentMatches, setCurrentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tournamentRes, teamsRes, roundsRes] = await Promise.all([
        axios.get(`${API}/tournaments/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/tournaments/${id}/teams`, { headers: getAuthHeader() }),
        axios.get(`${API}/tournaments/${id}/rounds`, { headers: getAuthHeader() })
      ]);

      setTournament(tournamentRes.data);
      setTeams(teamsRes.data.sort((a, b) => b.total_points - a.total_points));
      setRounds(roundsRes.data);

      if (roundsRes.data.length > 0) {
        const currentRound = roundsRes.data[roundsRes.data.length - 1];
        const matchesRes = await axios.get(`${API}/rounds/${currentRound.id}/matches`, { headers: getAuthHeader() });
        setCurrentMatches(matchesRes.data);
      }
    } catch (error) {
      toast.error('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  // Tournament management is now handled by umpire

  const getMatchStatusBadge = (match) => {
    if (match.status === 'completed') {
      return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
    } else if (match.status === 'in_progress') {
      return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">Pending</Badge>;
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading tournament...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Tournament not found</p>
      </div>
    );
  }

  const allMatchesCompleted = currentMatches.length > 0 && currentMatches.every(m => m.status === 'completed');
  const canGenerateNextRound = tournament.status === 'active' && tournament.current_round < 7 && allMatchesCompleted;

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
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="tournament-name">{tournament.name}</h1>
              <p className="text-lg text-emerald-100">Round {tournament.current_round} of 7</p>
            </div>
            {tournament.status === 'setup' && tournament.umpire_name && (
              <div className="text-right">
                <p className="text-emerald-100 text-sm">Umpire: {tournament.umpire_name}</p>
                <p className="text-emerald-200 text-xs">Waiting for umpire to start tournament</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <Tabs defaultValue="leaderboard" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-list">
            <TabsTrigger value="leaderboard" data-testid="leaderboard-tab">Leaderboard</TabsTrigger>
            <TabsTrigger value="matches" data-testid="matches-tab">Current Matches</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" data-testid="leaderboard-content">
            <Card className="floating-card border-stone-200">
              <CardHeader>
                <CardTitle className="text-2xl font-heading flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-secondary" />
                  Tournament Standings
                </CardTitle>
                <CardDescription>Teams ranked by total match points</CardDescription>
              </CardHeader>
              <CardContent>
                {teams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No teams yet</p>
                ) : (
                  <div className="space-y-3">
                    {teams.map((team, index) => (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          index === 0 ? 'gradient-gold text-white border-amber-500' :
                          index === 1 ? 'bg-gray-100 border-gray-300' :
                          index === 2 ? 'bg-orange-50 border-orange-300' :
                          'bg-white border-stone-200'
                        }`}
                        data-testid={`team-rank-${index + 1}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-white text-amber-500' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-200 text-orange-700' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {index < 3 ? <Medal className="w-5 h-5" /> : index + 1}
                          </div>
                          <div>
                            <p className={`font-semibold text-lg ${index === 0 ? 'text-white' : 'text-foreground'}`}>
                              {team.name}
                            </p>
                            <p className={`text-sm ${index === 0 ? 'text-white/80' : 'text-muted-foreground'}`}>
                              {team.matches_played} matches played
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-mono font-bold ${index === 0 ? 'text-white' : 'text-foreground'}`}>
                            {team.total_points.toFixed(1)}
                          </p>
                          <p className={`text-sm ${index === 0 ? 'text-white/80' : 'text-muted-foreground'}`}>points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" data-testid="matches-content">
            {tournament.status === 'setup' ? (
              <Card className="floating-card border-stone-200">
                <CardContent className="py-12 text-center">
                  <Play className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-heading mb-2">Tournament Not Started</h3>
                  <p className="text-muted-foreground mb-6">Click "Start Tournament" to generate the first round</p>
                </CardContent>
              </Card>
            ) : currentMatches.length === 0 ? (
              <Card className="floating-card border-stone-200">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No matches in current round</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-heading">Round {tournament.current_round} Matches</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentMatches.map((match) => (
                    <Card
                      key={match.id}
                      className="floating-card border-stone-200 cursor-pointer"
                      onClick={() => navigate(`/matches/${match.id}/score`)}
                      data-testid={`match-card-${match.id}`}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <Badge className={`rink-badge ${getRinkColor(match.green)}`}>
                              Green {match.green}
                            </Badge>
                            <Badge className="rink-badge bg-stone-100 text-stone-700">
                              Rink {match.rink}
                            </Badge>
                          </div>
                          {getMatchStatusBadge(match)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                          <span className="font-medium">{match.team1_name}</span>
                          {match.status === 'completed' && (
                            <span className="font-mono font-bold text-lg">{match.team1_match_points.toFixed(1)}</span>
                          )}
                        </div>
                        <div className="text-center text-sm text-muted-foreground font-medium">vs</div>
                        <div className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                          <span className="font-medium">{match.team2_name}</span>
                          {match.status === 'completed' && (
                            <span className="font-mono font-bold text-lg">{match.team2_match_points.toFixed(1)}</span>
                          )}
                        </div>
                        {match.status !== 'completed' && (
                          <div className="pt-2">
                            <Button className="w-full bg-primary hover:bg-primary/90" size="sm" data-testid={`enter-scores-${match.id}`}>
                              Enter Scores
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TournamentDetail;