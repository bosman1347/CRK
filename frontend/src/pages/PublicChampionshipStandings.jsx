import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Crown, Trophy, RefreshCw, Printer, Copy, CheckCircle } from 'lucide-react';
import axios from 'axios';
import KnockoutBracket from '../components/KnockoutBracket';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = process.env.REACT_APP_CLUB_LOGO_URL || "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const PublicChampionshipStandings = () => {
  const { id } = useParams();
  const [championship, setChampionship] = useState(null);
  const [sections, setSections] = useState([]);
  const [bracket, setBracket] = useState({});
  const [byeParticipants, setByeParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [standingsRes, bracketRes] = await Promise.all([
        axios.get(`${API}/public/championships/${id}/standings`),
        axios.get(`${API}/public/championships/${id}/bracket`)
      ]);
      
      setChampionship(standingsRes.data.championship);
      setSections(standingsRes.data.sections);
      setBracket(bracketRes.data.bracket);
      setByeParticipants(bracketRes.data.bye_participants || []);
    } catch (error) {
      toast.error('Failed to load championship data');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Flatten bracket matches for KnockoutBracket component
  const knockoutMatches = Object.values(bracket).flat();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <p>Loading standings...</p>
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Crown className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h2 className="text-xl font-heading mb-2">Championship Not Found</h2>
            <p className="text-muted-foreground">This championship does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 print:bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white py-8 print:bg-amber-600 print:py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={CLUB_LOGO} alt="Club Logo" className="w-16 h-16 rounded-lg bg-white/10 p-1 print:w-12 print:h-12" />
              <div>
                <p className="text-amber-100 text-sm">Centurion Bowls Club / Centurion Rolbalklub</p>
                <h1 className="text-2xl md:text-3xl font-heading">{championship.name}</h1>
                <Badge className="bg-white/20 text-white mt-1 capitalize">
                  {championship.current_stage.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button onClick={fetchData} variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
              <Button onClick={copyLink} variant="outline" size="sm" className="bg-white/10 text-white border-white/30 hover:bg-white/20">
                {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 print:py-4">
        {/* Section Standings */}
        {sections.length > 0 && sections[0].standings.length > 0 && (
          <div className="space-y-6 mb-8">
            <h2 className="text-xl font-heading flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Section Standings
            </h2>
            
            {sections.map(({ section, standings }) => (
              <Card key={section.id} className="floating-card border-stone-200 print:shadow-none print:border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Section {section.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
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
                        {standings.map((p, idx) => (
                          <tr key={p.id} className={`border-b border-stone-100 ${idx === 0 ? 'bg-amber-50' : ''}`}>
                            <td className="py-2 px-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 ? 'bg-amber-200 text-amber-800' : 'bg-stone-100 text-stone-700'
                              }`}>
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
                            <td className="text-center py-2 px-2 font-mono font-semibold">
                              {p.shot_difference > 0 ? '+' : ''}{p.shot_difference}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <div className="text-xs text-muted-foreground print:text-stone-600">
              <p><strong>P</strong> = Played, <strong>W</strong> = Won, <strong>D</strong> = Draw, <strong>L</strong> = Lost, <strong>Pts</strong> = Points (Win=2, Draw=1)</p>
              <p><strong>SF</strong> = Shots For, <strong>SA</strong> = Shots Against, <strong>SD</strong> = Shot Difference</p>
              <p className="mt-1">Ranking: Points → Shot Difference → Shots For</p>
            </div>
          </div>
        )}

        {/* Knockout Bracket */}
        {knockoutMatches.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-heading flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Knockout Bracket
            </h2>
            <KnockoutBracket matches={knockoutMatches} championship={championship} byeParticipants={byeParticipants} />
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-stone-500 py-4 border-t">
        <p>Centurion Bowls Club / Centurion Rolbalklub</p>
        <p>Printed: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PublicChampionshipStandings;
