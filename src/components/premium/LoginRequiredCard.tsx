import { LogIn, Sparkles, ArrowRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface LoginRequiredCardProps {
  feature?: string;
}

export function LoginRequiredCard({ feature = 'AI Strategy Generator' }: LoginRequiredCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-dashed border-2 border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <CardContent className="flex flex-col items-center justify-center py-14 text-center relative">
          <motion.div 
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5 border border-primary/20 shadow-lg shadow-primary/10"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <User className="w-10 h-10 text-primary" />
          </motion.div>
          
          <h3 className="text-xl font-bold mb-2">Login Required</h3>
          <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
            Sign in to use the <span className="text-foreground font-medium">{feature}</span>. 
            <br />
            <span className="text-primary">Free users get 3 generations per day!</span>
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/login')} 
              className="gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/25 font-medium px-6"
            >
              <LogIn className="w-4 h-4" />
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/signup')}
              className="border-primary/30 hover:border-primary/50 hover:bg-primary/5"
            >
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              Sign Up
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
