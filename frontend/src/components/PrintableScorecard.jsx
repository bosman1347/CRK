import { QRCodeSVG } from 'qrcode.react';

const PrintableScorecard = ({ round, matches, qrUrl, tournamentName }) => {
  // Group matches into pairs for 2-per-page layout
  const matchPairs = [];
  for (let i = 0; i < matches.length; i += 2) {
    matchPairs.push(matches.slice(i, i + 2));
  }

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
          {pair.map((match, index) => (
            <div key={match.id} className="scorecard-single">
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 3px 0', fontFamily: 'serif' }}>
                  {tournamentName}
                </h1>
                <p style={{ fontSize: '13px', margin: '0', fontWeight: '600' }}>
                  Round {round.round_number} Scorecard
                </p>
              </div>

          {/* Match Details */}
          <div style={{ marginBottom: '15px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span><strong>Green:</strong> {match.green}</span>
              <span><strong>Rink:</strong> {match.rink}</span>
            </div>
          </div>

          {/* Teams */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ border: '2px solid #000', padding: '10px', marginBottom: '10px', backgroundColor: '#f0f0f0' }}>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Team 1: {match.team1_name}</p>
            </div>
            <div style={{ border: '2px solid #000', padding: '10px', backgroundColor: '#f0f0f0' }}>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>Team 2: {match.team2_name}</p>
            </div>
          </div>

          {/* Score Table */}
          <div style={{ marginBottom: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
              <thead>
                <tr style={{ backgroundColor: '#e0e0e0' }}>
                  <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Skin</th>
                  <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Ends</th>
                  <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{match.team1_name}</th>
                  <th style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>{match.team2_name}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>1</td>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>1-5</td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>2</td>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>6-10</td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>3</td>
                  <td style={{ border: '1px solid #000', padding: '12px', textAlign: 'center' }}>11-15</td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                </tr>
                <tr style={{ backgroundColor: '#e0e0e0' }}>
                  <td colSpan="2" style={{ border: '1px solid #000', padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                    TOTAL SHOTS
                  </td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                  <td style={{ border: '1px solid #000', padding: '12px', backgroundColor: '#fff' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* QR Code Section */}
          <div style={{ textAlign: 'center', marginTop: 'auto', border: '2px dashed #000', padding: '15px' }}>
            <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
              Scan to Enter Scores
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <QRCodeSVG value={qrUrl} size={120} />
            </div>
            <p style={{ fontSize: '11px', margin: 0, color: '#666' }}>
              Both teams use this QR code to enter scores after each skin
            </p>
          </div>

          {/* Footer */}
          <div style={{ marginTop: '10px', fontSize: '10px', textAlign: 'center', color: '#666' }}>
            <p style={{ margin: 0 }}>Umpire Signature: ___________________ Date: ___________</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PrintableScorecard;
