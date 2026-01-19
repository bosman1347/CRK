import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = process.env.REACT_APP_CLUB_LOGO_URL || "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const PrintableBracket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [championship, setChampionship] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [champRes, matchesRes] = await Promise.all([
        axios.get(`${API}/championships/${id}`, { headers: getAuthHeader() }),
        axios.get(`${API}/championships/${id}/matches`, { headers: getAuthHeader() })
      ]);
      setChampionship(champRes.data);
      setMatches(matchesRes.data.filter(m => m.stage !== 'round_robin'));
    } catch (error) {
      toast.error('Failed to load bracket data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Group matches by stage
  const getMatchesByStage = (stage) => {
    return matches
      .filter(m => m.stage === stage)
      .sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
  };

  const getStageName = (stage) => {
    const names = {
      'qualifying': 'Kwalifiserende',
      'preliminary': 'Kwalifiserende',
      'last_16': 'Laaste 16',
      'quarter_final': 'Kwart Eind',
      'knockout_quarter': 'Kwart Eind',
      'semi_final': 'Half Eind',
      'knockout_semi': 'Half Eind',
      'final': 'Finaal'
    };
    return names[stage] || stage;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-ZA', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
    } catch {
      return dateStr;
    }
  };

  // Determine which stages exist
  const stages = ['qualifying', 'preliminary', 'last_16', 'quarter_final', 'knockout_quarter', 'semi_final', 'knockout_semi', 'final'];
  const activeStages = stages.filter(s => getMatchesByStage(s).length > 0);
  
  // Deduplicate similar stages
  const displayStages = [];
  activeStages.forEach(stage => {
    if (stage === 'preliminary' && displayStages.includes('qualifying')) return;
    if (stage === 'knockout_quarter' && displayStages.includes('quarter_final')) return;
    if (stage === 'knockout_semi' && displayStages.includes('semi_final')) return;
    displayStages.push(stage);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading bracket...</div>
      </div>
    );
  }

  const MatchBox = ({ match, matchNum }) => (
    <div className="match-box">
      <div className="match-number">{matchNum}</div>
      <div className="match-content">
        <div className={`participant ${match.winner_id === match.participant1_id ? 'winner' : ''}`}>
          {match.participant1_name || 'TBD'}
        </div>
        <div className={`participant ${match.winner_id === match.participant2_id ? 'winner' : ''}`}>
          {match.participant2_name || 'TBD'}
        </div>
        <div className="match-info">
          {match.scheduled_date && <span>{formatDate(match.scheduled_date)}</span>}
          {match.scheduled_time && <span> {match.scheduled_time}</span>}
        </div>
        {match.verified && (
          <div className="match-score">
            {match.participant1_shots} - {match.participant2_shots}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Screen controls - hidden when printing */}
      <div className="no-print p-4 bg-emerald-800 flex items-center justify-between">
        <Button variant="ghost" className="text-white" onClick={() => navigate(`/championships/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="text-white text-xl font-bold">Print Bracket</h1>
        <Button onClick={handlePrint} className="bg-amber-500 hover:bg-amber-600">
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
      </div>

      {/* Printable bracket */}
      <div className="bracket-container">
        {/* Header */}
        <div className="bracket-header">
          <img src={CLUB_LOGO} alt="Club Logo" className="club-logo" />
          <div className="bracket-title">
            <h1>{championship?.name}</h1>
            <p>Klub Kompetisies 2025/26</p>
          </div>
        </div>

        {/* Bracket */}
        <div className="bracket-wrapper">
          {displayStages.map((stage, stageIndex) => {
            const stageMatches = getMatchesByStage(stage);
            // Also get matches from equivalent stages
            if (stage === 'qualifying') {
              stageMatches.push(...getMatchesByStage('preliminary'));
            }
            if (stage === 'quarter_final') {
              stageMatches.push(...getMatchesByStage('knockout_quarter'));
            }
            if (stage === 'semi_final') {
              stageMatches.push(...getMatchesByStage('knockout_semi'));
            }
            
            // Sort and deduplicate
            const uniqueMatches = [...new Map(stageMatches.map(m => [m.id, m])).values()]
              .sort((a, b) => (a.match_number || 0) - (b.match_number || 0));

            return (
              <div key={stage} className="bracket-round" style={{ '--stage-index': stageIndex }}>
                <div className="round-header">{getStageName(stage)}</div>
                <div className="round-matches">
                  {uniqueMatches.map((match, idx) => (
                    <MatchBox key={match.id} match={match} matchNum={match.match_number || idx + 1} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Winner section */}
          <div className="bracket-round winner-section">
            <div className="round-header">Wenner</div>
            <div className="winner-trophy">🏆</div>
            {matches.find(m => m.stage === 'final' && m.verified) && (
              <div className="winner-name">
                {matches.find(m => m.stage === 'final' && m.verified)?.winner_id === 
                 matches.find(m => m.stage === 'final')?.participant1_id
                  ? matches.find(m => m.stage === 'final')?.participant1_name
                  : matches.find(m => m.stage === 'final')?.participant2_name}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bracket-footer">
          <p>Centurion Rolbal Klub</p>
          <p className="print-date">Gedruk: {new Date().toLocaleDateString('en-ZA')}</p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .bracket-container { 
            page-break-inside: avoid;
            padding: 10mm;
          }
        }

        .bracket-container {
          background: white;
          min-height: 100vh;
          padding: 20px;
          font-family: Arial, sans-serif;
        }

        .bracket-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 30px;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #166534;
        }

        .club-logo {
          width: 80px;
          height: auto;
        }

        .bracket-title {
          text-align: center;
        }

        .bracket-title h1 {
          font-size: 24px;
          color: #166534;
          margin: 0;
          font-weight: bold;
        }

        .bracket-title p {
          font-size: 14px;
          color: #666;
          margin: 5px 0 0 0;
        }

        .bracket-wrapper {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding: 20px 0;
          align-items: flex-start;
        }

        .bracket-round {
          display: flex;
          flex-direction: column;
          min-width: 180px;
        }

        .round-header {
          background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
          color: white;
          padding: 8px 15px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          border-radius: 4px 4px 0 0;
          text-transform: uppercase;
        }

        .round-matches {
          display: flex;
          flex-direction: column;
          gap: calc(20px * (var(--stage-index) + 1));
          padding-top: calc(10px * var(--stage-index));
        }

        .match-box {
          display: flex;
          background: #f0fdf4;
          border: 2px solid #166534;
          border-radius: 4px;
          position: relative;
          min-height: 60px;
        }

        .match-number {
          background: #166534;
          color: white;
          width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
        }

        .match-content {
          flex: 1;
          padding: 5px 8px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .participant {
          font-size: 11px;
          padding: 2px 0;
          border-bottom: 1px solid #ddd;
        }

        .participant:last-of-type {
          border-bottom: none;
        }

        .participant.winner {
          font-weight: bold;
          color: #166534;
          background: #dcfce7;
        }

        .match-info {
          font-size: 9px;
          color: #666;
          margin-top: 3px;
        }

        .match-score {
          font-size: 10px;
          font-weight: bold;
          color: #166534;
          text-align: center;
          margin-top: 2px;
        }

        .winner-section {
          align-items: center;
          justify-content: center;
          padding-top: 100px;
        }

        .winner-trophy {
          font-size: 60px;
          margin: 20px 0;
        }

        .winner-name {
          font-size: 14px;
          font-weight: bold;
          color: #166534;
          text-align: center;
          padding: 10px;
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 4px;
        }

        .bracket-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #166534;
          text-align: center;
          color: #666;
          font-size: 12px;
        }

        .print-date {
          font-size: 10px;
          color: #999;
        }

        /* Bracket connecting lines */
        .bracket-round:not(:last-child) .match-box::after {
          content: '';
          position: absolute;
          right: -10px;
          top: 50%;
          width: 10px;
          height: 2px;
          background: #166534;
        }
      `}</style>
    </>
  );
};

export default PrintableBracket;
