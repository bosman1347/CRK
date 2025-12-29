import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, QrCode, CheckCircle, ChevronRight, Printer, Eye, Trophy, Archive } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import PrintableScorecard from '../components/PrintableScorecard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const FRONTEND_URL = window.location.origin;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const UmpireTournament = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingMatch, setVerifyingMatch] = useState(null);
  
  // Skins verification scores
  const [verifyScores, setVerifyScores] = useState({
    skin1_team1_shots: '',
    skin1_team2_shots: '',
    skin2_team1_shots: '',
    skin2_team2_shots: '',
    skin3_team1_shots: '',
    skin3_team2_shots: ''
  });
  
  // Standard verification scores
  const [standardVerifyScores, setStandardVerifyScores] = useState({
    team1_shots: '',
    team2_shots: ''
  });
  
  const [currentRoundData, setCurrentRoundData] = useState(null);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
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
      // Sort teams based on scoring type
      const sortedTeams = teamsRes.data.sort((a, b) => {
        // Primary: total_points (desc)
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        // Secondary: shot_difference (desc)
        if ((b.shot_difference || 0) !== (a.shot_difference || 0)) return (b.shot_difference || 0) - (a.shot_difference || 0);
        // Tertiary: shots_for (desc)
        return (b.shots_for || 0) - (a.shots_for || 0);
      });
      setTeams(sortedTeams);

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
    
    if (isStandardScoring) {
      setStandardVerifyScores({
        team1_shots: match.team1_total_shots !== null ? match.team1_total_shots : '',
        team2_shots: match.team2_total_shots !== null ? match.team2_total_shots : ''
      });
    } else {
      setVerifyScores({
        skin1_team1_shots: match.skin1_team1_shots !== null ? match.skin1_team1_shots : '',
        skin1_team2_shots: match.skin1_team2_shots !== null ? match.skin1_team2_shots : '',
        skin2_team1_shots: match.skin2_team1_shots !== null ? match.skin2_team1_shots : '',
        skin2_team2_shots: match.skin2_team2_shots !== null ? match.skin2_team2_shots : '',
        skin3_team1_shots: match.skin3_team1_shots !== null ? match.skin3_team1_shots : '',
        skin3_team2_shots: match.skin3_team2_shots !== null ? match.skin3_team2_shots : ''
      });
    }
  };

  const verifyMatch = async () => {
    if (isStandardScoring) {
      const team1Shots = parseInt(standardVerifyScores.team1_shots);
      const team2Shots = parseInt(standardVerifyScores.team2_shots);
      
      if (isNaN(team1Shots) || isNaN(team2Shots)) {
        toast.error('Both scores must be valid numbers');
        return;
      }
      
      // Validate singles max
      if (tournament?.player_format === 'singles' && (team1Shots > 21 || team2Shots > 21)) {
        toast.error('Singles matches have max 21 shots');
        return;
      }

      try {
        await axios.post(`${API}/umpire/matches/${verifyingMatch.id}/verify-standard`, {
          team1_shots: team1Shots,
          team2_shots: team2Shots
        }, { headers: getAuthHeader() });
        toast.success('Match verified successfully!');
        setVerifyingMatch(null);
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to verify match');
      }
    } else {
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
    
    toast.info('Opening print dialog... Select "Save as PDF" to download, or print directly to printer.', { duration: 5000 });
    
    // Trigger print
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const archiveTournament = async () => {
    try {
      await axios.post(`${API}/tournaments/${id}/archive`, {}, { headers: getAuthHeader() });
      toast.success('Tournament archived successfully!');
      setShowArchiveDialog(false);
      navigate('/archives');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to archive tournament');
    }
  };

  const printQRCode = () => {
    if (!currentRoundData || !currentRoundData.access_token) {
      toast.error('Round data not loaded');
      return;
    }
    
    // Create a new window with just the QR code
    const printWindow = window.open('', '_blank');
    const qrUrl = `${FRONTEND_URL}/round/${currentRoundData.access_token}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tournament.name} - Round ${tournament.current_round} QR Code</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 40px;
            text-align: center;
          }
          .container {
            max-width: 500px;
          }
          .logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
            margin-bottom: 10px;
          }
          .club-name {
            font-size: 20px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          .club-name-alt {
            font-size: 20px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 20px;
          }
          h1 { 
            font-size: 22px; 
            margin-bottom: 8px;
            color: #1a1a1a;
          }
          h2 { 
            font-size: 18px; 
            margin-bottom: 25px;
            color: #059669;
            font-weight: 600;
          }
          .qr-container {
            padding: 20px;
            border: 3px solid #059669;
            border-radius: 16px;
            margin-bottom: 25px;
            display: inline-block;
          }
          .instructions {
            font-size: 16px;
            color: #666;
            line-height: 1.6;
          }
          .instructions strong {
            color: #1a1a1a;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${CLUB_LOGO}" alt="Club Logo" class="logo" />
          <p class="club-name">Centurion Bowls Club</p>
          <p class="club-name-alt">Centurion Rolbalklub</p>
          <h1>${tournament.name}</h1>
          <h2>Round ${tournament.current_round} of ${tournament.num_rounds || 7}</h2>
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}" alt="QR Code" width="300" height="300" />
          </div>
          <p class="instructions">
            <strong>Scan this QR code with your phone</strong><br/>
            to enter your match scores
          </p>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };
  
  const isStandardScoring = tournament?.scoring_type === 'standard';

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
  const maxRounds = tournament.num_rounds || 7;
  const canGenerateNextRound = tournament.current_round < maxRounds && allMatchesVerified;

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
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="tournament-name">{tournament.name}</h1>
              <p className="text-lg text-emerald-100">Round {tournament.current_round} of {tournament.num_rounds || 7}</p>
              <Badge className="mt-2 bg-white/20 text-white">
                {isStandardScoring ? 'Standard Scoring' : 'Skins Scoring'} - {tournament.player_format}
              </Badge>
            </div>
            <div className="flex gap-3">
              <Link to={`/standings/${id}`} target="_blank">
                <Button
                  variant="outline"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                  data-testid="standings-button"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Public Standings
                </Button>
              </Link>
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
              {tournament.current_round >= maxRounds && allMatchesVerified && (
                <Button
                  onClick={() => setShowArchiveDialog(true)}
                  variant="outline"
                  className="bg-amber-500/20 text-white border-amber-300/50 hover:bg-amber-500/30"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive Tournament
                </Button>
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
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  printQRCode();
                                }} 
                                className="w-full bg-primary hover:bg-primary/90"
                                data-testid="print-qr-button"
                              >
                                <Printer className="w-4 h-4 mr-2" />
                                Print QR Code Only
                              </Button>
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
                            {match.team1_scores_entered && !match.verified && isStandardScoring && (
                              <p className="text-sm text-muted-foreground">Entered: {match.team1_total_shots} shots</p>
                            )}
                          </div>
                          <div className="p-4 bg-stone-50 rounded-lg">
                            <p className="font-semibold mb-2">{match.team2_name}</p>
                            {match.team2_scores_entered && !match.verified && isStandardScoring && (
                              <p className="text-sm text-muted-foreground">Entered: {match.team2_total_shots} shots</p>
                            )}
                          </div>
                        </div>
                        
                        {match.team1_scores_entered && !match.verified && (
                          <div className="mt-3">
                            <Badge className="bg-blue-100 text-blue-700">Scores Entered - Ready to Verify</Badge>
                          </div>
                        )}

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
                                  {isStandardScoring ? (
                                    <>
                                      <p className="text-2xl font-mono font-bold text-primary">{match.team1_total_shots}</p>
                                      <p className="text-xs text-muted-foreground">{match.team1_match_points.toFixed(0)} match pts</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-2xl font-mono font-bold text-primary">{match.team1_match_points.toFixed(1)}</p>
                                      <p className="text-xs text-muted-foreground">{match.team1_skin_points.toFixed(1)} skin points</p>
                                    </>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold">{match.team2_name}</p>
                                  {isStandardScoring ? (
                                    <>
                                      <p className="text-2xl font-mono font-bold text-primary">{match.team2_total_shots}</p>
                                      <p className="text-xs text-muted-foreground">{match.team2_match_points.toFixed(0)} match pts</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-2xl font-mono font-bold text-primary">{match.team2_match_points.toFixed(1)}</p>
                                      <p className="text-xs text-muted-foreground">{match.team2_skin_points.toFixed(1)} skin points</p>
                                    </>
                                  )}
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
                  <CardDescription>
                    {isStandardScoring 
                      ? 'Ranked by: Match Points → Shot Difference → Shots For' 
                      : 'Ranked by: Skin Points → Shot Difference → Shots For'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-stone-200">
                          <th className="text-left py-3 px-2 font-semibold text-sm">Pos</th>
                          <th className="text-left py-3 px-2 font-semibold text-sm">Team</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">P</th>
                          <th className="text-center py-3 px-2 font-semibold text-sm">{isStandardScoring ? 'MP' : 'Pts'}</th>
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
                            <td className="text-center py-3 px-2 font-mono font-bold text-primary">
                              {isStandardScoring ? team.total_points.toFixed(0) : team.total_points.toFixed(1)}
                            </td>
                            <td className="text-center py-3 px-2 font-mono">{team.shots_for || 0}</td>
                            <td className="text-center py-3 px-2 font-mono">{team.shots_against || 0}</td>
                            <td className="text-center py-3 px-2 font-mono font-semibold">{team.shot_difference > 0 ? '+' : ''}{team.shot_difference || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 text-xs text-muted-foreground">
                      {isStandardScoring ? (
                        <p><strong>P</strong> = Played, <strong>MP</strong> = Match Points (Win=2, Draw=1), <strong>SF</strong> = Shots For, <strong>SA</strong> = Shots Against, <strong>SD</strong> = Shot Difference</p>
                      ) : (
                        <p><strong>P</strong> = Played, <strong>Pts</strong> = Skin Points, <strong>SF</strong> = Shots For, <strong>SA</strong> = Shots Against, <strong>SD</strong> = Shot Difference</p>
                      )}
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
            scoringType={tournament.scoring_type}
          />
        </div>
      )}

      {/* Verify Match Dialog - Standard Scoring */}
      {verifyingMatch && isStandardScoring && (
        <Dialog open={!!verifyingMatch} onOpenChange={() => setVerifyingMatch(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Verify Match Scores</DialogTitle>
              <DialogDescription>
                Review and confirm final scores from paper scorecard
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div>
                <h4 className="font-semibold mb-2">{verifyingMatch.team1_name} vs {verifyingMatch.team2_name}</h4>
                <p className="text-sm text-muted-foreground">Green {verifyingMatch.green} - Rink {verifyingMatch.rink}</p>
                {verifyingMatch.team1_scores_entered && (
                  <Badge className="bg-blue-100 text-blue-700 mt-2">Players have entered scores - verify with paper scorecard</Badge>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{verifyingMatch.team1_name}</Label>
                  {verifyingMatch.team1_total_shots !== null && verifyingMatch.team1_total_shots > 0 && (
                    <div className="text-xs text-muted-foreground mb-1">
                      <Badge className="bg-blue-100 text-blue-700">Player entered: {verifyingMatch.team1_total_shots}</Badge>
                    </div>
                  )}
                  <Input
                    type="number"
                    min="0"
                    max={tournament?.player_format === 'singles' ? 21 : undefined}
                    placeholder="Final shots"
                    value={standardVerifyScores.team1_shots}
                    onChange={(e) => setStandardVerifyScores({ ...standardVerifyScores, team1_shots: e.target.value })}
                    className="text-lg"
                    data-testid="team1-verify-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{verifyingMatch.team2_name}</Label>
                  {verifyingMatch.team2_total_shots !== null && verifyingMatch.team2_total_shots > 0 && (
                    <div className="text-xs text-muted-foreground mb-1">
                      <Badge className="bg-blue-100 text-blue-700">Player entered: {verifyingMatch.team2_total_shots}</Badge>
                    </div>
                  )}
                  <Input
                    type="number"
                    min="0"
                    max={tournament?.player_format === 'singles' ? 21 : undefined}
                    placeholder="Final shots"
                    value={standardVerifyScores.team2_shots}
                    onChange={(e) => setStandardVerifyScores({ ...standardVerifyScores, team2_shots: e.target.value })}
                    className="text-lg"
                    data-testid="team2-verify-input"
                  />
                </div>
              </div>
              
              {tournament?.player_format === 'singles' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>Singles:</strong> Maximum 21 shots per player
                  </p>
                </div>
              )}
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

      {/* Verify Match Dialog - Skins Scoring */}
      {verifyingMatch && !isStandardScoring && (
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
                {verifyingMatch.team1_scores_entered && (
                  <Badge className="bg-blue-100 text-blue-700 mt-2">Players have entered scores - verify with paper scorecard</Badge>
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