import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Save, Trophy } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MatchScore = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState(1);
  const [skinScores, setSkinScores] = useState({
    1: { team1: '', team2: '' },
    2: { team1: '', team2: '' },
    3: { team1: '', team2: '' }
  });
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatch();
  }, [id]);

  const fetchMatch = async () => {
    try {
      const response = await axios.get(`${API}/matches/${id}`, { headers: getAuthHeader() });
      const matchData = response.data;
      setMatch(matchData);

      // Populate existing scores
      setSkinScores({
        1: {
          team1: matchData.skin1_team1_shots !== null ? matchData.skin1_team1_shots.toString() : '',
          team2: matchData.skin1_team2_shots !== null ? matchData.skin1_team2_shots.toString() : ''
        },
        2: {
          team1: matchData.skin2_team1_shots !== null ? matchData.skin2_team1_shots.toString() : '',
          team2: matchData.skin2_team2_shots !== null ? matchData.skin2_team2_shots.toString() : ''
        },
        3: {
          team1: matchData.skin3_team1_shots !== null ? matchData.skin3_team1_shots.toString() : '',
          team2: matchData.skin3_team2_shots !== null ? matchData.skin3_team2_shots.toString() : ''
        }
      });

      // Set selected skin to first incomplete one
      if (matchData.completed_skins < 3) {
        setSelectedSkin(matchData.completed_skins + 1);
      }
    } catch (error) {
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const handleSkinScoreChange = (skin, team, value) => {
    setSkinScores(prev => ({
      ...prev,
      [skin]: {
        ...prev[skin],
        [team]: value
      }
    }));
  };

  const saveSkinScores = async (skinNumber) => {
    const team1Score = parseInt(skinScores[skinNumber].team1);
    const team2Score = parseInt(skinScores[skinNumber].team2);

    if (isNaN(team1Score) || isNaN(team2Score)) {
      toast.error('Please enter valid scores for both teams');
      return;
    }

    if (team1Score < 0 || team2Score < 0) {
      toast.error('Scores cannot be negative');
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${API}/matches/${id}/scores`,
        {
          skin_number: skinNumber,
          team1_shots: team1Score,
          team2_shots: team2Score
        },
        { headers: getAuthHeader() }
      );

      toast.success(`Skin ${skinNumber} scores saved!`);
      fetchMatch();

      // If not the last skin, move to next
      if (skinNumber < 3) {
        setSelectedSkin(skinNumber + 1);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const getSkinWinner = (skin) => {
    const team1 = parseInt(skinScores[skin].team1);
    const team2 = parseInt(skinScores[skin].team2);

    if (isNaN(team1) || isNaN(team2)) return null;

    if (team1 > team2) return match.team1_name;
    if (team2 > team1) return match.team2_name;
    return 'Draw';
  };

  const getRinkColor = (green) => {
    return green === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading match...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Match not found</p>
      </div>
    );
  }

  const isCompleted = match.status === 'completed';

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <Button
            onClick={() => navigate(`/tournaments/${match.tournament_id}`)}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournament
          </Button>
          <h1 className="text-4xl md:text-5xl font-heading mb-4" data-testid="match-title">Match Scorecard</h1>
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Teams Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="floating-card border-stone-200">
              <CardContent className="pt-6">
                <h3 className="text-xl font-heading mb-2" data-testid="team1-name">{match.team1_name}</h3>
                {isCompleted && (
                  <div>
                    <p className="text-3xl font-mono font-bold text-primary" data-testid="team1-points">
                      {match.team1_match_points.toFixed(1)} pts
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {match.team1_skin_points.toFixed(1)} skin points
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="floating-card border-stone-200">
              <CardContent className="pt-6">
                <h3 className="text-xl font-heading mb-2" data-testid="team2-name">{match.team2_name}</h3>
                {isCompleted && (
                  <div>
                    <p className="text-3xl font-mono font-bold text-primary" data-testid="team2-points">
                      {match.team2_match_points.toFixed(1)} pts
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {match.team2_skin_points.toFixed(1)} skin points
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {isCompleted && (
            <Card className="gradient-gold text-white border-amber-500">
              <CardContent className="py-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3" />
                <h3 className="text-2xl font-heading mb-2">Match Complete!</h3>
                <p className="text-lg">
                  Winner: <span className="font-bold">
                    {match.team1_match_points > match.team2_match_points ? match.team1_name :
                     match.team2_match_points > match.team1_match_points ? match.team2_name :
                     'Draw'}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Skin Tabs */}
          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-2xl font-heading">Score Entry</CardTitle>
              <CardDescription>
                Enter shot totals after each 5-end skin. The app calculates points automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skin Selector */}
              <div className="flex gap-2" data-testid="skin-selector">
                {[1, 2, 3].map((skin) => (
                  <Button
                    key={skin}
                    onClick={() => setSelectedSkin(skin)}
                    variant={selectedSkin === skin ? 'default' : 'outline'}
                    className={selectedSkin === skin ? 'bg-primary' : ''}
                    data-testid={`skin-tab-${skin}`}
                  >
                    Skin {skin}
                    {match[`skin${skin}_team1_shots`] !== null && ' ✓'}
                  </Button>
                ))}
              </div>

              {/* Score Input for Selected Skin */}
              <div className="space-y-6" data-testid={`skin-${selectedSkin}-content`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor={`team1-skin${selectedSkin}`} className="text-lg">
                      {match.team1_name}
                    </Label>
                    <Input
                      id={`team1-skin${selectedSkin}`}
                      type="number"
                      min="0"
                      placeholder="Shots scored"
                      value={skinScores[selectedSkin].team1}
                      onChange={(e) => handleSkinScoreChange(selectedSkin, 'team1', e.target.value)}
                      disabled={isCompleted}
                      className="score-input text-center border-stone-300"
                      data-testid={`team1-skin${selectedSkin}-input`}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor={`team2-skin${selectedSkin}`} className="text-lg">
                      {match.team2_name}
                    </Label>
                    <Input
                      id={`team2-skin${selectedSkin}`}
                      type="number"
                      min="0"
                      placeholder="Shots scored"
                      value={skinScores[selectedSkin].team2}
                      onChange={(e) => handleSkinScoreChange(selectedSkin, 'team2', e.target.value)}
                      disabled={isCompleted}
                      className="score-input text-center border-stone-300"
                      data-testid={`team2-skin${selectedSkin}-input`}
                    />
                  </div>
                </div>

                {getSkinWinner(selectedSkin) && (
                  <div className="p-4 bg-primary/10 rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">Skin {selectedSkin} Winner</p>
                    <p className="text-lg font-bold text-primary" data-testid={`skin${selectedSkin}-winner`}>
                      {getSkinWinner(selectedSkin)}
                    </p>
                  </div>
                )}

                {!isCompleted && (
                  <Button
                    onClick={() => saveSkinScores(selectedSkin)}
                    disabled={saving}
                    className="w-full bg-primary hover:bg-primary/90"
                    data-testid={`save-skin${selectedSkin}-button`}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : `Save Skin ${selectedSkin} Scores`}
                  </Button>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">Scoring Rules</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• Each match has 3 skins (5 ends each)</li>
                  <li>• Team with most shots in a skin wins 1 point (0.5 each if draw)</li>
                  <li>• After 3 skins: team with most skin points gets +2 bonus</li>
                  <li>• If skin points tied: bonus goes to team with most total shots</li>
                  <li>• Total of 5 match points available per match</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchScore;