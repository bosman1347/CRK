import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Lock } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/change-password`,
        { current_password: currentPassword, new_password: newPassword },
        { headers: getAuthHeader() }
      );
      
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="gradient-hero text-white py-12">
        <div className="container mx-auto px-6">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-white hover:bg-white/10 mb-4"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl md:text-5xl font-heading" data-testid="settings-title">Account Settings</h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-2xl font-heading flex items-center gap-3">
                <Lock className="w-6 h-6 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4" data-testid="change-password-form">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    data-testid="current-password-input"
                    className="border-stone-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="new-password-input"
                    className="border-stone-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    data-testid="confirm-password-input"
                    className="border-stone-300"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90"
                  data-testid="submit-button"
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="floating-card border-stone-200">
            <CardHeader>
              <CardTitle className="text-xl font-heading">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium">{user?.is_umpire ? 'Umpire' : 'Organizer'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
