import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Trophy, Medal, RefreshCw, Printer, Share2, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const PublicStandings = () => {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch tournament info
      const tournamentRes = await axios.get(`${API}/public/tournaments/${id}/summary`);
      setTournament(tournamentRes.data.tournament);
      
      // Fetch standings
      const standingsRes = await axios.get(`${API}/public/tournaments/${id}/standings`);
      setTeams(standingsRes.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = window.location.href;
  
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const printStandings = () => {
    window.print();
  };

  const isStandardScoring = tournament?.scoring_type === 'standard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading standings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .gradient-hero {
            background: #059669 !important;
            -webkit-print-color-adjust: exact;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <img src={CLUB_LOGO} alt="Centurion Lawn Bowls Club" className="w-16 h-16 object-contain bg-white/10 rounded-lg p-1" />
              <div>
                <p className="text-sm text-emerald-200">Centurion Lawn Bowls Club • Centurion Rolbalklub</p>
                <h1 className="text-3xl md:text-4xl font-heading mb-1" data-testid="standings-title">
                  {tournament?.name || 'Tournament'} Standings
                </h1>
                <p className="text-emerald-100">
                  Round {tournament?.current_round || 0} of {tournament?.num_rounds || 7}
                  {tournament && (
                    <Badge className="ml-3 bg-white/20 text-white">
                      {isStandardScoring ? 'Standard' : 'Skins'} Scoring
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <Button
                onClick={fetchData}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                data-testid="refresh-button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={printStandings}
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                data-testid="print-button"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Share Section */}
          <Card className="floating-card border-stone-200 no-print">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-primary" />
                  <span className="font-medium">Share this page with players:</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1 bg-stone-100 rounded text-sm max-w-xs truncate">
                    {shareUrl}
                  </code>
                  <Button
                    onClick={copyLink}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Bar */}
          <div className="flex justify-between items-center no-print">
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
            <Badge className="bg-green-100 text-green-700">Live</Badge>
          </div>

          {/* Print Header */}
          <div className="print-only text-center mb-8">
            <img src={CLUB_LOGO} alt="Club Logo" style={{ width: '60px', height: '60px', margin: '0 auto 10px' }} />
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>Centurion Lawn Bowls Club</h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>Centurion Rolbalklub</p>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{tournament?.name} - Standings</h2>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Round {tournament?.current_round} of {tournament?.num_rounds || 7} • {isStandardScoring ? 'Standard' : 'Skins'} Scoring
            </p>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
              Printed: {new Date().toLocaleString()}
            </p>
          </div>

          {teams.length === 0 ? (
            <Card className="floating-card border-stone-200">
              <CardContent className="py-12 text-center">
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-heading mb-2">No Standings Yet</h3>
                <p className="text-muted-foreground">Standings will appear once matches are verified</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="floating-card border-stone-200">
              <CardHeader className="no-print">
                <CardTitle className="text-3xl font-heading flex items-center gap-3">
                  <Trophy className="w-10 h-10 text-secondary" />
                  Tournament Standings
                </CardTitle>
                <CardDescription className="text-base">
                  {isStandardScoring 
                    ? 'Ranked by: Match Points → Shot Difference → Shots For' 
                    : 'Ranked by: Skin Points → Shot Difference → Shots For'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Table View for Print */}
                <div className="print-only">
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Pos</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Team</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>P</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>W</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{isStandardScoring ? 'MP' : 'Pts'}</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>SF</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>SA</th>
                        <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>SD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams.map((team, index) => (
                        <tr key={team.id} style={{ backgroundColor: index === 0 ? '#fef3c7' : index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                          <td style={{ border: '1px solid #ddd', padding: '10px', fontWeight: 'bold' }}>{index + 1}</td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', fontWeight: index === 0 ? 'bold' : 'normal' }}>{team.name}</td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{team.matches_played}</td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{team.matches_won}</td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                            {isStandardScoring ? team.total_points.toFixed(0) : team.total_points.toFixed(1)}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{team.shots_for || 0}</td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{team.shots_against || 0}</td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            {(team.shot_difference || 0) > 0 ? '+' : ''}{team.shot_difference || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ fontSize: '10px', color: '#666', marginTop: '10px' }}>
                    P = Played, W = Won, {isStandardScoring ? 'MP = Match Points' : 'Pts = Skin Points'}, SF = Shots For, SA = Shots Against, SD = Shot Difference
                  </p>
                </div>

                {/* Card View for Screen */}
                <div className="space-y-3 no-print">
                  {teams.map((team, index) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-6 rounded-xl border transition-all ${
                        index === 0 ? 'gradient-gold text-white border-amber-500 shadow-lg' :
                        index === 1 ? 'bg-gray-100 border-gray-300' :
                        index === 2 ? 'bg-orange-50 border-orange-300' :
                        'bg-white border-stone-200'
                      }`}
                      data-testid={`team-rank-${index + 1}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
                          index === 0 ? 'bg-white text-amber-500' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-200 text-orange-700' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {index < 3 ? <Medal className="w-7 h-7" /> : index + 1}
                        </div>
                        <div>
                          <p className={`font-bold text-xl mb-1 ${index === 0 ? 'text-white' : 'text-foreground'}`}>
                            {team.name}
                          </p>
                          <p className={`text-sm ${index === 0 ? 'text-white/90' : 'text-muted-foreground'}`}>
                            {team.matches_played} played • {team.matches_won} wins • SD: {(team.shot_difference || 0) > 0 ? '+' : ''}{team.shot_difference || 0}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-4xl font-mono font-bold ${index === 0 ? 'text-white' : 'text-foreground'}`}>
                          {isStandardScoring ? team.total_points.toFixed(0) : team.total_points.toFixed(1)}
                        </p>
                        <p className={`text-sm ${index === 0 ? 'text-white/90' : 'text-muted-foreground'}`}>
                          {isStandardScoring ? 'match pts' : 'skin pts'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center no-print">
            <p className="text-sm text-blue-900">
              Standings update automatically every 30 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStandings;
