import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { Save, Trophy, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MatchScore = () => {
  const { token } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [scores, setScores] = useState({
    skin1: '',
    skin2: '',
    skin3: ''
  });

  useEffect(() => {
    fetchMatch();
  }, [token]);

  const fetchMatch = async () => {
    try {
      const response = await axios.get(`${API}/matches/by-token/${token}`);
      setMatch(response.data);
    } catch (error) {
      toast.error('Match not found or invalid link');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (skin, value) => {
    setScores(prev => ({ ...prev, [skin]: value }));
  };

  const submitScore = async (skinNumber) => {
    if (!selectedTeam) {
      toast.error('Please select your team first');
      return;
    }

    const teamNumber = selectedTeam === match.team1_name ? 1 : 2;
    const shotValue = parseInt(scores[`skin${skinNumber}`]);

    if (isNaN(shotValue) || shotValue < 0) {
      toast.error('Please enter a valid score (0 or greater)');
      return;
    }

    try {
      await axios.post(`${API}/matches/by-token/${token}/scores`, {
        team_number: teamNumber,
        skin_number: skinNumber,
        shots: shotValue
      });
      toast.success(`Skin ${skinNumber} score submitted!`);
      fetchMatch();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit score');
    }
  };

  const getScoreForTeamAndSkin = (teamNum, skinNum) => {
    const field = `skin${skinNum}_team${teamNum}_shots`;
    return match[field];
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Loading match...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-heading mb-2">Match Not Found</h3>
            <p className="text-muted-foreground">Invalid or expired QR code</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (match.verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-green-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-heading">Match Verified</CardTitle>
            <CardDescription>This match has been verified by the umpire</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-stone-50 rounded-lg">
                <div>
                  <p className="font-semibold">{match.team1_name}</p>
                  <p className="text-xs text-muted-foreground">{match.team1_skin_points.toFixed(1)} skin points</p>
                </div>
                <p className="text-2xl font-mono font-bold text-primary">{match.team1_match_points.toFixed(1)}</p>
              </div>
              <div className="flex justify-between items-center p-4 bg-stone-50 rounded-lg">
                <div>
                  <p className="font-semibold">{match.team2_name}</p>
                  <p className="text-xs text-muted-foreground">{match.team2_skin_points.toFixed(1)} skin points</p>
                </div>
                <p className="text-2xl font-mono font-bold text-primary">{match.team2_match_points.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamNumber = selectedTeam === match.team1_name ? 1 : 2;
  const hasEnteredScores = teamNumber === 1 ? match.team1_scores_entered : match.team2_scores_entered;
  const otherTeamEntered = teamNumber === 1 ? match.team2_scores_entered : match.team1_scores_entered;

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-heading mb-4" data-testid="match-title">Score Entry</h1>
          <div className="flex gap-3">
            <Badge className={`rink-badge text-base ${getRinkColor(match.green)}`}>
              Green {match.green}
            </Badge>
            <Badge className="rink-badge text-base bg-white/20 text-white border-white/30">
              Rink {match.rink}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Team Selection */}
          {!selectedTeam && (
            <Card className="floating-card border-stone-200">
              <CardHeader>
                <CardTitle className="text-2xl font-heading">Select Your Team</CardTitle>
                <CardDescription>Choose which team you are entering scores for</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedTeam} onValueChange={setSelectedTeam}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-stone-50" data-testid="team1-radio">
                    <RadioGroupItem value={match.team1_name} id="team1" />
                    <Label htmlFor="team1" className="flex-1 cursor-pointer">
                      <span className="text-lg font-semibold">{match.team1_name}</span>
                      {match.team1_scores_entered && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">Scores Entered</Badge>
                      )}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg cursor-pointer hover:bg-stone-50" data-testid="team2-radio">
                    <RadioGroupItem value={match.team2_name} id="team2" />
                    <Label htmlFor="team2" className="flex-1 cursor-pointer">
                      <span className="text-lg font-semibold">{match.team2_name}</span>
                      {match.team2_scores_entered && (
                        <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">Scores Entered</Badge>
                      )}
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Score Entry */}
          {selectedTeam && (
            <Card className="floating-card border-stone-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-heading">Enter Your Scores</CardTitle>
                    <CardDescription>Team: {selectedTeam}</CardDescription>
                  </div>
                  {otherTeamEntered && (
                    <Badge className="bg-blue-100 text-blue-700">Other team has entered</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasEnteredScores && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-900">✓ You have already entered scores. You can modify them below if needed.</p>
                  </div>
                )}

                {[1, 2, 3].map((skinNum) => {
                  const existingScore = getScoreForTeamAndSkin(teamNumber, skinNum);
                  return (
                    <div key={skinNum} className="space-y-3" data-testid={`skin${skinNum}-section`}>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Skin {skinNum}</h4>
                        {existingScore !== null && (
                          <Badge className="bg-green-100 text-green-700">Entered: {existingScore}</Badge>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Enter shots scored"
                          value={scores[`skin${skinNum}`]}
                          onChange={(e) => handleScoreChange(`skin${skinNum}`, e.target.value)}
                          className="score-input flex-1"
                          data-testid={`skin${skinNum}-input`}
                        />
                        <Button
                          onClick={() => submitScore(skinNum)}
                          className="bg-primary hover:bg-primary/90"
                          data-testid={`submit-skin${skinNum}-button`}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Submit
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h5 className="font-semibold text-sm text-amber-900 mb-2">Important</h5>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>• Enter the total shots your team scored in each 5-end skin</li>
                    <li>• You can modify scores until the umpire verifies the match</li>
                    <li>• The umpire will review both teams' entries before final verification</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedTeam('')}
                  className="w-full"
                  data-testid="change-team-button"
                >
                  Change Team
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Match Info */}
          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-xl font-heading">Match Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teams:</span>
                  <span className="font-medium">{match.team1_name} vs {match.team2_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">Green {match.green}, Rink {match.rink}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">Awaiting Verification</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchScore;