import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, QrCode, CheckCircle, Upload, Play, ChevronRight, Trophy, Crown, Printer, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import KnockoutBracket from '../components/KnockoutBracket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const FRONTEND_URL = window.location.origin;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const ChampionshipManage = () => {
  const { id } = useParams();
  const [championship, setChampionship] = useState(null);
  const [sections, setSections] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [verifyingMatch, setVerifyingMatch] = useState(null);
  const [verifyScores, setVerifyScores] = useState({ participant1_shots: '', participant2_shots: '' });
  const [knockoutEntries, setKnockoutEntries] = useState([{ participant1_name: '', participant2_name: '' }]);
  const [showKnockoutDialog, setShowKnockoutDialog] = useState(false);
  const fileInputRef = useRef(null);
  
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [champRes, sectionsRes, participantsRes, matchesRes] = await Promise.all([
        axios.get(`${API}/championships/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/championships/${id}/sections`, { headers: getAuthHeader() }),
        axios.get(`${API}/championships/${id}/participants`, { headers: getAuthHeader() }),
        axios.get(`${API}/championships/${id}/matches`, { headers: getAuthHeader() })
      ]);
      
      setChampionship(champRes.data);
      setSections(sectionsRes.data);
      setParticipants(participantsRes.data);
      setMatches(matchesRes.data);
      
      // Get access token if available
      if (matchesRes.data.length > 0 && matchesRes.data[0].access_token) {
        setAccessToken(matchesRes.data[0].access_token);
      }
    } catch (error) {
      toast.error('Failed to load championship data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Show loading message
    toast.info(`Uploading ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(
        `${API}/championships/${id}/upload-participants`,
        formData,
        { headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload participants. Please check your CSV format.');
    }
    
    // Reset file input so the same file can be selected again if needed
    e.target.value = '';
  };

  const generateRoundRobin = async () => {
    try {
      const response = await axios.post(
        `${API}/championships/${id}/generate-round-robin`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success(response.data.message);
      setAccessToken(response.data.access_token);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate round-robin');
    }
  };

  const generateKnockout = async () => {
    try {
      const response = await axios.post(
        `${API}/championships/${id}/generate-knockout`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success(response.data.message);
      setAccessToken(response.data.access_token);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate knockout');
    }
  };

  const advanceKnockout = async () => {
    try {
      const response = await axios.post(
        `${API}/championships/${id}/advance-knockout`,
        {},
        { headers: getAuthHeader() }
      );
      toast.success(response.data.message);
      if (response.data.access_token) {
        setAccessToken(response.data.access_token);
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to advance knockout');
    }
  };

  const submitManualKnockout = async () => {
    const validEntries = knockoutEntries.filter(e => e.participant1_name.trim() && e.participant2_name.trim());
    if (validEntries.length === 0) {
      toast.error('Please enter at least one match');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API}/championships/${id}/manual-knockout-entry`,
        validEntries,
        { headers: getAuthHeader() }
      );
      toast.success(response.data.message);
      setAccessToken(response.data.access_token);
      setShowKnockoutDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create knockout bracket');
    }
  };

  const openVerifyDialog = (match) => {
    setVerifyingMatch(match);
    setVerifyScores({
      participant1_shots: match.participant1_shots !== null ? match.participant1_shots : '',
      participant2_shots: match.participant2_shots !== null ? match.participant2_shots : ''
    });
  };

  const verifyMatch = async () => {
    const p1Shots = parseInt(verifyScores.participant1_shots);
    const p2Shots = parseInt(verifyScores.participant2_shots);
    
    if (isNaN(p1Shots) || isNaN(p2Shots)) {
      toast.error('Both scores must be valid numbers');
      return;
    }
    
    // Check for draw in knockout
    if (verifyingMatch.stage !== 'round_robin' && p1Shots === p2Shots) {
      toast.error('Knockout matches cannot end in a draw');
      return;
    }
    
    try {
      await axios.post(
        `${API}/championships/${id}/matches/${verifyingMatch.id}/verify`,
        { participant1_shots: p1Shots, participant2_shots: p2Shots },
        { headers: getAuthHeader() }
      );
      toast.success('Match verified successfully!');
      setVerifyingMatch(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify match');
    }
  };

  const printQRCode = () => {
    if (!accessToken) {
      toast.error('No active stage to print QR code');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    const qrUrl = `${FRONTEND_URL}/championship-round/${accessToken}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${championship.name} - QR Code</title>
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
          .container { max-width: 500px; }
          .logo { width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; }
          .club-name { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 4px; }
          .club-name-alt { font-size: 20px; font-weight: bold; color: #1a1a1a; margin-bottom: 20px; }
          h1 { font-size: 22px; margin-bottom: 8px; color: #1a1a1a; }
          h2 { font-size: 18px; margin-bottom: 25px; color: #d97706; font-weight: 600; }
          .qr-container { padding: 20px; border: 3px solid #d97706; border-radius: 16px; margin-bottom: 25px; display: inline-block; }
          .instructions { font-size: 16px; color: #666; line-height: 1.6; }
          .instructions strong { color: #1a1a1a; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${CLUB_LOGO}" alt="Club Logo" class="logo" />
          <p class="club-name">Centurion Bowls Club</p>
          <p class="club-name-alt">Centurion Rolbalklub</p>
          <h1>${championship.name}</h1>
          <h2>${championship.current_stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h2>
          <div class="qr-container">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}" alt="QR Code" width="300" height="300" />
          </div>
          <p class="instructions"><strong>Scan this QR code with your phone</strong><br/>to enter your match scores</p>
        </div>
        <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getSectionStandings = (sectionId) => {
    return participants
      .filter(p => p.section_id === sectionId)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.shot_difference !== a.shot_difference) return b.shot_difference - a.shot_difference;
        return b.shots_for - a.shots_for;
      });
  };

  const roundRobinMatches = matches.filter(m => m.stage === 'round_robin');
  const knockoutMatches = matches.filter(m => m.stage !== 'round_robin');
  const allRoundRobinVerified = roundRobinMatches.length > 0 && roundRobinMatches.every(m => m.verified);
  const currentStageMatches = matches.filter(m => m.stage === championship?.current_stage);
  const allCurrentStageVerified = currentStageMatches.length > 0 && currentStageMatches.every(m => m.verified);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading championship...</p></div>;
  }

  if (!championship) {
    return <div className="min-h-screen flex items-center justify-center"><p>Championship not found</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white py-12">
        <div className="container mx-auto px-6">
          <Button onClick={() => navigate('/')} variant="ghost" className="text-white hover:bg-white/10 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-heading mb-2">{championship.name}</h1>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white/20 text-white capitalize">{championship.competition_type}</Badge>
                <Badge className="bg-white/20 text-white capitalize">{championship.gender_category}</Badge>
                <Badge className="bg-white/20 text-white capitalize">{championship.current_stage.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
            <div className="flex gap-3">
              <Link to={`/championship-standings/${id}`} target="_blank">
                <Button variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  <Trophy className="w-4 h-4 mr-2" /> Public Standings
                </Button>
              </Link>
              {accessToken && (
                <Button onClick={printQRCode} variant="outline" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                  <Printer className="w-4 h-4 mr-2" /> Print QR Code
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Setup Stage */}
        {championship.status === 'setup' && (
          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-xl font-heading">Setup Championship</CardTitle>
              <CardDescription>
                {championship.start_type === 'round_robin' 
                  ? 'Upload a CSV file with sections and participants'
                  : 'Enter the knockout bracket manually'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {championship.start_type === 'round_robin' ? (
                <>
                  <div className="border-2 border-dashed border-stone-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto text-stone-400 mb-4" />
                    <p className="text-muted-foreground mb-4">Upload CSV with Section and Name columns</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                      <Upload className="w-4 h-4 mr-2" /> Select CSV File
                    </Button>
                  </div>
                  
                  {sections.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold">Uploaded Sections:</h4>
                      {sections.map(section => (
                        <div key={section.id} className="p-4 bg-stone-50 rounded-lg">
                          <p className="font-semibold">Section {section.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {participants.filter(p => p.section_id === section.id).map(p => p.name).join(', ')}
                          </p>
                        </div>
                      ))}
                      <Button onClick={generateRoundRobin} className="w-full bg-amber-500 hover:bg-amber-600">
                        <Play className="w-4 h-4 mr-2" /> Generate Round Robin Matches
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Button onClick={() => setShowKnockoutDialog(true)} className="w-full bg-amber-500 hover:bg-amber-600">
                  <Play className="w-4 h-4 mr-2" /> Enter Knockout Bracket
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Championship */}
        {championship.status !== 'setup' && (
          <Tabs defaultValue="matches" className="space-y-8">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="matches">Matches</TabsTrigger>
              <TabsTrigger value="standings">Standings</TabsTrigger>
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
            </TabsList>

            <TabsContent value="matches">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-heading">
                    {championship.current_stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Matches
                  </h3>
                  <div className="flex gap-3 items-center">
                    {accessToken && (
                      <Dialog>
                        <Button variant="outline" onClick={() => {}}>
                          <QrCode className="w-4 h-4 mr-2" /> Show QR Code
                        </Button>
                      </Dialog>
                    )}
                    <Badge className={allCurrentStageVerified ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                      {currentStageMatches.filter(m => m.verified).length} / {currentStageMatches.length} Verified
                    </Badge>
                  </div>
                </div>

                {/* QR Code Display */}
                {accessToken && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <QRCodeSVG value={`${FRONTEND_URL}/championship-round/${accessToken}`} size={80} />
                        <div>
                          <p className="font-semibold">Score Entry QR Code</p>
                          <p className="text-sm text-muted-foreground">Players scan to enter match scores</p>
                        </div>
                      </div>
                      <Button onClick={printQRCode} variant="outline" size="sm">
                        <Printer className="w-4 h-4 mr-2" /> Print
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Matches by Section */}
                {championship.current_stage === 'round_robin' && sections.map(section => (
                  <Card key={section.id} className="floating-card border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Section {section.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {matches.filter(m => m.section_id === section.id).map(match => (
                          <div key={match.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                            <div className="flex-1">
                              <span className="font-medium">{match.participant1_name}</span>
                              <span className="mx-2 text-muted-foreground">vs</span>
                              <span className="font-medium">{match.participant2_name}</span>
                              {match.verified && (
                                <span className="ml-3 text-primary font-mono">
                                  {match.participant1_shots} - {match.participant2_shots}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {match.verified ? (
                                <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
                              ) : (
                                <Button size="sm" onClick={() => openVerifyDialog(match)}>
                                  <Eye className="w-4 h-4 mr-1" /> Verify
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Knockout Matches */}
                {championship.current_stage !== 'round_robin' && (
                  <Card className="floating-card border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">{championship.current_stage.replace(/_/g, ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {currentStageMatches.map(match => (
                          <div key={match.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <Badge variant="outline">Green {match.green} - Rink {match.rink}</Badge>
                                <span className="font-semibold">{match.participant1_name}</span>
                                <span className="text-muted-foreground">vs</span>
                                <span className="font-semibold">{match.participant2_name}</span>
                                {match.verified && (
                                  <span className="ml-3 text-xl font-mono font-bold text-primary">
                                    {match.participant1_shots} - {match.participant2_shots}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              {match.verified ? (
                                <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
                              ) : (
                                <Button onClick={() => openVerifyDialog(match)}>
                                  <Eye className="w-4 h-4 mr-1" /> Verify Match
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 justify-end">
                  {championship.status === 'round_robin' && allRoundRobinVerified && (
                    <Button onClick={generateKnockout} className="bg-amber-500 hover:bg-amber-600">
                      <ChevronRight className="w-4 h-4 mr-2" /> Generate Knockout Bracket
                    </Button>
                  )}
                  {championship.status === 'knockout' && allCurrentStageVerified && championship.current_stage !== 'final' && (
                    <Button onClick={advanceKnockout} className="bg-amber-500 hover:bg-amber-600">
                      <ChevronRight className="w-4 h-4 mr-2" /> Advance to Next Round
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="standings">
              <div className="space-y-6">
                {sections.map(section => (
                  <Card key={section.id} className="floating-card border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Section {section.name} Standings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-stone-200">
                            <th className="text-left py-2 px-2">Pos</th>
                            <th className="text-left py-2 px-2">Name</th>
                            <th className="text-center py-2 px-2">P</th>
                            <th className="text-center py-2 px-2">W</th>
                            <th className="text-center py-2 px-2">D</th>
                            <th className="text-center py-2 px-2">L</th>
                            <th className="text-center py-2 px-2">Pts</th>
                            <th className="text-center py-2 px-2">SF</th>
                            <th className="text-center py-2 px-2">SA</th>
                            <th className="text-center py-2 px-2">SD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSectionStandings(section.id).map((p, idx) => (
                            <tr key={p.id} className="border-b border-stone-100">
                              <td className="py-2 px-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-700'}`}>
                                  {idx + 1}
                                </div>
                              </td>
                              <td className="py-2 px-2 font-semibold">{p.name}</td>
                              <td className="text-center py-2 px-2 font-mono">{p.matches_played}</td>
                              <td className="text-center py-2 px-2 font-mono">{p.wins}</td>
                              <td className="text-center py-2 px-2 font-mono">{p.draws}</td>
                              <td className="text-center py-2 px-2 font-mono">{p.losses}</td>
                              <td className="text-center py-2 px-2 font-mono font-bold text-amber-600">{p.points}</td>
                              <td className="text-center py-2 px-2 font-mono">{p.shots_for}</td>
                              <td className="text-center py-2 px-2 font-mono">{p.shots_against}</td>
                              <td className="text-center py-2 px-2 font-mono font-semibold">{p.shot_difference > 0 ? '+' : ''}{p.shot_difference}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bracket">
              <KnockoutBracket matches={knockoutMatches} championship={championship} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Verify Match Dialog */}
      {verifyingMatch && (
        <Dialog open={!!verifyingMatch} onOpenChange={() => setVerifyingMatch(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Verify Match Scores</DialogTitle>
              <DialogDescription>Review and confirm scores from paper scorecard</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="font-semibold">{verifyingMatch.participant1_name} vs {verifyingMatch.participant2_name}</p>
                {verifyingMatch.green && <p className="text-sm text-muted-foreground">Green {verifyingMatch.green} - Rink {verifyingMatch.rink}</p>}
                {verifyingMatch.scores_entered && (
                  <Badge className="bg-blue-100 text-blue-700 mt-2">Players have entered scores</Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{verifyingMatch.participant1_name}</Label>
                  {verifyingMatch.participant1_shots !== null && (
                    <p className="text-xs text-muted-foreground">Entered: {verifyingMatch.participant1_shots}</p>
                  )}
                  <Input
                    type="number"
                    min="0"
                    value={verifyScores.participant1_shots}
                    onChange={(e) => setVerifyScores({ ...verifyScores, participant1_shots: e.target.value })}
                    className="text-center text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{verifyingMatch.participant2_name}</Label>
                  {verifyingMatch.participant2_shots !== null && (
                    <p className="text-xs text-muted-foreground">Entered: {verifyingMatch.participant2_shots}</p>
                  )}
                  <Input
                    type="number"
                    min="0"
                    value={verifyScores.participant2_shots}
                    onChange={(e) => setVerifyScores({ ...verifyScores, participant2_shots: e.target.value })}
                    className="text-center text-lg"
                  />
                </div>
              </div>
              
              {verifyingMatch.stage !== 'round_robin' && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-800"><strong>Knockout:</strong> Match cannot end in a draw</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setVerifyingMatch(null)} className="flex-1">Cancel</Button>
              <Button onClick={verifyMatch} className="flex-1 bg-amber-500 hover:bg-amber-600">Verify & Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Knockout Entry Dialog */}
      <Dialog open={showKnockoutDialog} onOpenChange={setShowKnockoutDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enter Knockout Bracket</DialogTitle>
            <DialogDescription>Enter the first round matchups</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {knockoutEntries.map((entry, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                <Input
                  placeholder="Participant 1"
                  value={entry.participant1_name}
                  onChange={(e) => {
                    const newEntries = [...knockoutEntries];
                    newEntries[idx].participant1_name = e.target.value;
                    setKnockoutEntries(newEntries);
                  }}
                  className="col-span-2"
                />
                <span className="text-center text-muted-foreground">vs</span>
                <Input
                  placeholder="Participant 2"
                  value={entry.participant2_name}
                  onChange={(e) => {
                    const newEntries = [...knockoutEntries];
                    newEntries[idx].participant2_name = e.target.value;
                    setKnockoutEntries(newEntries);
                  }}
                  className="col-span-2"
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() => setKnockoutEntries([...knockoutEntries, { participant1_name: '', participant2_name: '' }])}
              className="w-full"
            >
              + Add Match
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowKnockoutDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={submitManualKnockout} className="flex-1 bg-amber-500 hover:bg-amber-600">Create Bracket</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChampionshipManage;
