import React, { useState } from 'react';
import { Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, User, Shield } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SentinelMessage, useSentinelStore } from '@/store/sentinelStore';
import { CodeBlock } from './CodeBlock';

// DOMPurify config - allow only safe HTML elements for markdown rendering
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'code', 'a', 'span'] as string[],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'] as string[],
  ALLOW_DATA_ATTR: false,
};

interface ChatMessageProps {
  message: SentinelMessage;
  conversationId: string;
  onRegenerate?: () => void;
  isLast?: boolean;
}

// Simple markdown renderer with code block support
function renderContent(content: string) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap">
          {renderInlineMarkdown(content.slice(lastIndex, match.index))}
        </span>
      );
    }
    // Add code block
    parts.push(
      <CodeBlock key={key++} language={match[1]} code={match[2].trim()} />
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap">
        {renderInlineMarkdown(content.slice(lastIndex))}
      </span>
    );
  }

  return parts;
}

function renderInlineMarkdown(text: string): React.ReactNode {
  let html = text;
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-sm font-mono">$1</code>');
  // Links - validate URL to block javascript: and data: protocols
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
    if (/^(javascript|data|vbscript):/i.test(url)) {
      return linkText; // Strip malicious links, return text only
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${linkText}</a>`;
  });
  
  // Sanitize HTML to prevent XSS
  const sanitizedHtml = DOMPurify.sanitize(html, DOMPURIFY_CONFIG);
  
  return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

export function ChatMessage({ message, conversationId, onRegenerate, isLast }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { setReaction } = useSentinelStore();

  const isUser = message.role === 'user';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = (reaction: 'thumbsUp' | 'thumbsDown') => {
    const currentValue = message.reactions?.[reaction] ?? false;
    setReaction(conversationId, message.id, reaction, !currentValue);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={cn(
        "group flex gap-3 py-4 px-4 transition-colors",
        isUser ? "bg-transparent" : "bg-muted/30"
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-primary/20 text-primary" : "bg-cyan-500/20 text-cyan-500"
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {isUser ? 'You' : 'MMC Sentinel'}
          </span>
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div className="text-sm leading-relaxed">
          {renderContent(message.content)}
        </div>

        {/* Actions */}
        {!isUser && (
          <div className={cn(
            "flex items-center gap-1 mt-2 transition-opacity",
            showActions ? "opacity-100" : "opacity-0"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              title="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", message.reactions?.thumbsUp && "text-green-500")}
              onClick={() => handleReaction('thumbsUp')}
              title="Good response"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", message.reactions?.thumbsDown && "text-red-500")}
              onClick={() => handleReaction('thumbsDown')}
              title="Bad response"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
            {isLast && onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRegenerate}
                title="Regenerate"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
