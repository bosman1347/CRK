import { QRCodeSVG } from 'qrcode.react';

const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const PrintableScorecard = ({ round, matches, qrUrl, tournamentName, scoringType = 'skins' }) => {
  // Group matches into pairs for 2-per-page layout
  const matchPairs = [];
  for (let i = 0; i < matches.length; i += 2) {
    matchPairs.push(matches.slice(i, i + 2));
  }

  const isStandard = scoringType === 'standard';

  return (
    <div className="print-scorecards">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          body * {
            visibility: hidden;
          }
          
          .print-scorecards,
          .print-scorecards * {
            visibility: visible;
          }
          
          .print-scorecards {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          
          .scorecard-pair {
            page-break-after: always;
            width: 100%;
            display: flex;
            gap: 10mm;
            justify-content: space-between;
          }
          
          .scorecard-pair:last-child {
            page-break-after: avoid;
          }
          
          .scorecard-single {
            width: calc(50% - 5mm);
            display: flex;
            flex-direction: column;
            min-height: 180mm;
          }
        }
        
        @media screen {
          .print-scorecards {
            display: none;
          }
        }
      `}</style>
      
      {matchPairs.map((pair, pairIndex) => (
        <div key={pairIndex} className="scorecard-pair">
          {pair.map((match) => (
            <div key={match.id} className="scorecard-single">
              {/* Header with Club Logo */}
              <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '5px' }}>
                  <img src={CLUB_LOGO} alt="Club Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                  <div>
                    <h1 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', fontFamily: 'serif' }}>
                      Centurion Lawn Bowls Club
                    </h1>
                    <p style={{ fontSize: '10px', margin: '0', color: '#666' }}>Centurion Rolbalklub</p>
                  </div>
                </div>
                <p style={{ fontSize: '13px', margin: '0', fontWeight: '600' }}>
                  {tournamentName} - Round {round.round_number}
                </p>
                <p style={{ fontSize: '10px', margin: '2px 0 0 0', color: '#666' }}>
                  {isStandard ? 'Standard Scoring' : 'Skins Scoring'}
                </p>
              </div>

              {/* Match Details */}
              <div style={{ marginBottom: '10px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span><strong>Green:</strong> {match.green}</span>
                  <span><strong>Rink:</strong> {match.rink}</span>
                </div>
              </div>

              {/* Teams */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ border: '2px solid #000', padding: '6px', marginBottom: '5px', backgroundColor: '#f0f0f0' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Team 1: {match.team1_name}</p>
                </div>
                <div style={{ border: '2px solid #000', padding: '6px', backgroundColor: '#f0f0f0' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0 }}>Team 2: {match.team2_name}</p>
                </div>
              </div>

              {/* Score Table - Different for Skins vs Standard */}
              <div style={{ marginBottom: '10px', flex: 1 }}>
                {isStandard ? (
                  /* Standard Scoring - Simple final score table */
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e0e0e0' }}>
                        <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Team</th>
                        <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold', width: '100px' }}>Final Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '15px', fontWeight: 'bold' }}>{match.team1_name}</td>
                        <td style={{ border: '1px solid #000', padding: '15px', backgroundColor: '#fff', fontSize: '16px', textAlign: 'center' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '15px', fontWeight: 'bold' }}>{match.team2_name}</td>
                        <td style={{ border: '1px solid #000', padding: '15px', backgroundColor: '#fff', fontSize: '16px', textAlign: 'center' }}></td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  /* Skins Scoring - 3 skins table */
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#e0e0e0' }}>
                        <th style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Skin</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>Ends</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>Team 1</th>
                        <th style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold', fontSize: '10px' }}>Team 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>1</td>
                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>1-5</td>
                        <td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}></td>
                        <td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>2</td>
                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>6-10</td>
                        <td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}></td>
                        <td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>3</td>
                        <td style={{ border: '1px solid #000', padding: '10px', textAlign: 'center' }}>11-15</td>
                        <td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}></td>
                        <td style={{ border: '1px solid #000', padding: '10px', backgroundColor: '#fff' }}></td>
                      </tr>
                      <tr style={{ backgroundColor: '#e0e0e0' }}>
                        <td colSpan="2" style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px' }}>
                          TOTAL
                        </td>
                        <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#fff' }}></td>
                        <td style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#fff' }}></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* QR Code Section */}
              <div style={{ textAlign: 'center', marginTop: 'auto', border: '2px dashed #000', padding: '10px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  Scan to Enter Scores
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  <QRCodeSVG value={qrUrl} size={100} />
                </div>
                <p style={{ fontSize: '9px', margin: 0, color: '#666' }}>
                  Both teams scan this code
                </p>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '8px', fontSize: '9px', textAlign: 'center', color: '#666' }}>
                <p style={{ margin: 0 }}>Umpire: _____________ Date: _______</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default PrintableScorecard;
