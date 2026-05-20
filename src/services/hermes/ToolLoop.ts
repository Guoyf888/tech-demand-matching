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
 * - 解析失败 = 降级为直接回答
 */

import { claudeChat } from '@/services/claudeCode';
import { getHermesAgent, type ToolResult } from './HermesAgent';
import type { AgentTierConfig } from './AgentTier';
import { eventBus, EventTypes } from '@/services/EventBus';

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
  toolCalls: Array<{
    toolId: string;
    result: ToolResult;
    iteration: number;
  }>;
}

/**
 * 运行有界工具调用循环
 */
export async function runToolLoop(
  userTask: string,
  tierConfig: AgentTierConfig,
  context: { systemPrompt?: string; skillContent?: string } = {}
): Promise<ToolLoopResult> {
  const hermes = getHermesAgent();
  const tools = hermes.getTools();
  const toolDescriptions = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

  const maxIter = Math.min(tierConfig.maxIterations, MAX_ITERATIONS);

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
      finalOutput = result.error || 'LLM 调用失败';
      break;
    }

    // 检查响应中是否包含工具调用
    const toolCallMatch =
      result.output.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
      result.output.match(/(\{"tool"\s*:\s*"[^"]+"[\s\S]*?\})/);

    if (!toolCallMatch) {
      // 无工具调用 -> 最终答案
      finalOutput = result.output;
      break;
    }

    try {
      const toolCall = JSON.parse(toolCallMatch[1]) as ToolCallRequest;

      if (!toolCall.tool) {
        finalOutput = result.output;
        break;
      }

      await eventBus.emit({
        type: EventTypes.AGENT_TOOL_CALL,
        payload: { toolId: toolCall.tool, params: toolCall.params, iteration: i + 1 },
        timestamp: new Date().toISOString(),
        source: 'ToolLoop',
      });

      // 执行工具（带超时）
      const toolResult = await Promise.race([
        hermes.executeTool(toolCall.tool, toolCall.params || {}),
        new Promise<ToolResult>((_, reject) =>
          setTimeout(() => reject(new Error('Tool timeout')), TOOL_TIMEOUT_MS)
        ),
      ]);

      toolCalls.push({ toolId: toolCall.tool, result: toolResult, iteration: i + 1 });

      // 截断工具结果
      const truncatedOutput = (toolResult.output || toolResult.error || 'No output')
        .slice(0, TOOL_RESULT_MAX_CHARS);

      // 将工具结果反馈给 LLM
      messages.push(
        { role: 'assistant', content: result.output },
        { role: 'user', content: `工具 ${toolCall.tool} 的返回结果：\n${truncatedOutput}\n\n请基于此结果继续分析或给出最终答案。` }
      );
    } catch (err) {
      // 工具调用解析失败或超时 -> 将 LLM 响应作为最终答案
      finalOutput = result.output;
      break;
    }
  }

  // 如果循环结束仍未得到最终答案
  if (!finalOutput && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    finalOutput = lastMsg.content || '任务执行完成，但未能生成最终报告。';
  }

  await eventBus.emit({
    type: EventTypes.AGENT_TASK_END,
    payload: { success: !!finalOutput, iterations: toolCalls.length, tier: tierConfig.level },
    timestamp: new Date().toISOString(),
    source: 'ToolLoop',
  });

  return {
    success: !!finalOutput,
    finalOutput,
    iterations: toolCalls.length,
    toolCalls,
  };
}
