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
  const [teams, setTeams] = useState(['', '']);
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/tournaments`,
        { name: tournamentName, teams: validTeams },
        { headers: getAuthHeader() }
      );
      
      toast.success('Tournament created successfully!');
      navigate(`/tournaments/${response.data.id}`);
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