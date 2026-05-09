import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
  draftType?: 'demand' | 'tech' | 'platform' | null;
}

export interface Draft {
  id: string;
  type: 'demand' | 'tech' | 'platform';
  title: string;
  content: string;
  summary: string;
  messages: ChatMessage[];
  createdAt: string;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  drafts: Draft[];
  selectedModel: string;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, session: Partial<ChatSession>) => void;
  deleteSession: (id: string) => void;
  setCurrentSession: (id: string | null) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  addDraft: (draft: Draft) => void;
  deleteDraft: (id: string) => void;
  getCurrentSession: () => ChatSession | null;
  setSelectedModel: (model: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      drafts: [],
      selectedModel: 'openai',

      addSession: (session) =>
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
        })),

      updateSession: (id, session) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...session, updatedAt: new Date().toISOString() } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
        })),

      setCurrentSession: (id) => set({ currentSessionId: id }),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message], updatedAt: new Date().toISOString() }
              : s
          ),
        })),

      addDraft: (draft) =>
        set((state) => ({
          drafts: [draft, ...state.drafts],
        })),

      deleteDraft: (id) =>
        set((state) => ({
          drafts: state.drafts.filter((d) => d.id !== id),
        })),

      getCurrentSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.currentSessionId) || null;
      },

      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    { name: 'chat-storage' }
  )
);
