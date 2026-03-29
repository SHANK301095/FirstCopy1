import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check system preference first, then localStorage
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const systemPrefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = saved || systemPrefers;
    
    setTheme(initialTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(initialTheme);
  }, []);

  const toggleTheme = () => {
    setIsAnimating(true);
    
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Smooth transition
    document.documentElement.style.setProperty('--theme-transition', '0.3s');
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
    
    setTimeout(() => {
      setIsAnimating(false);
      document.documentElement.style.removeProperty('--theme-transition');
    }, 300);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "h-8 w-8 relative overflow-hidden group",
        "hover:bg-muted/60",
        "transition-all duration-200",
        className
      )}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Sun icon */}
        <Sun 
          className={cn(
            "h-4 w-4 absolute transition-all duration-300 ease-out",
            theme === 'dark' 
              ? "rotate-0 scale-100 opacity-100 text-amber-400" 
              : "-rotate-90 scale-0 opacity-0 text-amber-500"
          )} 
        />
        {/* Moon icon */}
        <Moon 
          className={cn(
            "h-4 w-4 absolute transition-all duration-300 ease-out",
            theme === 'light' 
              ? "rotate-0 scale-100 opacity-100 text-blue-400" 
              : "rotate-90 scale-0 opacity-0 text-blue-400"
          )} 
        />
      </div>
    </Button>
  );
}
