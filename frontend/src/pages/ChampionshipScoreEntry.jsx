import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Crown, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const ChampionshipScoreEntry = () => {
  const { token } = useParams();
  const [championship, setChampionship] = useState(null);
  const [matches, setMatches] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({ participant1_shots: '', participant2_shots: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${API}/championship-round/${token}`);
      setChampionship(response.data.championship);
      setMatches(response.data.matches);
      setSections(response.data.sections);
    } catch (error) {
      toast.error('Invalid or expired access link');
    } finally {
      setLoading(false);
    }
  };

  const openScoreDialog = (match) => {
    setSelectedMatch(match);
    setScores({
      participant1_shots: match.participant1_shots !== null ? match.participant1_shots : '',
      participant2_shots: match.participant2_shots !== null ? match.participant2_shots : ''
    });
  };

  const submitScores = async () => {
    const p1 = parseInt(scores.participant1_shots);
    const p2 = parseInt(scores.participant2_shots);
    
    if (isNaN(p1) || isNaN(p2)) {
      toast.error('Please enter valid scores for both participants');
      return;
    }
    
    if (p1 < 0 || p2 < 0) {
      toast.error('Scores cannot be negative');
      return;
    }
    
    // Singles validation
    if (championship?.competition_type === 'singles' && (p1 > 21 || p2 > 21)) {
      toast.error('Singles matches have a maximum of 21 shots');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/championship-round/${token}/match/${selectedMatch.id}/scores`,
        { participant1_shots: p1, participant2_shots: p2 }
      );
      toast.success('Scores submitted successfully! Awaiting verification.');
      setSelectedMatch(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit scores');
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchesBySection = (sectionId) => {
    return matches.filter(m => m.section_id === sectionId);
  };

  const knockoutMatches = matches.filter(m => m.stage !== 'round_robin');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <p>Loading...</p>
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-heading mb-2">Invalid Link</h2>
            <p className="text-muted-foreground">This score entry link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <img src={CLUB_LOGO} alt="Club Logo" className="w-16 h-16 mx-auto mb-3 rounded-lg bg-white/10 p-1" />
          <p className="text-amber-100 text-sm">Centurion Bowls Club / Centurion Rolbalklub</p>
          <h1 className="text-2xl md:text-3xl font-heading mt-2">{championship.name}</h1>
          <Badge className="bg-white/20 text-white mt-2 capitalize">
            {championship.current_stage.replace(/_/g, ' ')}
          </Badge>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Enter Match Scores
            </CardTitle>
            <CardDescription>
              Tap on your match to enter scores. The organizer will verify from the paper scorecard.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Round Robin Matches by Section */}
        {championship.current_stage === 'round_robin' && sections.map(section => (
          <Card key={section.id} className="mb-6 floating-card">
            <CardHeader>
              <CardTitle className="text-base">Section {section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getMatchesBySection(section.id).map(match => (
                  <button
                    key={match.id}
                    onClick={() => !match.verified && openScoreDialog(match)}
                    disabled={match.verified}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      match.verified
                        ? 'bg-green-50 border-green-200 cursor-not-allowed'
                        : match.scores_entered
                          ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                          : 'bg-white border-stone-200 hover:border-amber-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{match.participant1_name}</p>
                        <p className="text-muted-foreground text-sm">vs</p>
                        <p className="font-semibold">{match.participant2_name}</p>
                      </div>
                      <div className="text-right">
                        {match.verified ? (
                          <div>
                            <div className="text-2xl font-mono font-bold text-green-700">
                              {match.participant1_shots} - {match.participant2_shots}
                            </div>
                            <Badge className="bg-green-100 text-green-700 mt-1">
                              <CheckCircle className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                          </div>
                        ) : match.scores_entered ? (
                          <div>
                            <div className="text-xl font-mono text-blue-700">
                              {match.participant1_shots} - {match.participant2_shots}
                            </div>
                            <Badge className="bg-blue-100 text-blue-700 mt-1">Submitted</Badge>
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700">Enter Scores</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Knockout Matches */}
        {championship.current_stage !== 'round_robin' && knockoutMatches.length > 0 && (
          <Card className="floating-card">
            <CardHeader>
              <CardTitle className="text-base capitalize">
                {championship.current_stage.replace(/_/g, ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {knockoutMatches.filter(m => m.stage === championship.current_stage).map(match => (
                  <button
                    key={match.id}
                    onClick={() => !match.verified && openScoreDialog(match)}
                    disabled={match.verified}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      match.verified
                        ? 'bg-green-50 border-green-200 cursor-not-allowed'
                        : match.scores_entered
                          ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                          : 'bg-white border-stone-200 hover:border-amber-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline" className="mb-2">Green {match.green} - Rink {match.rink}</Badge>
                        <p className="font-semibold text-lg">{match.participant1_name}</p>
                        <p className="text-muted-foreground">vs</p>
                        <p className="font-semibold text-lg">{match.participant2_name}</p>
                      </div>
                      <div className="text-right">
                        {match.verified ? (
                          <div>
                            <div className="text-3xl font-mono font-bold text-green-700">
                              {match.participant1_shots} - {match.participant2_shots}
                            </div>
                            <Badge className="bg-green-100 text-green-700 mt-2">
                              <CheckCircle className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                          </div>
                        ) : match.scores_entered ? (
                          <div>
                            <div className="text-2xl font-mono text-blue-700">
                              {match.participant1_shots} - {match.participant2_shots}
                            </div>
                            <Badge className="bg-blue-100 text-blue-700 mt-2">Awaiting Verification</Badge>
                          </div>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 text-base px-4 py-2">Enter Scores</Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Score Entry Dialog */}
      {selectedMatch && (
        <Dialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enter Match Scores</DialogTitle>
              <DialogDescription>
                Enter the final scores for this match
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="text-center">
                <p className="font-semibold text-lg">
                  {selectedMatch.participant1_name} vs {selectedMatch.participant2_name}
                </p>
                {selectedMatch.green && (
                  <p className="text-sm text-muted-foreground">
                    Green {selectedMatch.green} - Rink {selectedMatch.rink}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 text-center">
                  <Label className="text-base font-semibold">{selectedMatch.participant1_name}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={championship?.competition_type === 'singles' ? 21 : undefined}
                    value={scores.participant1_shots}
                    onChange={(e) => setScores({ ...scores, participant1_shots: e.target.value })}
                    className="text-center text-2xl h-16 font-mono"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2 text-center">
                  <Label className="text-base font-semibold">{selectedMatch.participant2_name}</Label>
                  <Input
                    type="number"
                    min="0"
                    max={championship?.competition_type === 'singles' ? 21 : undefined}
                    value={scores.participant2_shots}
                    onChange={(e) => setScores({ ...scores, participant2_shots: e.target.value })}
                    className="text-center text-2xl h-16 font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              {championship?.competition_type === 'singles' && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 text-center">
                    <strong>Singles:</strong> First to 21 shots wins
                  </p>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800 text-center">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Please double-check your scores before submitting.
                  The organizer will verify from the paper scorecard.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedMatch(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={submitScores} 
                disabled={submitting}
                className="flex-1 bg-amber-500 hover:bg-amber-600"
              >
                {submitting ? 'Submitting...' : 'Submit Scores'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ChampionshipScoreEntry;
