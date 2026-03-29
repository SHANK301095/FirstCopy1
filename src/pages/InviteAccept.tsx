import { useEffect, useState, forwardRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { CheckCircle, XCircle, Users, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secureLogger';

interface InvitePreview {
  workspace_name: string;
  role: string;
  email: string;
}

const InviteAccept = forwardRef<HTMLDivElement>(function InviteAccept(_, ref) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // We don't fetch invite details anymore - just show a generic accept screen
    // The server-side RPC will validate everything
    setLoading(false);
  }, [token]);

  const handleAcceptInvite = async () => {
    if (!token || !user) return;

    setAccepting(true);
    try {
      // Use secure RPC function - never query workspace_invites directly
      const { data, error: rpcError } = await supabase.rpc('redeem_workspace_invite', {
        p_token: token
      });

      if (rpcError) {
        secureLogger.error('workspace', 'Invite redemption RPC failed', { code: rpcError.code });
        throw new Error(rpcError.message);
      }

      const result = data as { ok: boolean; error?: string; workspace_id?: string };
      
      if (!result.ok) {
        secureLogger.warn('workspace', 'Invite redemption rejected', { reason: result.error });
        toast.error(result.error || 'Failed to accept invitation');
        return;
      }

      secureLogger.info('workspace', 'Invite accepted successfully');
      toast.success('Welcome to the workspace!');
      navigate('/workspace-settings');
    } catch (err) {
      secureLogger.error('workspace', 'Error accepting invite', { error: String(err) });
      toast.error('Failed to accept invitation. It may be invalid, expired, or already used.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/landing">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Workspace Invitation</CardTitle>
            <CardDescription>
              You've been invited to join a workspace. Please log in or create an account to accept.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Make sure to use the email address the invitation was sent to.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to={`/login?redirect=/invite/${token}`}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Log In
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/signup?redirect=/invite/${token}`}>
                  Create Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join Workspace</CardTitle>
          <CardDescription>
            Click accept to join the workspace. The invitation will be validated securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="text-muted-foreground">
              Accepting this invitation will give you access to all shared projects and resources in the workspace.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={handleAcceptInvite} disabled={accepting}>
              {accepting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Decline</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default InviteAccept;
