import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentTierConfig } from './AgentTier';

const mocks = vi.hoisted(() => ({
  claudeChat: vi.fn(),
  executeTool: vi.fn(),
  emit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/claudeCode', () => ({ claudeChat: mocks.claudeChat }));
vi.mock('./HermesAgent', () => ({
  getHermesAgent: () => ({
    getTools: () => [{ name: 'web_search', description: 'Search the web' }],
    executeTool: mocks.executeTool,
  }),
}));
vi.mock('@/services/EventBus', () => ({
  eventBus: { emit: mocks.emit },
  EventTypes: { AGENT_TASK_START: 'start', AGENT_TOOL_CALL: 'tool', AGENT_TASK_END: 'end' },
}));

import { runToolLoop } from './ToolLoop';

const tierConfig: AgentTierConfig = {
  level: 'worker',
  maxIterations: 2,
  systemPromptPrefix: 'test',
  temperature: 0,
  maxTokens: 100,
  description: 'test',
};

describe('ToolLoop reliability', () => {
  beforeEach(() => {
    mocks.claudeChat.mockReset();
    mocks.executeTool.mockReset();
    mocks.emit.mockClear();
  });

  it('reports an LLM failure instead of treating the error text as success', async () => {
    mocks.claudeChat.mockResolvedValue({ success: false, error: 'provider unavailable' });

    const result = await runToolLoop('test task', tierConfig);

    expect(result.success).toBe(false);
    expect(result.exitReason).toBe('llm_error');
    expect(result.finalOutput).toContain('provider unavailable');
  });

  it('rejects a malformed fenced tool call', async () => {
    mocks.claudeChat.mockResolvedValue({ success: true, output: '```json\n{"tool":\n```' });

    const result = await runToolLoop('test task', tierConfig);

    expect(result.success).toBe(false);
    expect(result.exitReason).toBe('invalid_tool_call');
    expect(mocks.executeTool).not.toHaveBeenCalled();
  });

  it('does not mistake an ordinary code block for a tool call', async () => {
    const output = '可以这样实现：\n```ts\nconst result = { ok: true };\n```';
    mocks.claudeChat.mockResolvedValue({ success: true, output });

    const result = await runToolLoop('write code', tierConfig);

    expect(result.success).toBe(true);
    expect(result.exitReason).toBe('completed');
    expect(result.finalOutput).toBe(output);
  });

  it('aborts the tool signal and reports a timeout', async () => {
    mocks.claudeChat.mockResolvedValue({
      success: true,
      output: '```json\n{"tool":"web_search","params":{"query":"Hermes"}}\n```',
    });
    mocks.executeTool.mockImplementation((_tool: string, _params: unknown, signal?: AbortSignal) => (
      new Promise((_, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      })
    ));

    const result = await runToolLoop('test task', tierConfig, { toolTimeoutMs: 5 });

    expect(result.success).toBe(false);
    expect(result.exitReason).toBe('tool_timeout');
    const signal = mocks.executeTool.mock.calls[0][2] as AbortSignal;
    expect(signal.aborted).toBe(true);
  });

  it('does not claim success when the iteration budget is exhausted', async () => {
    mocks.claudeChat.mockResolvedValue({
      success: true,
      output: '{"tool":"web_search","params":{"query":"Hermes"}}',
    });
    mocks.executeTool.mockResolvedValue({ success: true, output: 'result' });

    const result = await runToolLoop('test task', { ...tierConfig, maxIterations: 1 });

    expect(result.success).toBe(false);
    expect(result.exitReason).toBe('max_iterations');
    expect(result.finalOutput).toContain('迭代上限');
    expect(result.finalOutput).not.toContain('请基于此结果');
  });

  it('marks injected tool output as truncated while retaining the full execution record', async () => {
    mocks.claudeChat
      .mockResolvedValueOnce({
        success: true,
        output: '{"tool":"web_search","params":{"query":"Hermes"}}',
      })
      .mockResolvedValueOnce({ success: true, output: 'final answer' });
    const fullOutput = 'x'.repeat(100);
    mocks.executeTool.mockResolvedValue({ success: true, output: fullOutput });

    const result = await runToolLoop('test task', tierConfig, { toolResultMaxChars: 20 });

    expect(result.success).toBe(true);
    expect(result.exitReason).toBe('completed');
    expect(mocks.claudeChat.mock.calls[1][0]).toContain('工具结果已截断');
    expect(result.toolCalls[0].result.output).toBe(fullOutput);
  });
});
