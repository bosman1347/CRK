import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Trophy, Crown } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CreateChampionship = () => {
  const [name, setName] = useState('');
  const [competitionType, setCompetitionType] = useState('singles');
  const [genderCategory, setGenderCategory] = useState('mens');
  const [ageCategory, setAgeCategory] = useState('open');
  const [startType, setStartType] = useState('round_robin');
  const [endsPerMatch, setEndsPerMatch] = useState(15);
  const [finalsEnds, setFinalsEnds] = useState(21);
  const [loading, setLoading] = useState(false);
  
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  // Generate championship name based on selections
  const generateName = () => {
    const year = new Date().getFullYear();
    const gender = genderCategory === 'mens' ? "Men's" : genderCategory === 'ladies' ? "Ladies'" : 'Mixed';
    const age = ageCategory === 'novice' ? ' Novice' : ageCategory === 'veterans' ? ' Veterans' : '';
    const type = competitionType.charAt(0).toUpperCase() + competitionType.slice(1);
    return `${year} ${gender}${age} ${type} Championship`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const championshipName = name.trim() || generateName();
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/championships`,
        {
          name: championshipName,
          competition_type: competitionType,
          gender_category: genderCategory,
          age_category: competitionType === 'singles' ? ageCategory : 'open',
          start_type: startType,
          ends_per_match: competitionType === 'singles' ? 21 : endsPerMatch,
          finals_ends: finalsEnds
        },
        { headers: getAuthHeader() }
      );
      
      toast.success('Championship created successfully!');
      navigate(`/championships/${response.data.championship.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create championship');
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
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl md:text-5xl font-heading">Create Club Championship</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <Card className="max-w-3xl mx-auto floating-card border-stone-200">
          <CardHeader>
            <CardTitle className="text-2xl font-heading flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-500" />
              Championship Details
            </CardTitle>
            <CardDescription>Set up your club championship competition</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Competition Type */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Competition Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['singles', 'pairs', 'triples', 'fours'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCompetitionType(type)}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        competitionType === type
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-semibold capitalize">{type}</div>
                      <div className="text-xs text-muted-foreground">
                        {type === 'singles' ? '1 player' : type === 'pairs' ? '2 players' : type === 'triples' ? '3 players' : '4 players'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Category */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Category</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[['mens', "Men's"], ['ladies', "Ladies'"], ['mixed', 'Mixed']].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGenderCategory(value)}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        genderCategory === value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-semibold">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Category (Only for Singles) */}
              {competitionType === 'singles' && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Age/Proficiency Group</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[['open', 'Open'], ['novice', 'Novice'], ['veterans', 'Veterans']].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAgeCategory(value)}
                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                          ageCategory === value
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="font-semibold">{label}</div>
                        <div className="text-xs text-muted-foreground">
                          {value === 'novice' ? '<3 years exp' : value === 'veterans' ? '60+ years' : 'All players'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Type */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Tournament Format</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStartType('round_robin')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      startType === 'round_robin'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-semibold">Round Robin → Knockout</div>
                    <div className="text-xs text-muted-foreground">
                      Sections play each other, winners advance to knockout
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartType('knockout')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      startType === 'knockout'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-semibold">Knockout Only</div>
                    <div className="text-xs text-muted-foreground">
                      Direct elimination from the start
                    </div>
                  </button>
                </div>
              </div>

              {/* Ends Configuration (Only for team events) */}
              {competitionType !== 'singles' && (
                <div className="space-y-4 border-l-4 border-amber-500 pl-4 bg-amber-50 p-4 rounded-r-lg">
                  <div className="space-y-2">
                    <Label>Ends per Match: {endsPerMatch}</Label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setEndsPerMatch(15)}
                        className={`px-4 py-2 rounded-lg border-2 ${
                          endsPerMatch === 15 ? 'border-amber-500 bg-white' : 'border-stone-200'
                        }`}
                      >
                        15 Ends
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndsPerMatch(18)}
                        className={`px-4 py-2 rounded-lg border-2 ${
                          endsPerMatch === 18 ? 'border-amber-500 bg-white' : 'border-stone-200'
                        }`}
                      >
                        18 Ends
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Finals Ends: {finalsEnds}</Label>
                    <input
                      type="range"
                      min="15"
                      max="25"
                      value={finalsEnds}
                      onChange={(e) => setFinalsEnds(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>15</span>
                      <span>25</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Singles Info */}
              {competitionType === 'singles' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>Singles Championship:</strong> First player to reach 21 shots wins the match.
                  </p>
                </div>
              )}

              {/* Championship Name */}
              <div className="space-y-2">
                <Label htmlFor="championship-name">Championship Name (Optional)</Label>
                <Input
                  id="championship-name"
                  type="text"
                  placeholder={generateName()}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-stone-300"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use: {generateName()}
                </p>
              </div>

              {/* Scoring Info */}
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <p className="text-xs text-stone-700">
                  <strong>Scoring:</strong> Round Robin: Win = 2 pts, Draw = 1 pt, Loss = 0 pts.<br/>
                  Standings: Points → Shot Difference → Shots For
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                >
                  {loading ? 'Creating...' : 'Create Championship'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateChampionship;
