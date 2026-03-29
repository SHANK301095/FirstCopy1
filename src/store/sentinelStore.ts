import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SentinelMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  reactions?: { thumbsUp?: boolean; thumbsDown?: boolean };
}

export interface SentinelConversation {
  id: string;
  title: string;
  messages: SentinelMessage[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

interface SentinelState {
  conversations: SentinelConversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  
  // Actions
  createConversation: () => string;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<SentinelMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (conversationId: string, messageId: string, content: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  setReaction: (conversationId: string, messageId: string, reaction: 'thumbsUp' | 'thumbsDown', value: boolean) => void;
  setLoading: (loading: boolean) => void;
  clearConversation: (id: string) => void;
  getActiveConversation: () => SentinelConversation | undefined;
}

export const useSentinelStore = create<SentinelState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isLoading: false,

      createConversation: () => {
        const id = crypto.randomUUID();
        const newConversation: SentinelConversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      addMessage: (conversationId, message) => {
        const newMessage: SentinelMessage = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            const updatedMessages = [...conv.messages, newMessage];
            // Auto-title from first user message
            const title = conv.messages.length === 0 && message.role === 'user'
              ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
              : conv.title;
            return {
              ...conv,
              messages: updatedMessages,
              title,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateMessage: (conversationId, messageId, content) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId ? { ...msg, content } : msg
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: filtered,
            activeConversationId: state.activeConversationId === id
              ? (filtered[0]?.id || null)
              : state.activeConversationId,
          };
        });
      },

      renameConversation: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }));
      },

      togglePin: (id) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, pinned: !c.pinned } : c
          ),
        }));
      },

      setReaction: (conversationId, messageId, reaction, value) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              messages: conv.messages.map((msg) => {
                if (msg.id !== messageId) return msg;
                return {
                  ...msg,
                  reactions: {
                    ...msg.reactions,
                    [reaction]: value,
                  },
                };
              }),
            };
          }),
        }));
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      clearConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, messages: [], updatedAt: Date.now() } : c
          ),
        }));
      },

      getActiveConversation: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeConversationId);
      },
    }),
    {
      name: 'mmc-sentinel-store',
    }
  )
);
