import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, QrCode, CheckCircle, ChevronRight, Printer, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import PrintableScorecard from '../components/PrintableScorecard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const FRONTEND_URL = window.location.origin;

const UmpireTournament = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingMatch, setVerifyingMatch] = useState(null);
  const [verifyScores, setVerifyScores] = useState({
    skin1_team1_shots: '',
    skin1_team2_shots: '',
    skin2_team1_shots: '',
    skin2_team2_shots: '',
    skin3_team1_shots: '',
    skin3_team2_shots: ''
  });
  const [currentRoundData, setCurrentRoundData] = useState(null);
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const tournamentRes = await axios.get(`${API}/tournaments/${id}`, { headers: getAuthHeader() });
      setTournament(tournamentRes.data);

      const teamsRes = await axios.get(`${API}/tournaments/${id}/teams`, { headers: getAuthHeader() });
      setTeams(teamsRes.data.sort((a, b) => b.total_points - a.total_points));

      if (tournamentRes.data.current_round > 0) {
        const roundsRes = await axios.get(`${API}/tournaments/${id}/rounds`, { headers: getAuthHeader() });
        const currentRoundData = roundsRes.data[roundsRes.data.length - 1];
        setCurrentRound(currentRoundData);
        setCurrentRoundData(currentRoundData);
        const matchesRes = await axios.get(`${API}/umpire/rounds/${currentRoundData.id}/matches`, { headers: getAuthHeader() });
        setMatches(matchesRes.data);
      }
    } catch (error) {
      toast.error('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const generateRound = async () => {
    try {
      await axios.post(`${API}/umpire/tournaments/${id}/rounds/generate`, {}, { headers: getAuthHeader() });
      toast.success('Round generated successfully!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate round');
    }
  };

  const openVerifyDialog = (match) => {
    setVerifyingMatch(match);
    setVerifyScores({
      skin1_team1_shots: match.skin1_team1_shots !== null ? match.skin1_team1_shots : '',
      skin1_team2_shots: match.skin1_team2_shots !== null ? match.skin1_team2_shots : '',
      skin2_team1_shots: match.skin2_team1_shots !== null ? match.skin2_team1_shots : '',
      skin2_team2_shots: match.skin2_team2_shots !== null ? match.skin2_team2_shots : '',
      skin3_team1_shots: match.skin3_team1_shots !== null ? match.skin3_team1_shots : '',
      skin3_team2_shots: match.skin3_team2_shots !== null ? match.skin3_team2_shots : ''
    });
  };

  const verifyMatch = async () => {
    const scores = {
      skin1_team1_shots: parseInt(verifyScores.skin1_team1_shots),
      skin1_team2_shots: parseInt(verifyScores.skin1_team2_shots),
      skin2_team1_shots: parseInt(verifyScores.skin2_team1_shots),
      skin2_team2_shots: parseInt(verifyScores.skin2_team2_shots),
      skin3_team1_shots: parseInt(verifyScores.skin3_team1_shots),
      skin3_team2_shots: parseInt(verifyScores.skin3_team2_shots)
    };

    if (Object.values(scores).some(isNaN)) {
      toast.error('All scores must be valid numbers');
      return;
    }

    try {
      await axios.post(`${API}/umpire/matches/${verifyingMatch.id}/verify`, scores, { headers: getAuthHeader() });
      toast.success('Match verified successfully!');
      setVerifyingMatch(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify match');
    }
  };

  const printDraw = () => {
    if (!currentRoundData || !currentRoundData.access_token) {
      toast.error('Round data not loaded. Please refresh the page.');
      return;
    }
    if (matches.length === 0) {
      toast.error('No matches to print');
      return;
    }
    
    // Trigger print
    setTimeout(() => {
      window.print();
    }, 100);
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

  const allMatchesVerified = matches.length > 0 && matches.every(m => m.verified);
  const canGenerateNextRound = tournament.current_round < 7 && allMatchesVerified;

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12 print:hidden">
        <div className="container mx-auto px-6">
          <Button
            onClick={() => navigate('/umpire')}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Umpire Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="tournament-name">{tournament.name}</h1>
              <p className="text-lg text-emerald-100">Round {tournament.current_round} of 7</p>
            </div>
            <div className="flex gap-3">
              {matches.length > 0 && (
                <>
                  <Button
                    onClick={printDraw}
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                    data-testid="print-button"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print/Download Scorecards
                  </Button>
                </>
              )}
              {tournament.current_round === 0 || canGenerateNextRound ? (
                <Button
                  onClick={generateRound}
                  className="bg-white text-primary hover:bg-emerald-50"
                  data-testid="generate-round-button"
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Generate Round {tournament.current_round + 1}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {tournament.current_round === 0 ? (
          <Card className="floating-card border-stone-200">
            <CardContent className="py-12 text-center">
              <h3 className="text-xl font-heading mb-2">Tournament Not Started</h3>
              <p className="text-muted-foreground mb-6">Click &quot;Generate Round 1&quot; to start the tournament</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="matches" className="space-y-8">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="matches" data-testid="matches-tab">Matches & Verification</TabsTrigger>
              <TabsTrigger value="standings" data-testid="standings-tab">Standings</TabsTrigger>
            </TabsList>

            <TabsContent value="matches" data-testid="matches-content">
              <div className="space-y-6">
                <div className="flex items-center justify-between print:hidden">
                  <h3 className="text-2xl font-heading">Round {tournament.current_round} Matches</h3>
                  <div className="flex gap-3 items-center">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" data-testid="round-qr-button">
                          <QrCode className="w-4 h-4 mr-2" />
                          Show Round QR Code
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Round {tournament.current_round} QR Code</DialogTitle>
                          <DialogDescription>
                            All teams scan this code to enter their match scores
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col items-center space-y-4 py-4">
                          {currentRound && currentRound.access_token && (
                            <>
                              <QRCodeSVG 
                                value={`${FRONTEND_URL}/round/${currentRound.access_token}`} 
                                size={256} 
                              />
                              <div className="text-center">
                                <p className="text-sm font-medium">Round {tournament.current_round}</p>
                                <p className="text-xs text-muted-foreground">{matches.length} matches</p>
                              </div>
                            </>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Badge className={allMatchesVerified ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                      {matches.filter(m => m.verified).length} / {matches.length} Verified
                    </Badge>
                  </div>
                </div>

                <div className="hidden print:block mb-8">
                  <h1 className="text-3xl font-heading mb-2">{tournament.name}</h1>
                  <p className="text-lg">Round {tournament.current_round} Draw</p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {matches.map((match) => (
                    <Card key={match.id} className="floating-card border-stone-200" data-testid={`match-card-${match.id}`}>
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
                          {match.verified ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700">Pending Verification</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-stone-50 rounded-lg">
                            <p className="font-semibold mb-2">{match.team1_name}</p>
                            {match.team1_scores_entered && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">Scores Entered</Badge>
                            )}
                          </div>
                          <div className="p-4 bg-stone-50 rounded-lg">
                            <p className="font-semibold mb-2">{match.team2_name}</p>
                            {match.team2_scores_entered && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">Scores Entered</Badge>
                            )}
                          </div>
                        </div>

                        <div className="print:hidden">

                          {!match.verified && (
                            <Button
                              onClick={() => openVerifyDialog(match)}
                              className="w-full bg-primary hover:bg-primary/90"
                              data-testid={`verify-button-${match.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Verify Match
                            </Button>
                          )}

                          {match.verified && (
                            <div className="col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm font-medium text-green-900 mb-2">Final Scores</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="font-semibold">{match.team1_name}</p>
                                  <p className="text-2xl font-mono font-bold text-primary">{match.team1_match_points.toFixed(1)}</p>
                                  <p className="text-xs text-muted-foreground">{match.team1_skin_points.toFixed(1)} skin points</p>
                                </div>
                                <div>
                                  <p className="font-semibold">{match.team2_name}</p>
                                  <p className="text-2xl font-mono font-bold text-primary">{match.team2_match_points.toFixed(1)}</p>
                                  <p className="text-xs text-muted-foreground">{match.team2_skin_points.toFixed(1)} skin points</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="standings" data-testid="standings-content">
              <Card className="floating-card border-stone-200">
                <CardHeader>
                  <CardTitle className="text-2xl font-heading">Current Standings</CardTitle>
                  <CardDescription>Based on verified matches only - Ranked by skin points, shot difference, shots for</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-stone-200">
                          <th className="text-left py-3 px-2 font-semibold text-sm">Pos</th>
                          <th className="text-left py-3 px-2 font-semibold text-sm">Team</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">P</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">Pts</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">SF</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">SA</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">SD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, index) => (
                          <tr
                            key={team.id}
                            className="border-b border-stone-100 hover:bg-stone-50"
                            data-testid={`team-rank-${index + 1}`}
                          >
                            <td className="py-3 px-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-stone-100 text-stone-700">
                                {index + 1}
                              </div>
                            </td>
                            <td className="py-3 px-2 font-semibold">{team.name}</td>
                            <td className="text-center py-3 px-2 font-mono">{team.matches_played}</td>
                            <td className="text-center py-3 px-2 font-mono font-bold text-primary">{team.total_points.toFixed(1)}</td>
                            <td className="text-center py-3 px-2 font-mono">{team.shots_for || 0}</td>
                            <td className="text-center py-3 px-2 font-mono">{team.shots_against || 0}</td>
                            <td className="text-center py-3 px-2 font-mono font-semibold">{team.shot_difference > 0 ? '+' : ''}{team.shot_difference || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 text-xs text-muted-foreground">
                      <p><strong>P</strong> = Played, <strong>Pts</strong> = Skin Points, <strong>SF</strong> = Shots For, <strong>SA</strong> = Shots Against, <strong>SD</strong> = Shot Difference</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Printable Scorecards (hidden on screen) */}
      {currentRoundData && currentRoundData.access_token && matches.length > 0 && (
        <div className="hidden print:block">
          <PrintableScorecard
            round={currentRoundData}
            matches={matches}
            qrUrl={`${FRONTEND_URL}/round/${currentRoundData.access_token}`}
            tournamentName={tournament.name}
          />
        </div>
      )}

      {/* Verify Match Dialog */}
      {verifyingMatch && (
        <Dialog open={!!verifyingMatch} onOpenChange={() => setVerifyingMatch(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Verify Match Scores</DialogTitle>
              <DialogDescription>
                Review and confirm scores from paper scorecard
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4 overflow-y-auto flex-1">
              <div>
                <h4 className="font-semibold mb-2">{verifyingMatch.team1_name} vs {verifyingMatch.team2_name}</h4>
                <p className="text-sm text-muted-foreground">Green {verifyingMatch.green} - Rink {verifyingMatch.rink}</p>
                {verifyingMatch.team1_scores_entered && verifyingMatch.team2_scores_entered && (
                  <Badge className="bg-blue-100 text-blue-700 mt-2">Both teams entered scores</Badge>
                )}
              </div>

              {['skin1', 'skin2', 'skin3'].map((skin, idx) => {
                const team1Original = verifyingMatch[`${skin}_team1_shots`];
                const team2Original = verifyingMatch[`${skin}_team2_shots`];
                const team1Current = verifyScores[`${skin}_team1_shots`];
                const team2Current = verifyScores[`${skin}_team2_shots`];
                
                return (
                  <div key={skin} className="space-y-3">
                    <h5 className="font-semibold">Skin {idx + 1} (Ends {idx * 5 + 1}-{idx * 5 + 5})</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{verifyingMatch.team1_name}</Label>
                        {team1Original !== null && (
                          <div className="text-xs text-muted-foreground mb-1">
                            <Badge className="bg-blue-100 text-blue-700">Player entered: {team1Original}</Badge>
                          </div>
                        )}
                        <Input
                          type="number"
                          min="0"
                          value={team1Current}
                          onChange={(e) => setVerifyScores({ ...verifyScores, [`${skin}_team1_shots`]: e.target.value })}
                          data-testid={`${skin}-team1-input`}
                          className={team1Original !== null && parseInt(team1Current) !== team1Original ? 'border-amber-500 bg-amber-50' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{verifyingMatch.team2_name}</Label>
                        {team2Original !== null && (
                          <div className="text-xs text-muted-foreground mb-1">
                            <Badge className="bg-blue-100 text-blue-700">Player entered: {team2Original}</Badge>
                          </div>
                        )}
                        <Input
                          type="number"
                          min="0"
                          value={team2Current}
                          onChange={(e) => setVerifyScores({ ...verifyScores, [`${skin}_team2_shots`]: e.target.value })}
                          data-testid={`${skin}-team2-input`}
                          className={team2Original !== null && parseInt(team2Current) !== team2Original ? 'border-amber-500 bg-amber-50' : ''}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setVerifyingMatch(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={verifyMatch} className="flex-1 bg-primary hover:bg-primary/90" data-testid="confirm-verify-button">
                Verify & Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UmpireTournament;