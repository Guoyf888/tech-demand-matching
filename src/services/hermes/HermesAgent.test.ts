import { beforeEach, describe, expect, it } from 'vitest';
import { HermesAgent } from './HermesAgent';

describe('Hermes v0.19 session search', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('searches persisted conversation messages through the session_search tool', async () => {
    localStorage.setItem('hermes-session-memory-v1', JSON.stringify({
      version: 1,
      sessions: [
        {
          sessionId: 'session-1',
          createdAt: '2026-07-20T08:00:00.000Z',
          updatedAt: '2026-07-20T08:01:00.000Z',
          messages: [
            {
              id: 'message-1',
              type: 'user',
              content: '需要寻找新能源汽车电池热管理方案',
              timestamp: '2026-07-20T08:00:00.000Z',
            },
          ],
        },
      ],
    }));

    const agent = new HermesAgent();
    const result = await agent.executeTool('session_search', { query: '电池热管理' });

    expect(agent.getSessionId()).toBe('session-1');
    expect(result.success).toBe(true);
    expect(result.output).toContain('新能源汽车电池热管理方案');
    expect(agent.getTools().some(tool => tool.name === 'session_search')).toBe(true);
  });
});
