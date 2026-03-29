/**
 * Session Timeout Handler
 * Warns users before session expires and handles auto-logout
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionTimeoutHandlerProps {
  // Time before showing warning (ms)
  warningTime?: number;
  // Time before auto-logout after warning (ms)
  logoutTime?: number;
}

const DEFAULT_WARNING_TIME = 25 * 60 * 1000; // 25 minutes
const DEFAULT_LOGOUT_TIME = 5 * 60 * 1000; // 5 minutes after warning

export function SessionTimeoutHandler({
  warningTime = DEFAULT_WARNING_TIME,
  logoutTime = DEFAULT_LOGOUT_TIME,
}: SessionTimeoutHandlerProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const logoutTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef(Date.now());

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    
    // Clear existing timers
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (!user) return;

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(Math.floor(logoutTime / 1000));
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set logout timer
      logoutTimeoutRef.current = setTimeout(() => {
        handleLogout();
      }, logoutTime);
    }, warningTime);
  }, [user, warningTime, logoutTime]);

  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    await signOut();
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
    });
  }, [signOut, toast]);

  const handleStayLoggedIn = useCallback(() => {
    resetTimers();
    toast({
      title: 'Session Extended',
      description: 'Your session has been extended.',
    });
  }, [resetTimers, toast]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      // Only reset if not showing warning (to prevent accidental dismissal)
      if (!showWarning) {
        resetTimers();
      }
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer setup
    resetTimers();

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, resetTimers, showWarning]);

  // Don't render anything if no user
  if (!user) return null;

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in{' '}
            <span className="font-mono font-bold text-foreground">
              {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </span>
            {' '}due to inactivity. Would you like to stay logged in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Log Out Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleStayLoggedIn}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
