import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Trophy } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateTournament = () => {
  const [tournamentName, setTournamentName] = useState('');
  const [umpireEmail, setUmpireEmail] = useState('');
  const [teams, setTeams] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  
  // New fields for scoring type
  const [scoringType, setScoringType] = useState('skins'); // 'skins' or 'standard'
  const [playerFormat, setPlayerFormat] = useState('pairs');
  const [numEnds, setNumEnds] = useState(15);
  const [numRounds, setNumRounds] = useState(7);
  const [drawTypeRound2, setDrawTypeRound2] = useState('strength');
  const [pointSystem, setPointSystem] = useState('shots'); // 'shots' or 'wdl' (win/draw/loss)
  
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  const addTeam = () => {
    if (teams.length < 24) {
      setTeams([...teams, '']);
    } else {
      toast.error('Maximum 24 teams allowed');
    }
  };

  const removeTeam = (index) => {
    if (teams.length > 2) {
      setTeams(teams.filter((_, i) => i !== index));
    } else {
      toast.error('Minimum 2 teams required');
    }
  };

  const updateTeam = (index, value) => {
    const newTeams = [...teams];
    newTeams[index] = value;
    setTeams(newTeams);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validTeams = teams.filter(t => t.trim() !== '');
    
    if (validTeams.length < 2) {
      toast.error('At least 2 teams are required');
      return;
    }
    
    if (validTeams.length % 2 !== 0) {
      toast.error('Number of teams must be even');
      return;
    }

    if (!umpireEmail.trim()) {
      toast.error('Umpire email is required');
      return;
    }

    setLoading(true);
    try {
      const tournamentData = {
        name: tournamentName,
        teams: validTeams,
        umpire_email: umpireEmail,
        scoring_type: scoringType,
        player_format: playerFormat,
        num_ends: numEnds,
        draw_type_round2: drawTypeRound2
      };
      
      const response = await axios.post(
        `${API}/tournaments`,
        tournamentData,
        { headers: getAuthHeader() }
      );
      
      const data = response.data;
      
      // Check if umpire was auto-created
      if (data.umpire_created && data.umpire_credentials) {
        const creds = data.umpire_credentials;
        const message = `Tournament created! New umpire account created:\n\nEmail: ${creds.email}\nPassword: ${creds.temporary_password}\n\nPlease share these credentials with the umpire securely. They can change the password after first login.`;
        
        // Show longer toast with credentials
        toast.success(message, { duration: 15000 });
        
        // Also copy to clipboard
        navigator.clipboard.writeText(`Umpire Login:\nEmail: ${creds.email}\nPassword: ${creds.temporary_password}`);
        toast.info('Credentials copied to clipboard!', { duration: 3000 });
      } else {
        toast.success('Tournament created successfully!');
      }
      
      navigate(`/tournaments/${data.tournament.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
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
            Back to Dashboard
          </Button>
          <h1 className="text-4xl md:text-5xl font-heading" data-testid="create-tournament-title">Create New Tournament</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <Card className="max-w-3xl mx-auto floating-card border-stone-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              Tournament Details
            </CardTitle>
            <CardDescription>Set up your lawn bowls tournament with 7 rounds</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-tournament-form">
              <div className="space-y-2">
                <Label htmlFor="tournament-name">Tournament Name</Label>
                <Input
                  id="tournament-name"
                  type="text"
                  placeholder="e.g., Spring Championship 2024"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  required
                  data-testid="tournament-name-input"
                  className="border-stone-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="umpire-email">Umpire Email</Label>
                <Input
                  id="umpire-email"
                  type="email"
                  placeholder="umpire@example.com"
                  value={umpireEmail}
                  onChange={(e) => setUmpireEmail(e.target.value)}
                  required
                  data-testid="umpire-email-input"
                  className="border-stone-300"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email of a registered umpire who will manage this tournament
                </p>
              </div>

              {/* Scoring Type Selection */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Scoring Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setScoringType('skins')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      scoringType === 'skins'
                        ? 'border-primary bg-primary/5'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                    data-testid="skins-scoring-button"
                  >
                    <div className="font-semibold mb-1">Skins Scoring</div>
                    <div className="text-xs text-muted-foreground">
                      3 skins per match, bonus points system
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoringType('standard')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      scoringType === 'standard'
                        ? 'border-primary bg-primary/5'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                    data-testid="standard-scoring-button"
                  >
                    <div className="font-semibold mb-1">Standard Scoring</div>
                    <div className="text-xs text-muted-foreground">
                      End-by-end, highest total wins
                    </div>
                  </button>
                </div>
              </div>

              {/* Standard Scoring Options */}
              {scoringType === 'standard' && (
                <div className="space-y-4 border-l-4 border-primary pl-4 bg-primary/5 p-4 rounded-r-lg">
                  <div className="space-y-2">
                    <Label htmlFor="player-format">Player Format</Label>
                    <select
                      id="player-format"
                      value={playerFormat}
                      onChange={(e) => setPlayerFormat(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-md"
                      data-testid="player-format-select"
                    >
                      <option value="singles">Singles (1 player per team)</option>
                      <option value="pairs">Pairs (2 players per team)</option>
                      <option value="trips">Trips (3 players per team)</option>
                      <option value="fours">Fours (4 players per team)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="num-ends">Number of Ends: {numEnds}</Label>
                    <input
                      id="num-ends"
                      type="range"
                      min="12"
                      max="21"
                      value={numEnds}
                      onChange={(e) => setNumEnds(parseInt(e.target.value))}
                      className="w-full"
                      data-testid="num-ends-slider"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>12</span>
                      <span>21</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="draw-type">Draw Type (Round 2 onwards)</Label>
                    <select
                      id="draw-type"
                      value={drawTypeRound2}
                      onChange={(e) => setDrawTypeRound2(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-md"
                      data-testid="draw-type-select"
                    >
                      <option value="random">Random (avoid repeats)</option>
                      <option value="strength">Strength vs Strength (by standings)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900">
                      <strong>Standard Scoring:</strong> Winner is the team with most shots. 
                      Standings ranked by: Total Points → Shot Difference → Shots For
                    </p>
                  </div>
                </div>
              )}

              {/* Skins Scoring Info */}
              {scoringType === 'skins' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-900">
                    <strong>Skins Scoring:</strong> 15 ends, 3 skins of 5 ends each. 
                    Winner of each skin gets 1 point. Team with most skin points gets +2 bonus.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Teams ({teams.filter(t => t.trim()).length}/24)</Label>
                  <Button
                    type="button"
                    onClick={addTeam}
                    variant="outline"
                    size="sm"
                    disabled={teams.length >= 24}
                    data-testid="add-team-button"
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Team
                  </Button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto" data-testid="teams-list">
                  {teams.map((team, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={`Team ${index + 1} name`}
                        value={team}
                        onChange={(e) => updateTeam(index, e.target.value)}
                        data-testid={`team-input-${index}`}
                        className="border-stone-300"
                      />
                      <Button
                        type="button"
                        onClick={() => removeTeam(index)}
                        variant="outline"
                        size="icon"
                        disabled={teams.length <= 2}
                        data-testid={`remove-team-${index}`}
                        className="border-accent text-accent hover:bg-accent/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground">
                  • Teams must be even (for pairing)
                  <br />
                  • Maximum 24 teams (12 matches per round)
                  <br />
                  • Tournament will have 7 rounds total
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  data-testid="cancel-button"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  data-testid="submit-tournament-button"
                >
                  {loading ? 'Creating...' : 'Create Tournament'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTournament;