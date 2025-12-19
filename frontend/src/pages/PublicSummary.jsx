import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Trophy, Medal, Calendar } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PublicSummary = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/public/tournaments/${id}/summary`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading summary...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-heading mb-2">Tournament Not Found</h3>
            <p className="text-muted-foreground">Invalid tournament link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tournament, teams, rounds, verified_matches } = data;
  const isComplete = tournament.current_round === 7 && verified_matches.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="tournament-name">{tournament.name}</h1>
          <p className="text-lg text-emerald-100">Tournament Summary</p>
          <div className="flex gap-3 mt-4">
            <Badge className="bg-white/20 text-white border-white/30 text-base">
              {rounds.length} Rounds Played
            </Badge>
            <Badge className="bg-white/20 text-white border-white/30 text-base">
              {verified_matches.length} Verified Matches
            </Badge>
            {isComplete && (
              <Badge className="bg-green-500 text-white text-base">Tournament Complete</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="standings" className="space-y-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="standings" data-testid="standings-tab">Final Standings</TabsTrigger>
              <TabsTrigger value="matches" data-testid="matches-tab">Match Results</TabsTrigger>
            </TabsList>

            <TabsContent value="standings" data-testid="standings-content">
              <Card className="floating-card border-stone-200">
                <CardHeader>
                  <CardTitle className="text-3xl font-heading flex items-center gap-3">
                    <Trophy className="w-10 h-10 text-secondary" />
                    Final Standings
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isComplete ? 'Tournament Champion and final rankings' : 'Current tournament standings'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teams.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No standings available yet</p>
                  ) : (
                    <div className="space-y-3">
                      {teams.map((team, index) => (
                        <div
                          key={team.id}
                          className={`flex items-center justify-between p-6 rounded-xl border transition-all ${
                            index === 0 ? 'gradient-gold text-white border-amber-500 shadow-lg scale-105' :
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
                                {index === 0 && isComplete && (
                                  <span className="ml-2 text-sm font-normal">🏆 Champion</span>
                                )}
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="matches" data-testid="matches-content">
              <div className="space-y-8">
                {rounds.map((round) => {
                  const roundMatches = verified_matches.filter(m => m.round_id === round.id);
                  if (roundMatches.length === 0) return null;

                  return (
                    <Card key={round.id} className="floating-card border-stone-200">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-2xl font-heading flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-primary" />
                            Round {round.round_number}
                          </CardTitle>
                          <Badge className="bg-green-100 text-green-700">
                            {roundMatches.length} Matches
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {roundMatches.map((match) => (
                            <div
                              key={match.id}
                              className="p-4 border border-stone-200 rounded-lg bg-white"
                              data-testid={`match-${match.id}`}
                            >
                              <div className="flex gap-2 mb-3">
                                <Badge className={`rink-badge text-xs ${getRinkColor(match.green)}`}>
                                  Green {match.green}
                                </Badge>
                                <Badge className="rink-badge text-xs bg-stone-100 text-stone-700">
                                  Rink {match.rink}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm">{match.team1_name}</span>
                                  <span className="font-mono font-bold text-primary">{match.team1_match_points.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm">{match.team2_name}</span>
                                  <span className="font-mono font-bold text-primary">{match.team2_match_points.toFixed(1)}</span>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-stone-200">
                                <p className="text-xs text-muted-foreground">
                                  Winner: <span className="font-semibold text-foreground">
                                    {match.team1_match_points > match.team2_match_points ? match.team1_name :
                                     match.team2_match_points > match.team1_match_points ? match.team2_name :
                                     'Draw'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {verified_matches.length === 0 && (
                <Card className="floating-card border-stone-200">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-heading mb-2">No Matches Yet</h3>
                    <p className="text-muted-foreground">Match results will appear once verified by the umpire</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default PublicSummary;