import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Archive, Download, Trash2, Trophy, Crown, Calendar } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const CLUB_LOGO = "https://customer-assets.emergentagent.com/job_matchtrack-6/artifacts/e3x9cy2y_cropped-Cent-Rolbal-logo.png";

const Archives = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [archiveToDelete, setArchiveToDelete] = useState(null);
  
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      const response = await axios.get(`${API}/archives`, { headers: getAuthHeader() });
      setArchives(response.data);
    } catch (error) {
      toast.error('Failed to load archives');
    } finally {
      setLoading(false);
    }
  };

  const downloadArchive = async (archive) => {
    try {
      const response = await axios.get(`${API}/archives/${archive.id}/download`, { headers: getAuthHeader() });
      
      // Convert to CSV string
      const csvContent = response.data.csv_data.map(row => row.join(',')).join('\n');
      
      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = response.data.filename;
      link.click();
      
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download archive');
    }
  };

  const confirmDelete = (archive) => {
    setArchiveToDelete(archive);
    setShowDeleteDialog(true);
  };

  const deleteArchive = async () => {
    if (!archiveToDelete) return;
    
    try {
      await axios.delete(`${API}/archives/${archiveToDelete.id}`, { headers: getAuthHeader() });
      toast.success('Archive deleted');
      setShowDeleteDialog(false);
      setArchiveToDelete(null);
      fetchArchives();
    } catch (error) {
      toast.error('Failed to delete archive');
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'championship') return <Crown className="w-8 h-8 text-amber-500" />;
    return <Trophy className="w-8 h-8 text-primary" />;
  };

  const getTypeBadge = (archive) => {
    if (archive.type === 'championship') {
      return (
        <div className="flex gap-1">
          <Badge className="bg-amber-100 text-amber-700 capitalize">{archive.competition_type}</Badge>
          <Badge className="bg-amber-100 text-amber-700 capitalize">{archive.gender_category}</Badge>
        </div>
      );
    }
    return <Badge className="bg-primary/10 text-primary capitalize">{archive.type} Scoring</Badge>;
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
          <div className="flex items-center gap-4">
            <img src={CLUB_LOGO} alt="Centurion Bowls Club" className="w-16 h-16 object-contain bg-white/10 rounded-lg p-1" />
            <div>
              <h1 className="text-3xl md:text-4xl font-heading">Tournament Archives</h1>
              <p className="text-emerald-100 mt-1">Historical results from completed tournaments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading archives...</p>
        ) : archives.length === 0 ? (
          <Card className="floating-card border-stone-200">
            <CardContent className="py-12 text-center">
              <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-heading mb-2">No Archives Yet</h3>
              <p className="text-muted-foreground mb-4">
                When you archive completed tournaments, their results will appear here.
              </p>
              <Button onClick={() => navigate('/')} variant="outline">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archives.map((archive) => (
              <Card key={archive.id} className="floating-card border-stone-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    {getTypeIcon(archive.type)}
                    {getTypeBadge(archive)}
                  </div>
                  <CardTitle className="text-lg font-heading">{archive.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Archived: {new Date(archive.archived_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Winner</span>
                        <span className="font-bold text-amber-700">{archive.winner}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-muted-foreground">Runner-up</span>
                        <span className="font-medium">{archive.runner_up}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-muted-foreground">Final</span>
                        <span className="font-mono">{archive.final_score}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedArchive(archive)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        View Details
                      </Button>
                      <Button
                        onClick={() => downloadArchive(archive)}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => confirmDelete(archive)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Auto-deletes: {new Date(archive.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Archive Details Dialog */}
      {selectedArchive && (
        <Dialog open={!!selectedArchive} onOpenChange={() => setSelectedArchive(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTypeIcon(selectedArchive.type)}
                {selectedArchive.name}
              </DialogTitle>
              <DialogDescription>
                Archived on {new Date(selectedArchive.archived_at).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold mb-2">Final Results</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Winner</p>
                    <p className="font-bold text-lg text-amber-700">{selectedArchive.winner}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Runner-up</p>
                    <p className="font-bold text-lg">{selectedArchive.runner_up}</p>
                  </div>
                </div>
                <p className="mt-2 text-center font-mono text-xl">{selectedArchive.final_score}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Final Standings</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Pos</th>
                        {selectedArchive.type === 'championship' && <th className="text-left py-2 px-2">Section</th>}
                        <th className="text-left py-2 px-2">Name</th>
                        <th className="text-center py-2 px-2">Pts</th>
                        {selectedArchive.type === 'championship' && (
                          <>
                            <th className="text-center py-2 px-2">W</th>
                            <th className="text-center py-2 px-2">D</th>
                            <th className="text-center py-2 px-2">L</th>
                          </>
                        )}
                        <th className="text-center py-2 px-2">SF</th>
                        <th className="text-center py-2 px-2">SA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedArchive.final_standings.map((standing, idx) => (
                        <tr key={idx} className="border-b border-stone-100">
                          <td className="py-2 px-2">{standing.position}</td>
                          {selectedArchive.type === 'championship' && <td className="py-2 px-2">{standing.section}</td>}
                          <td className="py-2 px-2 font-medium">{standing.name}</td>
                          <td className="text-center py-2 px-2 font-mono">{standing.points}</td>
                          {selectedArchive.type === 'championship' && (
                            <>
                              <td className="text-center py-2 px-2 font-mono">{standing.wins}</td>
                              <td className="text-center py-2 px-2 font-mono">{standing.draws}</td>
                              <td className="text-center py-2 px-2 font-mono">{standing.losses}</td>
                            </>
                          )}
                          <td className="text-center py-2 px-2 font-mono">{standing.shots_for}</td>
                          <td className="text-center py-2 px-2 font-mono">{standing.shots_against}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Participants ({selectedArchive.participants.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedArchive.participants.map((name, idx) => (
                    <Badge key={idx} variant="outline">{name}</Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => downloadArchive(selectedArchive)} className="flex-1">
                <Download className="w-4 h-4 mr-2" /> Download CSV
              </Button>
              <Button onClick={() => setSelectedArchive(null)} variant="outline">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Archive?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete the archive for "{archiveToDelete?.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => setShowDeleteDialog(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={deleteArchive} variant="destructive" className="flex-1">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Archives;
