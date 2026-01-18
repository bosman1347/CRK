import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Calendar, Trophy, Users } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const KnockoutBracketSetup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  
  const [championship, setChampionship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Number of teams determines the bracket structure
  const [numTeams, setNumTeams] = useState(16);
  
  // Match data for each round
  const [preliminaryMatches, setPreliminaryMatches] = useState([]);
  const [last16Matches, setLast16Matches] = useState([]);
  const [quarterFinalMatches, setQuarterFinalMatches] = useState([]);
  const [semiFinalMatches, setSemiFinalMatches] = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);
  
  // Mapping from preliminary to last 16
  const [preliminaryMapping, setPreliminaryMapping] = useState([]);

  useEffect(() => {
    fetchChampionship();
  }, [id]);

  useEffect(() => {
    // When numTeams changes, recalculate the bracket structure
    generateBracketStructure(numTeams);
  }, [numTeams]);

  const fetchChampionship = async () => {
    try {
      const response = await axios.get(`${API}/championships/${id}`, { headers: getAuthHeader() });
      setChampionship(response.data);
    } catch (error) {
      toast.error('Failed to load championship');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateBracketStructure = (teams) => {
    // Calculate bracket structure based on number of teams
    let prelim = [];
    let l16 = [];
    let mapping = [];
    
    if (teams > 16) {
      // Need preliminary round
      const prelimTeams = (teams - 16) * 2; // Teams that need to play preliminary
      const prelimMatchCount = prelimTeams / 2;
      const directEntries = teams - prelimTeams;
      
      // Create preliminary matches
      prelim = Array.from({ length: prelimMatchCount }, (_, i) => ({
        match_number: i + 1,
        participant1_name: '',
        participant2_name: '',
        scheduled_date: '',
        scheduled_time: '',
        green: '',
        rink: ''
      }));
      
      // Create Last 16 matches - some with direct entries, some with TBD from preliminary
      l16 = Array.from({ length: 8 }, (_, i) => ({
        match_number: i + 1,
        participant1_name: '',
        participant2_name: '',
        scheduled_date: '',
        scheduled_time: '',
        green: '',
        rink: ''
      }));
      
      // Create mapping: preliminary winners go to specific last16 slots
      // For 20 teams (4 preliminary matches), winners fill slots in last 16
      mapping = Array.from({ length: prelimMatchCount }, (_, i) => ({
        preliminary_match: i + 1,
        last16_match: i + 1, // Default: match 1 winner -> L16 match 1
        slot: 1 // slot 1 or 2
      }));
      
    } else if (teams === 16) {
      // Standard Last 16
      l16 = Array.from({ length: 8 }, (_, i) => ({
        match_number: i + 1,
        participant1_name: '',
        participant2_name: '',
        scheduled_date: '',
        scheduled_time: '',
        green: '',
        rink: ''
      }));
    } else if (teams <= 8) {
      // Start from quarter finals
      l16 = []; // No last 16
    }
    
    // Quarter finals (4 matches)
    const qf = Array.from({ length: 4 }, (_, i) => ({
      match_number: i + 1,
      participant1_name: 'TBD',
      participant2_name: 'TBD',
      scheduled_date: '',
      scheduled_time: '',
      green: '',
      rink: ''
    }));
    
    // Semi finals (2 matches)
    const sf = Array.from({ length: 2 }, (_, i) => ({
      match_number: i + 1,
      participant1_name: 'TBD',
      participant2_name: 'TBD',
      scheduled_date: '',
      scheduled_time: '',
      green: '',
      rink: ''
    }));
    
    // Final (1 match)
    const final = {
      match_number: 1,
      participant1_name: 'TBD',
      participant2_name: 'TBD',
      scheduled_date: '',
      scheduled_time: '',
      green: '',
      rink: ''
    };
    
    setPreliminaryMatches(prelim);
    setLast16Matches(l16);
    setQuarterFinalMatches(qf);
    setSemiFinalMatches(sf);
    setFinalMatch(final);
    setPreliminaryMapping(mapping);
  };

  const updateMatch = (stage, index, field, value) => {
    const updateFn = {
      preliminary: setPreliminaryMatches,
      last_16: setLast16Matches,
      quarter_final: setQuarterFinalMatches,
      semi_final: setSemiFinalMatches
    }[stage];
    
    const matches = {
      preliminary: preliminaryMatches,
      last_16: last16Matches,
      quarter_final: quarterFinalMatches,
      semi_final: semiFinalMatches
    }[stage];
    
    if (updateFn && matches) {
      const updated = [...matches];
      updated[index] = { ...updated[index], [field]: value };
      updateFn(updated);
    }
  };

  const updateFinalMatch = (field, value) => {
    setFinalMatch(prev => ({ ...prev, [field]: value }));
  };

  const updateMapping = (index, field, value) => {
    const updated = [...preliminaryMapping];
    updated[index] = { ...updated[index], [field]: parseInt(value) || value };
    setPreliminaryMapping(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const bracketSetup = {
        preliminary_matches: preliminaryMatches.length > 0 ? preliminaryMatches : null,
        last_16_matches: last16Matches,
        quarter_final_matches: quarterFinalMatches,
        semi_final_matches: semiFinalMatches,
        final_match: finalMatch,
        preliminary_to_last16_mapping: preliminaryMapping.length > 0 ? preliminaryMapping : null
      };
      
      const response = await axios.post(
        `${API}/championships/${id}/setup-full-knockout`,
        bracketSetup,
        { headers: getAuthHeader() }
      );
      
      toast.success(response.data.message);
      navigate(`/championships/${id}`);
    } catch (error) {
      // Handle Pydantic validation errors (array of objects)
      const detail = error.response?.data?.detail;
      let errorMsg = 'Failed to setup bracket';
      
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        // Pydantic validation errors
        errorMsg = detail.map(e => e.msg || JSON.stringify(e)).join(', ');
      } else if (detail?.msg) {
        errorMsg = detail.msg;
      }
      
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderMatchInputs = (stage, matches, stageName) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          {stageName}
        </CardTitle>
        <CardDescription>
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {matches.map((match, index) => (
            <div key={index} className="border rounded-lg p-4 bg-stone-50">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline">Match {match.match_number}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Participant 1</Label>
                  <Input
                    value={match.participant1_name}
                    onChange={(e) => updateMatch(stage, index, 'participant1_name', e.target.value)}
                    placeholder={stage === 'preliminary' ? "Team name" : "TBD"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Participant 2</Label>
                  <Input
                    value={match.participant2_name}
                    onChange={(e) => updateMatch(stage, index, 'participant2_name', e.target.value)}
                    placeholder={stage === 'preliminary' ? "Team name" : "TBD"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={match.scheduled_date}
                    onChange={(e) => updateMatch(stage, index, 'scheduled_date', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={match.scheduled_time}
                    onChange={(e) => updateMatch(stage, index, 'scheduled_time', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-xs">Green</Label>
                  <Input
                    value={match.green}
                    onChange={(e) => updateMatch(stage, index, 'green', e.target.value)}
                    placeholder="A or B"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Rink</Label>
                  <Input
                    type="number"
                    value={match.rink}
                    onChange={(e) => updateMatch(stage, index, 'rink', e.target.value)}
                    placeholder="1-6"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-emerald-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => navigate(`/championships/${id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-heading text-white">Setup Knockout Bracket</h1>
          <div className="w-20"></div>
        </div>

        {/* Championship Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{championship?.name}</CardTitle>
            <CardDescription>
              Configure the complete knockout bracket with match schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <Label htmlFor="numTeams">Number of Teams/Pairs</Label>
                <Input
                  id="numTeams"
                  type="number"
                  min="4"
                  max="32"
                  value={numTeams}
                  onChange={(e) => setNumTeams(parseInt(e.target.value) || 16)}
                  className="w-32 mt-1"
                />
              </div>
              <div className="text-sm text-muted-foreground mt-6">
                {numTeams > 16 && (
                  <span className="text-amber-600">
                    Preliminary round needed: {(numTeams - 16) * 2} teams play {numTeams - 16} matches
                  </span>
                )}
                {numTeams === 16 && <span>Standard Last 16 bracket</span>}
                {numTeams < 16 && <span>Smaller bracket ({numTeams} teams)</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preliminary Round (if needed) */}
        {preliminaryMatches.length > 0 && (
          <>
            {renderMatchInputs('preliminary', preliminaryMatches, 'Preliminary Round')}
            
            {/* Mapping Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Preliminary → Last 16 Mapping</CardTitle>
                <CardDescription>
                  Specify which Last 16 match and slot each preliminary winner advances to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {preliminaryMapping.map((mapping, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-stone-50 rounded-lg">
                      <span className="text-sm font-medium">
                        Preliminary Match {mapping.preliminary_match} winner →
                      </span>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Last 16 Match</Label>
                        <Input
                          type="number"
                          min="1"
                          max="8"
                          value={mapping.last16_match}
                          onChange={(e) => updateMapping(index, 'last16_match', e.target.value)}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Slot</Label>
                        <select
                          value={mapping.slot}
                          onChange={(e) => updateMapping(index, 'slot', e.target.value)}
                          className="border rounded px-2 py-1"
                        >
                          <option value={1}>Participant 1</option>
                          <option value={2}>Participant 2</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Last 16 */}
        {last16Matches.length > 0 && renderMatchInputs('last_16', last16Matches, 'Last 16')}

        {/* Quarter Finals */}
        {renderMatchInputs('quarter_final', quarterFinalMatches, 'Quarter Finals')}

        {/* Semi Finals */}
        {renderMatchInputs('semi_final', semiFinalMatches, 'Semi Finals')}

        {/* Final */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finalMatch && (
              <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Participant 1</Label>
                    <Input
                      value={finalMatch.participant1_name}
                      onChange={(e) => updateFinalMatch('participant1_name', e.target.value)}
                      placeholder="TBD"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Participant 2</Label>
                    <Input
                      value={finalMatch.participant2_name}
                      onChange={(e) => updateFinalMatch('participant2_name', e.target.value)}
                      placeholder="TBD"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={finalMatch.scheduled_date}
                      onChange={(e) => updateFinalMatch('scheduled_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="time"
                      value={finalMatch.scheduled_time}
                      onChange={(e) => updateFinalMatch('scheduled_time', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/championships/${id}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {submitting ? 'Creating Bracket...' : 'Create Knockout Bracket'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KnockoutBracketSetup;
