import React, { useRef, useEffect, useState } from 'react';
import { Shield, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSentinelStore } from '@/store/sentinelStore';
import { ChatMessage } from './ChatMessage';
import { Composer } from './Composer';
import { streamChat } from '@/lib/sentinelApi';
import { toast } from 'sonner';

export function ChatThread() {
  const {
    activeConversationId,
    getActiveConversation,
    addMessage,
    updateMessage,
    isLoading,
    setLoading,
    createConversation,
  } = useSentinelStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const conversation = getActiveConversation();

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, autoScroll]);

  // Handle scroll to detect user scroll up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleSend = async (content: string) => {
    let convId = activeConversationId;
    
    // Create new conversation if none active
    if (!convId) {
      convId = createConversation();
    }

    // Add user message
    addMessage(convId, { role: 'user', content });

    // Prepare messages for API
    const conv = useSentinelStore.getState().conversations.find(c => c.id === convId);
    const messages = conv?.messages.map(m => ({ role: m.role, content: m.content })) || [];

    setLoading(true);
    setAutoScroll(true);

    // Add empty assistant message for streaming
    addMessage(convId, { role: 'assistant', content: '' });
    
    // Get the actual message ID
    const updatedConv = useSentinelStore.getState().conversations.find(c => c.id === convId);
    const lastMessage = updatedConv?.messages[updatedConv.messages.length - 1];
    const assistantMessageId = lastMessage?.id || '';
    setStreamingMessageId(assistantMessageId);

    let fullContent = '';

    await streamChat({
      messages,
      onDelta: (delta) => {
        fullContent += delta;
        updateMessage(convId!, assistantMessageId, fullContent);
      },
      onDone: () => {
        setLoading(false);
        setStreamingMessageId(null);
      },
      onError: (error) => {
        setLoading(false);
        setStreamingMessageId(null);
        toast.error('Failed to get response: ' + error.message);
        // Update message with error
        updateMessage(convId!, assistantMessageId, '⚠️ Error: ' + error.message);
      },
    });
  };

  const handleRegenerate = async () => {
    if (!conversation || conversation.messages.length < 2) return;

    // Get the last user message
    const messages = conversation.messages.slice(0, -1); // Remove last assistant message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    if (!lastUserMessage) return;

    // Remove last assistant message and resend
    handleSend(lastUserMessage.content);
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">MMC Sentinel</h2>
            <p className="text-muted-foreground mb-6">
              Your AI-powered trading assistant. Ask about strategies, analyze backtests, 
              get risk insights, or learn about MQL5/EA development.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50 text-left">
                <Sparkles className="h-4 w-4 text-primary mb-2" />
                <p className="font-medium">Strategy Analysis</p>
                <p className="text-muted-foreground text-xs">Evaluate entry/exit rules and risk</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-left">
                <Sparkles className="h-4 w-4 text-primary mb-2" />
                <p className="font-medium">Backtest Insights</p>
                <p className="text-muted-foreground text-xs">Understand metrics and results</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-left">
                <Sparkles className="h-4 w-4 text-primary mb-2" />
                <p className="font-medium">Risk Management</p>
                <p className="text-muted-foreground text-xs">Position sizing and drawdown</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-left">
                <Sparkles className="h-4 w-4 text-primary mb-2" />
                <p className="font-medium">EA Development</p>
                <p className="text-muted-foreground text-xs">MQL5 logic and optimization</p>
              </div>
            </div>
          </div>
        </div>
        <Composer onSend={handleSend} isLoading={isLoading} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea 
        className="flex-1" 
        ref={scrollRef as any}
        onScroll={handleScroll as any}
      >
        <div className="min-h-full">
          {conversation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8 text-muted-foreground">
              Start a conversation...
            </div>
          ) : (
            conversation.messages.map((message, idx) => (
              <ChatMessage
                key={message.id}
                message={message}
                conversationId={conversation.id}
                isLast={idx === conversation.messages.length - 1 && message.role === 'assistant'}
                onRegenerate={handleRegenerate}
              />
            ))
          )}
          
          {/* Streaming indicator */}
          {isLoading && streamingMessageId && (
            <div className="flex items-center gap-2 px-4 py-2 text-muted-foreground text-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Sentinel is thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <Composer onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
