import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Save, CheckCircle, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RoundScoreEntry = () => {
  const { token } = useParams();
  const [roundData, setRoundData] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  // Skins scoring state
  const [scores, setScores] = useState({
    skin1_team1: '',
    skin1_team2: '',
    skin2_team1: '',
    skin2_team2: '',
    skin3_team1: '',
    skin3_team2: ''
  });
  
  // Standard scoring state
  const [standardScores, setStandardScores] = useState({
    team1: '',
    team2: ''
  });

  useEffect(() => {
    fetchRound();
  }, [token]);

  const fetchRound = async () => {
    try {
      const response = await axios.get(`${API}/rounds/by-token/${token}`);
      setRoundData(response.data.round);
      setMatches(response.data.matches);
      setTournament(response.data.tournament);
    } catch (error) {
      toast.error('Round not found or invalid link');
    } finally {
      setLoading(false);
    }
  };

  const submitScore = async (skinNumber, teamNumber) => {
    if (!selectedMatch) {
      toast.error('Please select your match first');
      return;
    }

    const shotValue = parseInt(scores[`skin${skinNumber}_team${teamNumber}`]);

    if (isNaN(shotValue) || shotValue < 0) {
      toast.error('Please enter a valid score (0 or greater)');
      return;
    }

    try {
      await axios.post(`${API}/rounds/by-token/${token}/matches/${selectedMatch.id}/scores`, {
        team_number: teamNumber,
        skin_number: skinNumber,
        shots: shotValue
      });
      toast.success(`Skin ${skinNumber} Team ${teamNumber} score saved!`);
      fetchRound();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit score');
    }
  };
  
  const submitStandardScores = async () => {
    if (!selectedMatch) {
      toast.error('Please select your match first');
      return;
    }

    const team1Shots = parseInt(standardScores.team1);
    const team2Shots = parseInt(standardScores.team2);

    if (isNaN(team1Shots) || isNaN(team2Shots) || team1Shots < 0 || team2Shots < 0) {
      toast.error('Please enter valid scores for both teams (0 or greater)');
      return;
    }
    
    // Validate singles max
    if (tournament?.player_format === 'singles' && (team1Shots > 21 || team2Shots > 21)) {
      toast.error('Singles matches have a maximum of 21 shots');
      return;
    }

    try {
      await axios.post(`${API}/rounds/by-token/${token}/matches/${selectedMatch.id}/standard-scores`, {
        team1_shots: team1Shots,
        team2_shots: team2Shots
      });
      toast.success('Scores submitted - awaiting verification!');
      setStandardScores({ team1: '', team2: '' });
      fetchRound();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit scores');
    }
  };

  const getScoreForTeamAndSkin = (match, teamNum, skinNum) => {
    const field = `skin${skinNum}_team${teamNum}_shots`;
    return match[field];
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };
  
  const isStandardScoring = tournament?.scoring_type === 'standard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading round...</p>
      </div>
    );
  }

  if (!roundData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-heading mb-2">Round Not Found</h3>
            <p className="text-muted-foreground">Invalid or expired QR code</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allVerified = matches.every(m => m.verified);

  if (allVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full border-green-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-heading">Round {roundData.round_number} Complete</CardTitle>
            <CardDescription>All matches have been verified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-lg">
                  <div className="text-sm">
                    <p className="font-semibold">{match.team1_name} vs {match.team2_name}</p>
                    <p className="text-xs text-muted-foreground">Green {match.green} - Rink {match.rink}</p>
                  </div>
                  <div className="text-right text-sm">
                    {isStandardScoring ? (
                      <p className="font-mono font-bold">{match.team1_total_shots} - {match.team2_total_shots}</p>
                    ) : (
                      <p className="font-mono font-bold">{match.team1_match_points.toFixed(1)} - {match.team2_match_points.toFixed(1)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="round-title">Round {roundData.round_number} Score Entry</h1>
          <p className="text-lg text-emerald-100">
            {isStandardScoring ? 'Enter final shot totals' : 'Enter scores for each skin'}
          </p>
          {tournament && (
            <Badge className="mt-2 bg-white/20 text-white">
              {isStandardScoring ? 'Standard Scoring' : 'Skins Scoring'} - {tournament.player_format}
            </Badge>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Match Selection */}
          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-2xl font-heading">Select Your Match</CardTitle>
              <CardDescription>Find your team and tap to enter scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    onClick={() => {
                      if (!match.verified) {
                        setSelectedMatch(match);
                        // Pre-fill scores if already entered
                        if (isStandardScoring && match.team1_total_shots !== null) {
                          setStandardScores({
                            team1: match.team1_total_shots?.toString() || '',
                            team2: match.team2_total_shots?.toString() || ''
                          });
                        }
                      }
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      match.verified
                        ? 'border-green-200 bg-green-50 cursor-default'
                        : 'border-stone-200 hover:border-primary/50 hover:bg-primary/5'
                    }`}
                    data-testid={`match-${match.id}`}
                  >
                    <div className="flex gap-2 mb-3">
                      <Badge className={`rink-badge text-xs ${getRinkColor(match.green)}`}>
                        Green {match.green}
                      </Badge>
                      <Badge className="rink-badge text-xs bg-stone-100 text-stone-700">
                        Rink {match.rink}
                      </Badge>
                      {match.verified && (
                        <Badge className="text-xs bg-green-100 text-green-700">Verified</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{match.team1_name}</span>
                        {match.verified && (
                          <span className="font-mono text-sm font-bold">
                            {isStandardScoring ? match.team1_total_shots : match.team1_match_points.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="text-center text-xs text-muted-foreground">vs</div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{match.team2_name}</span>
                        {match.verified && (
                          <span className="font-mono text-sm font-bold">
                            {isStandardScoring ? match.team2_total_shots : match.team2_match_points.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {match.team1_scores_entered && !match.verified && (
                        <div className="mt-2 pt-2 border-t">
                          <Badge className="text-xs bg-blue-100 text-blue-700">Scores Entered - Awaiting Verification</Badge>
                        </div>
                      )}
                      {!match.verified && !match.team1_scores_entered && (
                        <div className="mt-2 pt-2 border-t text-center">
                          <span className="text-xs text-primary font-medium">Tap to enter scores</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Score Entry Dialog - Standard Scoring */}
      <Dialog open={!!selectedMatch && !selectedMatch?.verified && isStandardScoring} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading">Enter Final Scores</DialogTitle>
            <DialogDescription>
              {selectedMatch && `Green ${selectedMatch.green}, Rink ${selectedMatch.rink}`}
            </DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-6 py-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">
                  Enter the final shot totals for both teams.
                  {tournament?.player_format === 'singles' && ' Singles: First to 21 wins.'}
                </p>
              </div>

              {/* Show existing scores if entered */}
              {selectedMatch.team1_scores_entered && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-900 font-semibold mb-1">Previously Entered:</p>
                  <div className="flex justify-between text-sm">
                    <span>{selectedMatch.team1_name}: {selectedMatch.team1_total_shots}</span>
                    <span>{selectedMatch.team2_name}: {selectedMatch.team2_total_shots}</span>
                  </div>
                </div>
              )}

              {/* Standard Score Entry */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{selectedMatch.team1_name}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={tournament?.player_format === 'singles' ? 21 : undefined}
                    placeholder="Final shots"
                    value={standardScores.team1}
                    onChange={(e) => setStandardScores({ ...standardScores, team1: e.target.value })}
                    className="text-lg"
                    data-testid="team1-shots-input"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{selectedMatch.team2_name}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={tournament?.player_format === 'singles' ? 21 : undefined}
                    placeholder="Final shots"
                    value={standardScores.team2}
                    onChange={(e) => setStandardScores({ ...standardScores, team2: e.target.value })}
                    className="text-lg"
                    data-testid="team2-shots-input"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedMatch(null)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={submitStandardScores}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  data-testid="submit-standard-scores"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Submit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Score Entry Dialog - Skins Scoring */}
      <Dialog open={!!selectedMatch && !selectedMatch?.verified && !isStandardScoring} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading">Enter Match Scores</DialogTitle>
            <DialogDescription>
              {selectedMatch && `${selectedMatch.team1_name} vs ${selectedMatch.team2_name} (Green ${selectedMatch.green}, Rink ${selectedMatch.rink})`}
            </DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-800">Enter shot totals for both teams after each 5-end skin.</p>
              </div>

              {/* Skin Score Entry */}
              <div className="space-y-4">
                {[1, 2, 3].map((skinNum) => {
                  const team1Score = getScoreForTeamAndSkin(selectedMatch, 1, skinNum);
                  const team2Score = getScoreForTeamAndSkin(selectedMatch, 2, skinNum);
                  
                  return (
                    <div key={skinNum} className="space-y-2 p-3 bg-stone-50 rounded-lg" data-testid={`skin${skinNum}-section`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Skin {skinNum}</h4>
                        <span className="text-xs text-muted-foreground">Ends {(skinNum-1)*5+1}-{skinNum*5}</span>
                      </div>
                      
                      {/* Team 1 */}
                      <div className="flex items-center gap-2">
                        <Label className="text-sm w-1/3 truncate">{selectedMatch.team1_name}</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Shots"
                          value={scores[`skin${skinNum}_team1`]}
                          onChange={(e) => setScores({ ...scores, [`skin${skinNum}_team1`]: e.target.value })}
                          className="flex-1"
                          data-testid={`skin${skinNum}-team1-input`}
                        />
                        <Button
                          onClick={() => submitScore(skinNum, 1)}
                          className="bg-primary hover:bg-primary/90"
                          data-testid={`submit-skin${skinNum}-team1`}
                          size="sm"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        {team1Score !== null && (
                          <Badge className="bg-green-100 text-green-700 text-xs">{team1Score}</Badge>
                        )}
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-2">
                        <Label className="text-sm w-1/3 truncate">{selectedMatch.team2_name}</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Shots"
                          value={scores[`skin${skinNum}_team2`]}
                          onChange={(e) => setScores({ ...scores, [`skin${skinNum}_team2`]: e.target.value })}
                          className="flex-1"
                          data-testid={`skin${skinNum}-team2-input`}
                        />
                        <Button
                          onClick={() => submitScore(skinNum, 2)}
                          className="bg-primary hover:bg-primary/90"
                          data-testid={`submit-skin${skinNum}-team2`}
                          size="sm"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        {team2Score !== null && (
                          <Badge className="bg-green-100 text-green-700 text-xs">{team2Score}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedMatch(null)} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoundScoreEntry;
