/**
 * AgentTier - Agent 层级系统
 *
 * 移植自 OpenHuman 的 AgentTier 概念（Chat/Reasoning/Worker）
 *
 * 三层结构：
 * - Chat: 快速单轮响应（高温度，少 token）
 * - Reasoning: 深度分析 + 工具访问（中等温度，中等 token）
 * - Worker: 完整 Agent 循环（低温度，高 token，多次迭代）
 */

export type TierLevel = 'chat' | 'reasoning' | 'worker';

export interface AgentTierConfig {
  level: TierLevel;
  maxIterations: number;
  systemPromptPrefix: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

export const TIER_CONFIGS: Record<TierLevel, AgentTierConfig> = {
  chat: {
    level: 'chat',
    maxIterations: 1,
    systemPromptPrefix: '你是技术经理人的AI助手，可以帮助分析技术需求、技术成果，提供创新建议，促成技术对接。用专业但易懂的语言回答。',
    temperature: 0.7,
    maxTokens: 2048,
    description: '快速单轮回答',
  },
  reasoning: {
    level: 'reasoning',
    maxIterations: 3,
    systemPromptPrefix: '你是技术经理人AI分析专家，需要深入分析问题并使用工具获取信息。请先思考，再决定是否需要使用工具，最后给出完整分析。',
    temperature: 0.5,
    maxTokens: 4096,
    description: '深度分析 + 工具访问',
  },
  worker: {
    level: 'worker',
    maxIterations: 10,
    systemPromptPrefix: '你是技术经理人AI执行引擎，需要执行多步骤任务计划。你可以使用工具搜索信息、分析数据、生成报告。每一步都要使用工具获取最新信息，然后综合分析。',
    temperature: 0.3,
    maxTokens: 8192,
    description: '完整 Agent 循环',
  },
};

/**
 * 根据意图类型选择 Agent 层级
 */
export function selectTier(intent: string): TierLevel {
  switch (intent) {
    case 'simple-chat':
      return 'chat';
    case 'multi-step-task':
      return 'worker';
    case 'tool-execution':
    case 'skill-execution':
    case 'domain-analysis':
      return 'reasoning';
    default:
      return 'chat';
  }
}
