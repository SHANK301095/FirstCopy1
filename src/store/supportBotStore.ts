import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CopilotMode } from '@/components/support/CopilotModeSelector';

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string; // base64 data URL or blob URL
  size: number;
}

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  feedback?: 'up' | 'down' | null;
  attachments?: Attachment[];
};

interface Position {
  x: number;
  y: number;
}

interface SupportBotState {
  isOpen: boolean;
  isMinimized: boolean;
  isHidden: boolean; // User can hide the bot completely
  isActionsPinned: boolean; // Pin quick actions inside panel
  copilotMode: CopilotMode; // Guide | Debug | Build
  messages: Message[];
  isTyping: boolean;
  currentRoute: string;
  position: Position | null;
  
  // Actions
  open: () => void;
  close: () => void;
  minimize: () => void;
  toggleHidden: () => void;
  setHidden: (hidden: boolean) => void;
  toggleActionsPinned: () => void;
  setCopilotMode: (mode: CopilotMode) => void;
  setCurrentRoute: (route: string) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setTyping: (typing: boolean) => void;
  setFeedback: (index: number, feedback: 'up' | 'down' | null) => void;
  clearMessages: () => void;
  setPosition: (position: Position | null) => void;
  resetPosition: () => void;
}

const MAX_MESSAGES = 30;

const initialMessage: Message = {
  role: 'assistant',
  content: 'Hi! 👋 Main aapka MMC Copilot hoon. App ke baare mein kuch bhi poochein - features, usage, ya troubleshooting!',
  timestamp: Date.now(),
  feedback: null,
};

export const useSupportBotStore = create<SupportBotState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: false,
      isHidden: false,
      isActionsPinned: false,
      copilotMode: 'guide' as CopilotMode,
      messages: [initialMessage],
      isTyping: false,
      currentRoute: '/',
      position: null,

      open: () => set({ isOpen: true, isMinimized: false }),
      
      close: () => set({ isOpen: false, isMinimized: false }),
      
      minimize: () => set({ isMinimized: true, isOpen: false }),
      
      toggleHidden: () => set((state) => ({ isHidden: !state.isHidden, isOpen: false, isMinimized: false })),
      
      setHidden: (hidden) => set({ isHidden: hidden, isOpen: false, isMinimized: false }),
      
      toggleActionsPinned: () => set((state) => ({ isActionsPinned: !state.isActionsPinned })),
      
      setCopilotMode: (mode) => set({ copilotMode: mode }),
      
      setCurrentRoute: (route) => set({ currentRoute: route }),
      
      addMessage: (message) => set((state) => {
        const newMessages = [...state.messages, message];
        // Keep only last MAX_MESSAGES
        if (newMessages.length > MAX_MESSAGES) {
          return { messages: newMessages.slice(-MAX_MESSAGES) };
        }
        return { messages: newMessages };
      }),
      
      updateLastMessage: (content) => set((state) => {
        const messages = [...state.messages];
        if (messages.length > 0) {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content,
            timestamp: Date.now(),
          };
        }
        return { messages };
      }),
      
      setTyping: (typing) => set({ isTyping: typing }),
      
      setFeedback: (index, feedback) => set((state) => {
        const messages = [...state.messages];
        if (messages[index]) {
          messages[index] = { ...messages[index], feedback };
        }
        return { messages };
      }),
      
      clearMessages: () => set({ messages: [initialMessage] }),
      
      setPosition: (position) => set({ position }),
      
      resetPosition: () => set({ position: null }),
    }),
    {
      name: 'mmc-support-bot',
      partialize: (state) => ({ 
        messages: state.messages,
        position: state.position,
        isHidden: state.isHidden, // Persist hide preference
        isActionsPinned: state.isActionsPinned, // Persist pin preference
        copilotMode: state.copilotMode, // Persist mode preference
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isMinimized = false;
          state.isOpen = false;
        }
      },
    }
  )
);
