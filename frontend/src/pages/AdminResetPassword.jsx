import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, KeyRound, Shield } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminResetPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    
    if (!email || !newPassword || !adminCode) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/admin-reset-password`, {
        email,
        new_password: newPassword,
        admin_code: adminCode
      });
      toast.success(response.data.message);
      setEmail('');
      setNewPassword('');
      setAdminCode('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-emerald-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-heading">Admin Password Reset</CardTitle>
          <CardDescription>
            Reset a user's password using the admin code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User's Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminCode">Admin Code</Label>
              <Input
                id="adminCode"
                type="password"
                placeholder="Enter admin code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Contact the club administrator for the admin code
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-amber-500 hover:bg-amber-600"
              disabled={loading}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminResetPassword;
