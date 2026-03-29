import { useRef, useEffect, useState, useCallback, forwardRef } from 'react';
import { FileText, Download, ZoomIn, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Message, Attachment } from '@/store/supportBotStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SupportMessagesProps {
  messages: Message[];
  isTyping: boolean;
}

// Format timestamp
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

// Simple markdown renderer
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, lineIndex) => {
    let processed: React.ReactNode = line;
    
    // Bold: **text**
    if (line.includes('**')) {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      processed = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-foreground tracking-tight">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    }
    
    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      const content = line.trim().slice(2);
      processed = (
        <div key={lineIndex} className="flex gap-2.5 ml-0.5 py-0.5">
          <span className="text-primary text-xs mt-1">●</span>
          <span className="text-[13px] leading-relaxed">{content}</span>
        </div>
      );
    }
    // Numbered lists
    else if (/^\d+[\.\)]\s/.test(line.trim())) {
      const match = line.trim().match(/^(\d+[\.\)])\s(.*)$/);
      if (match) {
        processed = (
          <div key={lineIndex} className="flex gap-2.5 ml-0.5 py-0.5">
            <span className="text-primary font-semibold text-xs min-w-[1rem]">{match[1]}</span>
            <span className="text-[13px] leading-relaxed">{match[2]}</span>
          </div>
        );
      }
    }
    // Links
    else if (line.includes('[') && line.includes('](')) {
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      
      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }
        parts.push(
          <a
            key={match.index}
            href={match[2]}
            className="text-primary underline hover:no-underline"
            target={match[2].startsWith('http') ? '_blank' : undefined}
            rel={match[2].startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {match[1]}
          </a>
        );
        lastIndex = match.index + match[0].length;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }
      
      processed = parts.length > 0 ? parts : processed;
    }
    
    if (typeof processed === 'string') {
      elements.push(<span key={lineIndex}>{processed}</span>);
    } else {
      elements.push(processed);
    }
    
    if (lineIndex < lines.length - 1) {
      elements.push(<br key={`br-${lineIndex}`} />);
    }
  });
  
  return <>{elements}</>;
};

// Attachment preview component
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (attachment.type === 'image') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative cursor-pointer group">
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-w-[150px] max-h-[100px] rounded-lg object-cover border border-border/50 transition-transform hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-3xl p-2 bg-background/95 backdrop-blur">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
          />
          <div className="flex items-center justify-between mt-2 px-2">
            <span className="text-sm text-muted-foreground truncate">{attachment.name}</span>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-background/50 border border-border/50 rounded-lg p-2">
      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium truncate max-w-[100px]">{attachment.name}</span>
        <span className="text-[10px] text-muted-foreground">{formatFileSize(attachment.size)}</span>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownload}>
        <Download className="h-3 w-3" />
      </Button>
    </div>
  );
}

export const SupportMessages = forwardRef<HTMLDivElement, SupportMessagesProps>(function SupportMessages({ messages, isTyping }, _ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [longPressIndex, setLongPressIndex] = useState<number | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Long press handlers for mobile copy
  const handleTouchStart = useCallback((index: number, content: string) => {
    longPressTimer.current = setTimeout(async () => {
      setLongPressIndex(index);
      try {
        await navigator.clipboard.writeText(content);
        toast.success('Copied!');
      } catch {
        toast.error('Copy failed');
      }
      setTimeout(() => setLongPressIndex(null), 500);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Check if message has been "read" (assistant replied after)
  const isRead = (index: number, role: string) => {
    if (role !== 'user') return false;
    // User message is read if there's an assistant message after it
    return messages.slice(index + 1).some(m => m.role === 'assistant');
  };

  return (
    <ScrollArea className="flex-1 min-h-0 scrollbar-glow" ref={scrollRef}>
      <div className="px-3 py-2 space-y-1.5">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={cn(
              "group animate-[fade-in_0.2s_ease-out]",
              message.role === "user" ? "flex justify-end" : "flex justify-start"
            )}
          >
            <div
              onTouchStart={() => message.content && handleTouchStart(index, message.content)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className={cn(
                "max-w-[85%] px-3 py-1.5 text-[13px] leading-relaxed font-body select-none",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                  : "bg-muted/60 rounded-2xl rounded-bl-sm",
                longPressIndex === index && "ring-2 ring-primary/50 scale-[0.98]",
                "transition-transform duration-150"
              )}
            >
              {message.content ? (
                message.role === "assistant" ? renderMarkdown(message.content) : <span>{message.content}</span>
              ) : (
                <div className="flex items-center gap-1.5 py-0.5">
                  <div className="h-2 w-14 bg-foreground/10 rounded-full animate-pulse" />
                  <div className="h-2 w-8 bg-foreground/10 rounded-full animate-pulse" style={{ animationDelay: '75ms' }} />
                </div>
              )}
              
              {/* Render attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className={cn("mt-1.5 flex flex-wrap gap-1.5", !message.content && "mt-0")}>
                  {message.attachments.map((attachment) => (
                    <AttachmentPreview key={attachment.id} attachment={attachment} />
                  ))}
                </div>
              )}
              
              {/* Timestamp + Read receipts */}
              <span className={cn(
                "text-[9px] ml-2 inline-flex items-center gap-0.5",
                message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground/60"
              )}>
                {formatTime(message.timestamp)}
                {/* Read receipts for user messages */}
                {message.role === "user" && (
                  isRead(index, message.role) ? (
                    <CheckCheck className="h-3 w-3 text-sky-400" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )
                )}
              </span>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="px-3 py-1.5 rounded-2xl rounded-bl-sm bg-muted/60">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" />
                  <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '80ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-[bounce_0.6s_ease-in-out_infinite]" style={{ animationDelay: '160ms' }} />
                </div>
                <span className="text-muted-foreground text-[10px]">Typing...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
