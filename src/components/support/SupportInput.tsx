import { useState, useRef, useEffect, forwardRef } from 'react';
import { Send, Loader2, Smile, Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Attachment } from '@/store/supportBotStore';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface SupportInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
  isOnline: boolean;
}

// Common emoji categories
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😎', '🤔', '🤗', '😏', '😌']
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '✋', '🖐️', '👏', '🙌', '🤝', '🙏', '💪', '🎉', '🎊', '💯', '✅']
  },
  {
    name: 'Objects',
    emojis: ['📈', '📊', '💹', '💰', '💵', '📱', '💻', '⚙️', '🔧', '📁', '📂', '📋', '📌', '🔍', '💡', '🚀', '⭐', '🔥', '❤️', '💙']
  }
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = ['application/pdf', 'text/plain', 'text/csv', ...ALLOWED_IMAGE_TYPES];

export const SupportInput = forwardRef<HTMLDivElement, SupportInputProps>(
  function SupportInput({ onSend, isLoading, isOnline }, ref) {
  const [input, setInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const processFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large. Max size is 5MB.`);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`File type not supported.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      
      const attachment: Attachment = {
        id: uuidv4(),
        type: isImage ? 'image' : 'file',
        name: file.name,
        url,
        size: file.size,
      };
      
      setAttachments(prev => [...prev, attachment]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(processFile);
    e.target.value = ''; // Reset input
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div ref={ref} className="p-3 border-t border-border/50 bg-gradient-to-t from-muted/30 to-transparent">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-2.5 bg-muted/40 rounded-xl animate-fade-in border border-border/30">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group flex items-center gap-2.5 bg-background/80 border border-border/50 rounded-xl p-2 pr-9 shadow-sm animate-scale-in"
            >
              {attachment.type === 'image' ? (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate max-w-[100px]">
                  {attachment.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
              <button
                onClick={() => removeAttachment(attachment.id)}
                className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
              >
                <X className="h-3 w-3 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Security notice */}
      <p className="text-[10px] text-muted-foreground/60 text-center mb-2.5 flex items-center justify-center gap-1.5 font-body tracking-wide">
        <span className="text-[11px]">🔐</span>
        <span>Never share passwords, OTPs, or API keys</span>
      </p>
      
      <div className="flex gap-1.5 items-end">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.csv"
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          multiple
        />

        {/* Action buttons container */}
        <div className="flex gap-0.5">
          {/* Image Upload Button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted transition-colors"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading}
            title="Attach image"
          >
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* File Upload Button */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Attach file"
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Emoji Picker */}
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "shrink-0 h-10 w-10 rounded-xl transition-colors",
                  emojiOpen ? "bg-primary/15 text-primary" : "hover:bg-muted text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-72 p-3 bg-popover/95 backdrop-blur-xl border border-border/50 shadow-2xl z-[60] rounded-xl" 
              side="top" 
              align="start"
              sideOffset={8}
            >
              <div className="space-y-3">
                {EMOJI_CATEGORIES.map((category) => (
                  <div key={category.name}>
                    <p className="text-[11px] text-muted-foreground font-medium mb-2 px-0.5 uppercase tracking-wider">
                      {category.name}
                    </p>
                    <div className="grid grid-cols-10 gap-0.5">
                      {category.emojis.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => insertEmoji(emoji)}
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded-lg",
                            "hover:bg-muted transition-all text-base",
                            "active:scale-90"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Input field */}
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOnline ? "Ask anything about MMC..." : "Offline mode..."}
            disabled={isLoading}
            className="h-10 text-sm rounded-xl border-border/50 bg-muted/50 focus:bg-background pr-3 transition-colors"
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSubmit}
          disabled={(!input.trim() && attachments.length === 0) || isLoading}
          size="icon"
          className={cn(
            "shrink-0 h-10 w-10 rounded-xl transition-all shadow-sm",
            (!input.trim() && attachments.length === 0) 
              ? "bg-muted text-muted-foreground" 
              : "bg-gradient-to-br from-primary to-primary/90 hover:shadow-md"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
});
