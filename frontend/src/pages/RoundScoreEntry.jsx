import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { toast } from 'sonner';
import { Save, CheckCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RoundScoreEntry = () => {
  const { token } = useParams();
  const [roundData, setRoundData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [scores, setScores] = useState({
    skin1: '',
    skin2: '',
    skin3: ''
  });

  useEffect(() => {
    fetchRound();
  }, [token]);

  const fetchRound = async () => {
    try {
      const response = await axios.get(`${API}/rounds/by-token/${token}`);
      setRoundData(response.data.round);
      setMatches(response.data.matches);
    } catch (error) {
      toast.error('Round not found or invalid link');
    } finally {
      setLoading(false);
    }
  };

  const submitScore = async (skinNumber) => {
    if (!selectedMatch || !selectedTeam) {
      toast.error('Please select your match and team first');
      return;
    }

    const teamNumber = selectedTeam === selectedMatch.team1_name ? 1 : 2;
    const shotValue = parseInt(scores[`skin${skinNumber}`]);

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
      toast.success(`Skin ${skinNumber} score submitted!`);
      fetchRound();
      setScores({ ...scores, [`skin${skinNumber}`]: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit score');
    }
  };

  const getScoreForTeamAndSkin = (match, teamNum, skinNum) => {
    const field = `skin${skinNum}_team${teamNum}_shots`;
    return match[field];
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };

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
            <CardDescription>All matches have been verified by the umpire</CardDescription>
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
                    <p className="font-mono font-bold">{match.team1_match_points.toFixed(1)} - {match.team2_match_points.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamNumber = selectedMatch && selectedTeam ? (selectedTeam === selectedMatch.team1_name ? 1 : 2) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-heading mb-2" data-testid="round-title">Round {roundData.round_number} Score Entry</h1>
          <p className="text-lg text-emerald-100">Select your match and enter scores</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Match Selection */}
          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-2xl font-heading">Select Your Match</CardTitle>
              <CardDescription>Find your team and click to enter scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    onClick={() => !match.verified && setSelectedMatch(match)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedMatch?.id === match.id
                        ? 'border-primary bg-primary/5'
                        : match.verified
                        ? 'border-green-200 bg-green-50 cursor-default'
                        : 'border-stone-200 hover:border-primary/50'
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
                        {match.team1_scores_entered && !match.verified && (
                          <Badge className="text-xs bg-blue-100 text-blue-700">✓</Badge>
                        )}
                        {match.verified && (
                          <span className="font-mono text-sm font-bold">{match.team1_match_points.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="text-center text-xs text-muted-foreground">vs</div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{match.team2_name}</span>
                        {match.team2_scores_entered && !match.verified && (
                          <Badge className="text-xs bg-blue-100 text-blue-700">✓</Badge>
                        )}
                        {match.verified && (
                          <span className="font-mono text-sm font-bold">{match.team2_match_points.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Score Entry Form */}
          {selectedMatch && !selectedMatch.verified && (
            <Card className=\"floating-card border-stone-200\">
              <CardHeader>
                <CardTitle className=\"text-2xl font-heading\">Enter Scores</CardTitle>
                <CardDescription>
                  Match: {selectedMatch.team1_name} vs {selectedMatch.team2_name} (Green {selectedMatch.green}, Rink {selectedMatch.rink})
                </CardDescription>
              </CardHeader>
              <CardContent className=\"space-y-6\">
                {/* Team Selection */}
                {!selectedTeam && (
                  <div className=\"space-y-3\">
                    <Label>Select Your Team</Label>
                    <div className=\"grid grid-cols-2 gap-3\">
                      <Button
                        onClick={() => setSelectedTeam(selectedMatch.team1_name)}
                        variant=\"outline\"
                        className=\"h-auto py-4\"
                        data-testid=\"select-team1\"
                      >
                        {selectedMatch.team1_name}
                      </Button>
                      <Button
                        onClick={() => setSelectedTeam(selectedMatch.team2_name)}
                        variant=\"outline\"
                        className=\"h-auto py-4\"
                        data-testid=\"select-team2\"
                      >
                        {selectedMatch.team2_name}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedTeam && (
                  <>
                    <div className=\"flex justify-between items-center p-3 bg-primary/10 rounded-lg\">
                      <span className=\"font-semibold\">Entering for: {selectedTeam}</span>
                      <Button
                        variant=\"ghost\"
                        size=\"sm\"
                        onClick={() => { setSelectedTeam(''); setScores({ skin1: '', skin2: '', skin3: '' }); }}
                        data-testid=\"change-team\"
                      >
                        Change
                      </Button>
                    </div>

                    {/* Skin Score Entry */}
                    <div className=\"space-y-4\">
                      {[1, 2, 3].map((skinNum) => {
                        const existingScore = getScoreForTeamAndSkin(selectedMatch, teamNumber, skinNum);
                        return (
                          <div key={skinNum} className=\"space-y-3\" data-testid={`skin${skinNum}-section`}>
                            <div className=\"flex items-center justify-between\">
                              <h4 className=\"font-semibold\">Skin {skinNum}</h4>
                              {existingScore !== null && (
                                <Badge className=\"bg-green-100 text-green-700\">Saved: {existingScore}</Badge>
                              )}
                            </div>
                            <div className=\"flex gap-3\">
                              <Input
                                type=\"number\"
                                min=\"0\"
                                placeholder=\"Enter shots scored\"
                                value={scores[`skin${skinNum}`]}
                                onChange={(e) => setScores({ ...scores, [`skin${skinNum}`]: e.target.value })}
                                className=\"flex-1\"
                                data-testid={`skin${skinNum}-input`}
                              />
                              <Button
                                onClick={() => submitScore(skinNum)}
                                className=\"bg-primary hover:bg-primary/90\"
                                data-testid={`submit-skin${skinNum}`}
                              >
                                <Save className=\"w-4 h-4 mr-2\" />
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className=\"p-4 bg-amber-50 rounded-lg border border-amber-200\">
                      <p className=\"text-xs text-amber-800\">
                        Enter the total shots your team scored in each 5-end skin. You can modify scores until the umpire verifies the match.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundScoreEntry;
