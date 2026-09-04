/**
 * ToolLoop - 有界工具调用循环
 *
 * 移植自 OpenHuman 的 tool_loop.rs 模式
 *
 * 核心逻辑：
 * 1. 将用户任务 + 工具描述发送给 LLM
 * 2. 如果 LLM 返回工具调用 JSON，执行工具
 * 3. 将工具结果反馈给 LLM 进行下一轮迭代
 * 4. 重复直到 LLM 给出最终答案或达到最大迭代次数
 *
 * 安全机制：
 * - MAX_ITERATIONS = 10 硬上限
 * - 每工具 30s 超时
 * - 工具结果截断 2000 字符
 * - 非法工具调用显式失败，普通文本继续作为最终回答
 */

import { claudeChat } from '@/services/claudeCode';
import { getHermesAgent, type ToolResult } from './HermesAgent';
import type { AgentTierConfig } from './AgentTier';
import { eventBus, EventTypes } from '@/services/EventBus';
import { jsonrepair } from 'jsonrepair';

const MAX_ITERATIONS = 10;
const TOOL_TIMEOUT_MS = 30000;
const TOOL_RESULT_MAX_CHARS = 2000;

export interface ToolCallRequest {
  tool: string;
  params: Record<string, unknown>;
}

export interface ToolLoopResult {
  success: boolean;
  finalOutput: string;
  iterations: number;
  exitReason: 'completed' | 'llm_error' | 'invalid_tool_call' | 'tool_timeout' | 'max_iterations';
  toolCalls: Array<{
    toolId: string;
    result: ToolResult;
    iteration: number;
  }>;
}

interface ToolLoopContext {
  systemPrompt?: string;
  skillContent?: string;
  toolTimeoutMs?: number;
  toolResultMaxChars?: number;
}

type ParsedToolCall =
  | { kind: 'none' }
  | { kind: 'valid'; request: ToolCallRequest }
  | { kind: 'invalid'; error: string };

function parseToolCall(output: string): ParsedToolCall {
  const jsonFenced = output.match(/```json\s*([\s\S]*?)```/i);
  const genericFenced = output.match(/```\s*([\s\S]*?)```/);
  const genericCandidate = genericFenced?.[1]?.trim() || '';
  const trimmed = output.trim();
  const candidate = jsonFenced?.[1]?.trim()
    || (genericCandidate.startsWith('{') ? genericCandidate : '')
    || (trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed : '');

  if (!candidate) return { kind: 'none' };

  try {
    const parsed = JSON.parse(jsonrepair(candidate)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { kind: 'invalid', error: '工具调用必须是 JSON 对象' };
    }

    const record = parsed as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, 'tool')) return { kind: 'none' };
    if (typeof record.tool !== 'string' || !record.tool.trim()) {
      return { kind: 'invalid', error: '工具调用缺少有效的 tool 字段' };
    }
    if (record.params !== undefined && (
      !record.params
      || typeof record.params !== 'object'
      || Array.isArray(record.params)
    )) {
      return { kind: 'invalid', error: '工具调用 params 必须是 JSON 对象' };
    }

    return {
      kind: 'valid',
      request: {
        tool: record.tool,
        params: (record.params as Record<string, unknown> | undefined) || {},
      },
    };
  } catch (error) {
    return {
      kind: 'invalid',
      error: error instanceof Error ? error.message : '无法解析工具调用',
    };
  }
}

function formatToolOutput(result: ToolResult, maxChars: number): string {
  const output = result.output || result.error || 'No output';
  if (output.length <= maxChars) return output;
  return `${output.slice(0, maxChars)}\n\n[工具结果已截断：原始 ${output.length} 字符，仅向模型注入前 ${maxChars} 字符；完整结果保留在本次执行记录中。]`;
}

class ToolTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`工具执行超时（${timeoutMs}ms）`);
    this.name = 'ToolTimeoutError';
  }
}

/**
 * 运行有界工具调用循环
 */
export async function runToolLoop(
  userTask: string,
  tierConfig: AgentTierConfig,
  context: ToolLoopContext = {}
): Promise<ToolLoopResult> {
  const hermes = getHermesAgent();
  const tools = hermes.getTools();
  const toolDescriptions = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  const maxIter = Math.min(tierConfig.maxIterations, MAX_ITERATIONS);
  const toolTimeoutMs = context.toolTimeoutMs ?? TOOL_TIMEOUT_MS;
  const toolResultMaxChars = context.toolResultMaxChars ?? TOOL_RESULT_MAX_CHARS;

  const systemPrompt = `${context.systemPrompt || tierConfig.systemPromptPrefix}

可用工具：
${toolDescriptions}

${context.skillContent ? `技能指令：\n${context.skillContent}\n` : ''}
当需要使用工具时，用 JSON 格式回复：
\`\`\`json
{"tool": "工具名称", "params": {"参数名": "参数值"}}
\`\`\`

当已有足够信息回答时，直接回复最终答案（不要包含工具调用 JSON）。`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userTask },
  ];

  const toolCalls: ToolLoopResult['toolCalls'] = [];
  let finalOutput = '';
  let exitReason: ToolLoopResult['exitReason'] | null = null;

  await eventBus.emit({
    type: EventTypes.AGENT_TASK_START,
    payload: { task: userTask, tier: tierConfig.level },
    timestamp: new Date().toISOString(),
    source: 'ToolLoop',
  });

  for (let i = 0; i < maxIter; i++) {
    // 调用 LLM
    const result = await claudeChat(
      messages[messages.length - 1].content,
      messages.slice(0, -1),
      {
        systemPrompt,
        temperature: tierConfig.temperature,
        maxTokens: tierConfig.maxTokens,
      }
    );

    if (!result.success || !result.output) {
      finalOutput = `LLM 调用失败：${result.error || '未返回内容'}`;
      exitReason = 'llm_error';
      break;
    }

    const parsedToolCall = parseToolCall(result.output);
    if (parsedToolCall.kind === 'none') {
      // 无工具调用 -> 最终答案
      finalOutput = result.output;
      exitReason = 'completed';
      break;
    }
    if (parsedToolCall.kind === 'invalid') {
      finalOutput = `工具调用格式无效：${parsedToolCall.error}`;
      exitReason = 'invalid_tool_call';
      break;
    }

    const toolCall = parsedToolCall.request;

    try {
      await eventBus.emit({
        type: EventTypes.AGENT_TOOL_CALL,
        payload: { toolId: toolCall.tool, params: toolCall.params, iteration: i + 1 },
        timestamp: new Date().toISOString(),
        source: 'ToolLoop',
      });

      // 执行工具（带超时）
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<ToolResult>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new ToolTimeoutError(toolTimeoutMs));
        }, toolTimeoutMs);
      });

      let toolResult: ToolResult;
      try {
        toolResult = await Promise.race([
          hermes.executeTool(toolCall.tool, toolCall.params, controller.signal),
          timeoutPromise,
        ]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      toolCalls.push({ toolId: toolCall.tool, result: toolResult, iteration: i + 1 });

      const toolOutput = formatToolOutput(toolResult, toolResultMaxChars);

      // 将工具结果反馈给 LLM
      messages.push(
        { role: 'assistant', content: result.output },
        { role: 'user', content: `工具 ${toolCall.tool} 的返回结果：\n${toolOutput}\n\n请基于此结果继续分析或给出最终答案。` }
      );
    } catch (err) {
      const errorName = err && typeof err === 'object' && 'name' in err
        ? String((err as { name?: unknown }).name)
        : '';
      if (err instanceof ToolTimeoutError || errorName === 'AbortError') {
        finalOutput = err instanceof ToolTimeoutError
          ? err.message
          : `工具执行超时（${toolTimeoutMs}ms）`;
        exitReason = 'tool_timeout';
      } else {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const failedResult: ToolResult = { success: false, error: errorMessage };
        toolCalls.push({ toolId: toolCall.tool, result: failedResult, iteration: i + 1 });
        messages.push(
          { role: 'assistant', content: result.output },
          { role: 'user', content: `工具 ${toolCall.tool} 执行失败：${errorMessage}\n\n请调整方案或明确说明无法完成。` }
        );
        continue;
      }
      break;
    }
  }

  if (!exitReason) {
    exitReason = 'max_iterations';
    finalOutput = `任务达到迭代上限（${maxIter}），尚未生成可验证的最终答案。`;
  }

  const success = exitReason === 'completed';

  await eventBus.emit({
    type: EventTypes.AGENT_TASK_END,
    payload: { success, exitReason, iterations: toolCalls.length, tier: tierConfig.level },
    timestamp: new Date().toISOString(),
    source: 'ToolLoop',
  });

  return {
    success,
    finalOutput,
    iterations: toolCalls.length,
    exitReason,
    toolCalls,
  };
}
