import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, TrendingUp } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { workspaceApi } from '@/api/client';
import { useAuthStore } from '@/stores';

type InviteStatus = 'loading' | 'success' | 'error' | 'login-required';

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, setWorkspace } = useAuthStore();
  
  const [status, setStatus] = useState<InviteStatus>('loading');
  const [error, setError] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setStatus('login-required');
      return;
    }

    if (!token) {
      setStatus('error');
      setError('Invalid invitation link');
      return;
    }

    acceptInvitation();
  }, [token, isAuthenticated, authLoading]);

  const acceptInvitation = async () => {
    try {
      setStatus('loading');
      const response = await workspaceApi.acceptInvitation(token!);
      
      if (response.data) {
        setWorkspaceName(response.data.workspace.name);
        setWorkspace(response.data.workspace, response.data.workspaceMember);
        setStatus('success');
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    } catch (error: unknown) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Failed to accept invitation';
      setError(message);
    }
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Processing Invitation</h2>
            <p className="text-muted-foreground">
              Please wait while we verify your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'login-required') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Join KinkyForex</CardTitle>
            <CardDescription>
              You've been invited to join a workspace. Please sign in or create an account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full gradient-primary">
              <Link to={`/login?redirect=/invite/${token}`}>
                Sign In
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={`/register?redirect=/invite/${token}`}>
                Create Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Welcome Aboard!</h2>
            <p className="text-muted-foreground mb-4">
              You've successfully joined <span className="font-medium text-foreground">{workspaceName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Invitation Failed</h2>
          <p className="text-muted-foreground mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <Button asChild className="gradient-primary">
            <Link to="/">
              Go to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
