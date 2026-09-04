const STORAGE_KEY = 'hermes-session-memory-v1';
const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 80;
const MAX_MESSAGE_CHARS = 10_000;

export interface HermesSessionMessage {
  id: string;
  type: string;
  content: string;
  timestamp: string;
}

export interface HermesSessionRecord {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  messages: HermesSessionMessage[];
}

interface HermesSessionStore {
  version: 1;
  sessions: HermesSessionRecord[];
}

export interface SessionSearchHit {
  sessionId: string;
  message: HermesSessionMessage;
  updatedAt: string;
  score: number;
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function emptyStore(): HermesSessionStore {
  return { version: 1, sessions: [] };
}

function isMessage(value: unknown): value is HermesSessionMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HermesSessionMessage>;
  return typeof candidate.id === 'string'
    && typeof candidate.type === 'string'
    && typeof candidate.content === 'string'
    && typeof candidate.timestamp === 'string';
}

export class SessionMemory {
  constructor(private readonly storage: Storage | null = getBrowserStorage()) {}

  private read(): HermesSessionStore {
    if (!this.storage) return emptyStore();
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      const parsed = JSON.parse(raw) as Partial<HermesSessionStore>;
      if (!Array.isArray(parsed.sessions)) return emptyStore();

      const sessions = parsed.sessions.filter((session): session is HermesSessionRecord => (
        !!session
        && typeof session.sessionId === 'string'
        && typeof session.createdAt === 'string'
        && typeof session.updatedAt === 'string'
        && Array.isArray(session.messages)
      )).map(session => ({
        ...session,
        messages: session.messages.filter(isMessage),
      }));
      return { version: 1, sessions };
    } catch {
      return emptyStore();
    }
  }

  private write(store: HermesSessionStore): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Storage can be unavailable or full; chat remains usable without memory.
    }
  }

  getSession(sessionId: string): HermesSessionRecord | undefined {
    return this.read().sessions.find(session => session.sessionId === sessionId);
  }

  getMostRecentSessionId(): string | undefined {
    return this.read().sessions
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
      ?.sessionId;
  }

  saveSession(sessionId: string, messages: HermesSessionMessage[]): void {
    if (!sessionId) return;
    const store = this.read();
    const now = new Date().toISOString();
    const existing = store.sessions.find(session => session.sessionId === sessionId);
    const normalizedMessages = messages
      .filter(isMessage)
      .slice(-MAX_MESSAGES_PER_SESSION)
      .map(message => ({ ...message, content: message.content.slice(0, MAX_MESSAGE_CHARS) }));

    const nextSession: HermesSessionRecord = {
      sessionId,
      createdAt: existing?.createdAt || normalizedMessages[0]?.timestamp || now,
      updatedAt: normalizedMessages[normalizedMessages.length - 1]?.timestamp || now,
      messages: normalizedMessages,
    };
    const sessions = [
      nextSession,
      ...store.sessions.filter(session => session.sessionId !== sessionId),
    ]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SESSIONS);

    this.write({ version: 1, sessions });
  }

  clearSession(sessionId: string): void {
    const store = this.read();
    this.write({
      version: 1,
      sessions: store.sessions.filter(session => session.sessionId !== sessionId),
    });
  }

  search(query: string, limit = 5): SessionSearchHit[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    const hits: SessionSearchHit[] = [];

    for (const session of this.read().sessions) {
      for (const message of session.messages) {
        const haystack = message.content.toLocaleLowerCase();
        const matchedTerms = terms.filter(term => haystack.includes(term));
        if (!haystack.includes(normalizedQuery) && matchedTerms.length === 0) continue;
        hits.push({
          sessionId: session.sessionId,
          message,
          updatedAt: session.updatedAt,
          score: (haystack.includes(normalizedQuery) ? 10 : 0) + matchedTerms.length,
        });
      }
    }

    return hits
      .sort((a, b) => b.score - a.score || b.message.timestamp.localeCompare(a.message.timestamp))
      .slice(0, Math.min(Math.max(limit, 1), 20));
  }
}

export const hermesSessionMemory = new SessionMemory();
