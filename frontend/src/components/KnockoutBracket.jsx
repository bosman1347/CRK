import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, Crown, FastForward, Calendar } from 'lucide-react';

const KnockoutBracket = ({ matches, championship, byeParticipants = [] }) => {
  // Group matches by stage
  const stages = {};
  matches.forEach(match => {
    if (!stages[match.stage]) {
      stages[match.stage] = [];
    }
    stages[match.stage].push(match);
  });

  // Order stages properly
  const stageOrder = ['knockout_round_1', 'knockout_round_2', 'knockout_quarter', 'knockout_semi', 'final'];
  const orderedStages = stageOrder.filter(s => stages[s]);

  const getStageTitle = (stage) => {
    const titles = {
      'knockout_round_1': 'Round 1',
      'knockout_round_2': 'Round 2',
      'knockout_quarter': 'Quarter Finals',
      'knockout_semi': 'Semi Finals',
      'final': 'Final'
    };
    return titles[stage] || stage.replace(/_/g, ' ');
  };

  const getWinner = () => {
    const finalMatch = matches.find(m => m.stage === 'final' && m.verified);
    if (finalMatch) {
      return finalMatch.winner_id === finalMatch.participant1_id 
        ? finalMatch.participant1_name 
        : finalMatch.participant2_name;
    }
    return null;
  };

  const winner = getWinner();

  if (matches.length === 0 && byeParticipants.length === 0) {
    return (
      <Card className="floating-card border-stone-200">
        <CardContent className="py-12 text-center">
          <Crown className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-xl font-heading mb-2">Knockout Bracket</h3>
          <p className="text-muted-foreground">No knockout matches yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Winner Banner */}
      {winner && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-6 text-center">
            <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-2xl font-heading text-amber-800">Champion</h2>
            <p className="text-3xl font-bold text-amber-900 mt-2">{winner}</p>
          </CardContent>
        </Card>
      )}

      {/* BYE Participants Banner */}
      {byeParticipants.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <FastForward className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Advances Automatically</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {byeParticipants.map((p, idx) => (
                <Badge key={p.id || idx} className="bg-blue-100 text-blue-700 px-3 py-1">
                  {p.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-blue-600 mt-2">
              These participants advance to the next round based on their round-robin performance
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bracket View */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {orderedStages.map((stage, stageIdx) => (
          <div key={stage} className="flex-shrink-0" style={{ minWidth: '280px' }}>
            <div className="mb-4">
              <h4 className="font-semibold text-lg text-center">{getStageTitle(stage)}</h4>
            </div>
            <div className="space-y-4">
              {stages[stage].map((match, matchIdx) => (
                <Card 
                  key={match.id} 
                  className={`border-2 ${
                    stage === 'final' 
                      ? 'border-amber-300 bg-amber-50' 
                      : match.verified 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-stone-200'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Participant 1 */}
                      <div className={`flex items-center justify-between p-2 rounded ${
                        match.verified && match.winner_id === match.participant1_id
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-white border border-stone-200'
                      }`}>
                        <span className={`font-medium ${
                          match.verified && match.winner_id === match.participant1_id
                            ? 'text-green-800'
                            : ''
                        }`}>
                          {match.participant1_name}
                        </span>
                        {match.verified && (
                          <span className="font-mono font-bold text-lg">
                            {match.participant1_shots}
                          </span>
                        )}
                      </div>
                      
                      {/* VS Divider */}
                      <div className="text-center text-xs text-muted-foreground">vs</div>
                      
                      {/* Participant 2 */}
                      <div className={`flex items-center justify-between p-2 rounded ${
                        match.verified && match.winner_id === match.participant2_id
                          ? 'bg-green-100 border border-green-300'
                          : 'bg-white border border-stone-200'
                      }`}>
                        <span className={`font-medium ${
                          match.verified && match.winner_id === match.participant2_id
                            ? 'text-green-800'
                            : ''
                        }`}>
                          {match.participant2_name}
                        </span>
                        {match.verified && (
                          <span className="font-mono font-bold text-lg">
                            {match.participant2_shots}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Match Info */}
                    <div className="mt-3 space-y-2">
                      {/* Scheduled date/time */}
                      {(match.scheduled_date || match.scheduled_time) && (
                        <div className="text-xs text-blue-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {match.scheduled_date && new Date(match.scheduled_date).toLocaleDateString()}
                          {match.scheduled_time && ` ${match.scheduled_time}`}
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        {match.green && (
                          <span className="text-xs text-muted-foreground">
                            Green {match.green} - Rink {match.rink}
                          </span>
                        )}
                        <Badge className={match.verified ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}>
                          {match.verified ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnockoutBracket;
