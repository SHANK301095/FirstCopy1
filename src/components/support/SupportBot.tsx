import { useEffect, useCallback, useState, useRef, forwardRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Minus, Bot, WifiOff, Trash2, GripVertical, RotateCcw, EyeOff, Zap, Pin, ChevronDown, ChevronUp, Sparkles, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSupportBotStore, Message, Attachment } from '@/store/supportBotStore';
import { QuickActions } from './QuickActions';
import { SupportMessages } from './SupportMessages';
import { SupportInput } from './SupportInput';
import { MODE_PROMPTS } from './CopilotModeSelector';
import { CopilotContextPanel } from './CopilotContextPanel';
import { CopilotQuickChips } from './CopilotQuickChips';
import { detectIntent, INTENT_RESPONSES, CONTACT_URL } from '@/lib/supportBot/systemPrompt';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { secureLogger } from '@/lib/secureLogger';
import { useSoundEffectsStore } from '@/store/soundEffectsStore';
import {
  Popover,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/app-assistant`;

const SupportBotComponent = forwardRef<HTMLDivElement, object>(function SupportBot(_, ref) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [pinnedActionsExpanded, setPinnedActionsExpanded] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  const { playChatSend, playChatReceive, playChatOpen } = useSoundEffectsStore();
  
  const {
    isOpen,
    isMinimized,
    isHidden,
    isActionsPinned,
    copilotMode,
    messages,
    isTyping,
    position,
    currentRoute,
    open,
    close,
    minimize,
    toggleHidden,
    toggleActionsPinned,
    setCopilotMode,
    setCurrentRoute,
    addMessage,
    updateLastMessage,
    setTyping,
    setFeedback,
    clearMessages,
    setPosition,
    resetPosition,
  } = useSupportBotStore();

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update current route
  useEffect(() => {
    setCurrentRoute(location.pathname);
  }, [location.pathname, setCurrentRoute]);

  // Welcome animation & sound when chat opens
  useEffect(() => {
    if (isOpen && !hasPlayedWelcome) {
      setShowWelcome(true);
      playChatOpen();
      setHasPlayedWelcome(true);
      
      // Hide welcome animation after 2.5s
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasPlayedWelcome, playChatOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const rect = dragRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      // On mobile Safari/Chrome, touchmove listeners are passive by default.
      // Prevent default to stop the page from scrolling while dragging.
      if (e instanceof TouchEvent) {
        e.preventDefault();
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const newX = clientX - dragOffset.current.x;
      const newY = clientY - dragOffset.current.y;

      // Allow dragging to full screen edges (keep at least 50px visible)
      const panelWidth = dragRef.current?.offsetWidth || 420;
      const panelHeight = dragRef.current?.offsetHeight || 600;
      const minVisible = 50;

      const minX = -panelWidth + minVisible;
      const maxX = window.innerWidth - minVisible;
      const minY = 0; // Don't let it go above screen
      const maxY = window.innerHeight - minVisible;

      setPosition({
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    const touchMoveOpts: AddEventListenerOptions = { passive: false };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, touchMoveOpts);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove, touchMoveOpts as any);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, setPosition]);

  const sendMessage = useCallback(async (messageText: string, attachments?: Attachment[]) => {
    if ((!messageText.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    // Play send sound
    playChatSend();

    const userMessage: Message = {
      role: 'user',
      content: messageText.trim(),
      timestamp: Date.now(),
      feedback: null,
      attachments,
    };
    addMessage(userMessage);
    setIsLoading(true);
    setTyping(true);

    // Offline fallback - use intent-based responses
    if (!isOnline) {
      const intent = detectIntent(messageText);
      const response = INTENT_RESPONSES[intent] || INTENT_RESPONSES.default;
      
      setTimeout(() => {
        playChatReceive();
        addMessage({
          role: 'assistant',
          content: `📴 **Offline Mode**\n\n${response}`,
          timestamp: Date.now(),
          feedback: null,
        });
        setTyping(false);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          context: {
            currentRoute: location.pathname,
            currentPage: getPageName(location.pathname),
            copilotMode: copilotMode,
            modePrompt: MODE_PROMPTS[copilotMode],
          },
        }),
      });

      if (!response.ok) {
        // Fallback to intent-based response on API error
        const intent = detectIntent(messageText);
        const fallbackResponse = INTENT_RESPONSES[intent] || INTENT_RESPONSES.default;
        
        playChatReceive();
        addMessage({
          role: 'assistant',
          content: fallbackResponse,
          timestamp: Date.now(),
          feedback: null,
        });
        setTyping(false);
        setIsLoading(false);
        return;
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantContent = '';

      // Add empty assistant message & play receive sound
      playChatReceive();
      addMessage({ role: 'assistant', content: '', timestamp: Date.now(), feedback: null });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              updateLastMessage(assistantContent);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      secureLogger.error('network', 'Chat API error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        route: location.pathname,
      });
      // Fallback to intent-based response
      const intent = detectIntent(messageText);
      const fallbackResponse = INTENT_RESPONSES[intent] || INTENT_RESPONSES.default;
      
      playChatReceive();
      addMessage({
        role: 'assistant',
        content: fallbackResponse,
        timestamp: Date.now(),
        feedback: null,
      });
    } finally {
      setTyping(false);
      setIsLoading(false);
    }
  }, [messages, isOnline, isLoading, location.pathname, addMessage, updateLastMessage, setTyping, playChatSend, playChatReceive]);

  const handleClear = () => {
    clearMessages();
    toast.success('Chat cleared!');
  };

  const handleFeedback = (index: number, feedback: 'up' | 'down' | null) => {
    setFeedback(index, feedback);
    if (feedback === 'up') {
      toast.success('Thanks for the feedback! 👍');
    } else if (feedback === 'down') {
      toast.info('We\'ll try to improve! 🙏');
    }
  };

  const handleResetPosition = () => {
    resetPosition();
    toast.success('Position reset!');
  };

  // Calculate panel style based on position
  const getPanelStyle = () => {
    if (position) {
      return {
        left: position.x,
        top: position.y,
        right: 'auto',
        bottom: 'auto',
      };
    }
    return {};
  };

  // If hidden, don't render anything
  if (isHidden) {
    return null;
  }

  return (
    <>
      {/* Floating Button - Glassmorphism AI */}
      <button
        onClick={open}
        className={cn(
          'fixed right-4 z-50 group',
          'bottom-20 sm:bottom-5', // Primary FAB - same row as other tools
          'h-14 w-14 rounded-2xl',
          'bg-gradient-to-br from-primary via-primary/90 to-ai-purple',
          'text-primary-foreground',
          'flex items-center justify-center',
          'transition-all duration-500 ease-out',
          'hover:scale-105 hover:rotate-3 hover:shadow-2xl',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
          'shadow-lg shadow-primary/25',
          isOpen && 'scale-0 opacity-0 pointer-events-none'
        )}
        aria-label="Open support chat"
      >
        <MessageCircle className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
        {/* Subtle pulse ring */}
        <span className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-[ping_2s_ease-in-out_infinite] opacity-40" />
        {/* Glow effect */}
        <span className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/20 to-ai-purple/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </button>

      {/* Full Chat Panel - Modern Glass Design */}
      <div
        ref={dragRef}
        style={getPanelStyle()}
        className={cn(
          'fixed z-50',
          'w-[400px] sm:w-[440px] h-[600px] sm:h-[680px]',
          'bg-background/95 backdrop-blur-2xl',
          'border border-border/50 rounded-2xl',
          'shadow-2xl shadow-black/20',
          'flex flex-col overflow-hidden',
          'transition-all origin-bottom-right',
          isDragging ? 'duration-0 cursor-grabbing select-none' : 'duration-300 ease-out',
          !position && 'bottom-5 right-5',
          'max-sm:w-[calc(100vw-1.5rem)] max-sm:h-[70vh] max-sm:max-h-[550px] max-sm:bottom-20 max-sm:right-3 max-sm:left-auto max-sm:rounded-2xl',
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        )}
      >
        {/* Header - Clean Modern */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-muted/30 via-transparent to-muted/30 touch-none"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="flex items-center gap-3">
            <button 
              className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 hover:bg-muted/60 rounded-lg transition-colors"
              aria-label="Drag to reposition chat panel"
              type="button"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/70" />
            </button>
            {/* AI Avatar with status */}
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary to-ai-purple flex items-center justify-center shadow-lg shadow-primary/20">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background shadow-sm shadow-emerald-500/50" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-semibold text-sm tracking-wide text-foreground">MMC Copilot</span>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-body">
                {!isOnline ? (
                  <>
                    <WifiOff className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-500 font-medium">Offline Mode</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                    <span className="text-emerald-500/90">Online</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>AI Powered</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {position && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetPosition();
                }}
                aria-label="Reset panel position"
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              aria-label="Clear chat history"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                minimize();
              }}
              aria-label="Minimize chat"
            >
              <Minus className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleHidden();
                toast.info('SupportBot hidden. Go to Settings to show again.');
              }}
              aria-label="Hide support chat"
            >
              <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
            {/* Quick Actions Trigger - only show if not pinned */}
            {!isActionsPinned && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsActionsOpen(true);
                }}
                title="Quick Actions"
                aria-label="Open Quick Actions"
              >
                <Zap className="h-4 w-4 text-primary" />
              </Button>
            )}
            {/* Pin Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                isActionsPinned 
                  ? "text-primary bg-primary/15 hover:bg-primary/20" 
                  : "hover:bg-muted/60"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleActionsPinned();
                toast.success(isActionsPinned ? 'Quick Actions unpinned' : 'Quick Actions pinned');
              }}
              title={isActionsPinned ? "Unpin Quick Actions" : "Pin Quick Actions"}
              aria-label={isActionsPinned ? "Unpin Quick Actions" : "Pin Quick Actions"}
            >
              <Pin className="h-4 w-4" />
            </Button>
            {/* Context Panel Trigger */}
            <Sheet open={isContextOpen} onOpenChange={setIsContextOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                  title="Context Panel"
                  aria-label="Open Context Panel"
                >
                  <PanelRightOpen className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] p-0">
                <SheetHeader className="px-4 py-3 border-b">
                  <SheetTitle className="text-sm font-semibold">App Context</SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-4">
                  <CopilotContextPanel 
                    isOnline={isOnline} 
                    currentRoute={currentRoute || location.pathname}
                    className="border rounded-lg"
                  />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
                    <QuickActions 
                      onActionClick={(msg) => {
                        sendMessage(msg);
                        setIsContextOpen(false);
                      }}
                      compact
                    />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Route-Aware Quick Chips */}
        <CopilotQuickChips 
          onChipClick={sendMessage} 
          disabled={isLoading}
          currentRoute={location.pathname}
        />

        {/* Welcome Animation Overlay - auto-fades and becomes non-blocking */}
        {showWelcome && (
          <div 
            className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-background/95 via-background/90 to-primary/5 backdrop-blur-sm animate-fade-in pointer-events-none"
            onAnimationEnd={() => setShowWelcome(false)}
          >
            <div className="flex flex-col items-center gap-4 text-center px-6">
              {/* Animated Avatar */}
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-primary to-ai-purple flex items-center justify-center shadow-2xl shadow-primary/30 animate-[scale-in_0.4s_ease-out]">
                  <Bot className="h-10 w-10 text-primary-foreground" />
                </div>
                {/* Sparkle effects */}
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-2 h-5 w-5 text-ai-purple animate-pulse" style={{ animationDelay: '200ms' }} />
              </div>
              
              {/* Welcome Text */}
              <div className="space-y-2 animate-[fade-in_0.5s_ease-out_0.2s_both]">
                <h3 className="font-heading text-lg font-bold tracking-wide text-foreground">
                  Welcome to MMC Copilot!
                </h3>
                <p className="text-sm text-muted-foreground max-w-[240px]">
                  Your AI-powered helper for everything about MMC app.
                </p>
              </div>
              
              {/* Animated dots */}
              <div className="flex gap-1.5 mt-2 animate-[fade-in_0.5s_ease-out_0.4s_both]">
                <span className="h-2 w-2 rounded-full bg-primary animate-[bounce_0.6s_ease-in-out_infinite]" />
                <span className="h-2 w-2 rounded-full bg-primary/70 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '100ms' }} />
                <span className="h-2 w-2 rounded-full bg-primary/40 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <SupportMessages
          messages={messages}
          isTyping={isTyping}
        />

        {/* Input */}
        <SupportInput
          onSend={sendMessage}
          isLoading={isLoading}
          isOnline={isOnline}
        />
      </div>

      {/* Floating Pinned Quick Actions Overlay - Does NOT shrink chat */}
      {isActionsPinned && isOpen && !isMobile && (
        <div
          className={cn(
            'fixed z-50 w-[320px] bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-lg',
            'transition-all duration-200',
            position 
              ? 'bottom-auto right-auto'
              : 'bottom-5 right-[440px]'
          )}
          style={position ? {
            left: position.x - 340,
            top: position.y,
          } : undefined}
        >
          <Collapsible open={pinnedActionsExpanded} onOpenChange={setPinnedActionsExpanded}>
            <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors rounded-t-xl border-b border-border/50">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Quick Actions</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleActionsPinned();
                  }}
                  title="Unpin Quick Actions"
                >
                  <Pin className="h-3 w-3 text-primary" />
                </Button>
                {pinnedActionsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 max-h-[300px] overflow-y-auto">
                <QuickActions 
                  onActionClick={(msg) => {
                    sendMessage(msg);
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Mobile Pinned Quick Actions - Bottom Sheet style */}
      {isActionsPinned && isOpen && isMobile && (
        <Drawer open={pinnedActionsExpanded} onOpenChange={setPinnedActionsExpanded}>
          <DrawerContent className="max-h-[50vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Actions
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActionsPinned()}
                  className="text-xs"
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Unpin
                </Button>
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <QuickActions 
                onActionClick={(msg) => {
                  sendMessage(msg);
                  setPinnedActionsExpanded(false);
                }} 
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Quick Actions Drawer/Sheet - Only when not pinned */}
      {!isActionsPinned && (
        <>
          {isMobile ? (
            <Drawer open={isActionsOpen} onOpenChange={setIsActionsOpen}>
              <DrawerContent className="max-h-[70vh]">
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Quick Actions
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6">
                  <QuickActions 
                    onActionClick={(msg) => {
                      sendMessage(msg);
                      setIsActionsOpen(false);
                    }} 
                  />
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={isActionsOpen} onOpenChange={setIsActionsOpen}>
              <PopoverContent 
                side="left" 
                align="start" 
                className="w-[320px] p-4 max-h-[400px] overflow-y-auto"
                sideOffset={8}
              >
                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Quick Actions</span>
                </div>
                <QuickActions 
                  onActionClick={(msg) => {
                    sendMessage(msg);
                    setIsActionsOpen(false);
                  }} 
                />
              </PopoverContent>
            </Popover>
          )}
        </>
      )}
    </>
  );
});

// Helper to get page name from route
function getPageName(pathname: string): string {
  const routeMap: Record<string, string> = {
    '/': 'Home',
    '/dashboard': 'Dashboard',
    '/workflow': 'Backtest Workflow',
    '/data': 'Data Manager',
    '/strategies': 'Strategy Library',
    '/analytics': 'Analytics',
    '/advanced-analytics': 'Advanced Analytics',
    '/settings': 'Settings',
    '/backtests': 'Backtests',
    '/saved-results': 'Results',
    '/optimizer': 'Optimizer',
    '/advanced-optimizer': 'Advanced Optimizer',
    '/walk-forward': 'Walk-Forward Analysis',
    '/risk-dashboard': 'Risk Dashboard',
    '/position-sizing': 'Position Sizing',
    '/portfolio-builder': 'Portfolio Builder',
    '/calculators': 'Calculators',
    '/simulators': 'Simulators',
    '/scanner': 'Scanner',
    '/sentinel': 'Sentinel AI',
    '/trading-dashboard': 'Trading Dashboard',
    '/ai-copilot': 'AI Trade Copilot',
    '/trade-journal': 'Trade Journal',
    '/mt5': 'MT5 Hub',
    '/mt5-sync': 'MT5 Sync Setup',
    '/runners': 'Runner Dashboard',
    '/run-console': 'Run Console',
    '/ea-library': 'EA Library',
    '/prop-firm': 'Prop Firm Tracker',
    '/notebook': 'Trading Notebook',
    '/behavioral-diagnostics': 'Behavioral Diagnostics',
    '/live-tracker': 'Live Tracker',
    '/pre-trade-check': 'Pre-Trade Check',
    '/attribution': 'Performance Attribution',
    '/ai-playbook': 'AI Playbook',
    '/dev-tools': 'Developer Tools',
    '/logs': 'Logs',
    '/admin': 'Admin Panel',
    '/premium': 'Premium',
    '/strategy-marketplace': 'Marketplace',
    '/cloud-sync': 'Cloud Sync',
    '/achievements': 'Achievements',
    '/alerts': 'Alerts',
    '/tutorials': 'Tutorials',
    '/profile': 'Profile',
    '/app-guide': 'App Guide',
    '/faq': 'FAQ',
  };
  
  return routeMap[pathname] || pathname.slice(1).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Home';
}

export { SupportBotComponent as SupportBot };
export default SupportBotComponent;
