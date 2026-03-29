import { useEffect, useState, useMemo } from 'react';
import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useUIPreferencesStore, getEffectiveShortcutOS } from '@/store/uiPreferencesStore';

const getShortcuts = (isMac: boolean) => {
  const mod = isMac ? '⌘' : 'Ctrl';
  
  return [
    { category: 'Navigation', items: [
      { keys: [mod, 'K'], description: 'Open Command Palette' },
      { keys: [mod, 'B'], description: 'Toggle Sidebar' },
      { keys: ['?'], description: 'Show Keyboard Shortcuts' },
      { keys: ['Esc'], description: 'Close Modal/Dialog' },
    ]},
    { category: 'Workflow', items: [
      { keys: [mod, 'Enter'], description: 'Run Backtest' },
      { keys: [mod, 'S'], description: 'Save Current Work' },
      { keys: [mod, 'E'], description: 'Export Results' },
    ]},
    { category: 'Data', items: [
      { keys: [mod, 'I'], description: 'Import Data' },
      { keys: [mod, 'O'], description: 'Open File' },
      { keys: [mod, 'Shift', 'E'], description: 'Export All' },
    ]},
    { category: 'Views', items: [
      { keys: ['1-9'], description: 'Switch Tabs' },
      { keys: ['Tab'], description: 'Next Field' },
      { keys: ['Shift', 'Tab'], description: 'Previous Field' },
    ]},
  ];
};

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const { shortcutOS } = useUIPreferencesStore();
  const effectiveOS = getEffectiveShortcutOS(shortcutOS);
  const isMac = effectiveOS === 'mac';
  const shortcuts = useMemo(() => getShortcuts(isMac), [isMac]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              {isMac ? 'Mac' : 'Windows'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 mt-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 font-mono text-xs font-medium bg-background border border-border rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Press <kbd className="inline-flex items-center justify-center px-1.5 h-5 font-mono text-xs bg-background border border-border rounded mx-1">?</kbd> to open this dialog anytime
        </p>
      </DialogContent>
    </Dialog>
  );
}