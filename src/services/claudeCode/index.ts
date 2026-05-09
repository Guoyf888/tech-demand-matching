/**
 * Claude Code Service - AI对话服务
 *
 * 提供两种调用方式：
 * 1. Claude Code CLI（本地安装claude-code时使用）
 * 2. API Gateway（支持MiniMax/Claude/OpenAI等提供商）
 *
 * 优先级：CLI > API Gateway
 */

import { Command } from '@tauri-apps/plugin-shell';

export interface ClaudeCodeResponse {
  success: boolean;
  output?: string  // 新增：支持流式输出的完整内容
  error?: string;
  provider?: string;  // 新增：记录实际使用的provider
}

export { type ClaudeCodeResponse as ApiResponse };

// ==================== 配置常量 ====================

// API超时时间（毫秒）
const API_TIMEOUT = 60000;  // 60秒超时

// 最大重试次数
const MAX_RETRIES = 2;

// ==================== 核心对话函数 ====================

/**
 * AI对话主函数
 * 优先使用Claude Code CLI，失败后回退到API Gateway
 *
 * @param message 用户消息
 * @param sessionHistory 对话历史（可选，用于多轮对话）
 * @param options 额外配置选项
 */
export async function claudeChat(
  message: string,
  sessionHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  options: {
    model?: string;           // 指定模型（可选）
    systemPrompt?: string;    // 系统提示词（可选）
    temperature?: number;     // 温度参数（可选）
    maxTokens?: number;       // 最大token数（可选）
    timeout?: number;         // 超时时间（可选）
    provider?: string;        // 强制使用特定provider（可选）
  } = {}
): Promise<ClaudeCodeResponse> {
  // 构建完整消息列表
  const messages = [
    ...sessionHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message }
  ];

  // 优先尝试CLI模式
  if (!options.provider || options.provider === 'claude-code') {
    const cliResult = await tryCliMode(message, sessionHistory, options);
    if (cliResult.success) {
      console.log('[ClaudeChat] 使用Claude Code CLI模式');
      return { ...cliResult, provider: 'claude-code' };
    }
    console.warn(`[ClaudeChat] CLI模式失败: ${cliResult.error}，尝试API模式`);
  }

  // 回退到API Gateway模式（支持MiniMax等）
  const apiResult = await tryApiMode(messages, options);
  return { ...apiResult, provider: apiResult.provider || 'api-gateway' };
}

/**
 * 尝试CLI模式
 */
async function tryCliMode(
  message: string,
  sessionHistory: { role: 'user' | 'assistant'; content: string }[],
  options: { systemPrompt?: string; model?: string }
): Promise<Omit<ClaudeCodeResponse, 'provider'>> {
  try {
    // 检查CLI是否可用
    const cliInstalled = await isClaudeCodeInstalled();
    if (!cliInstalled) {
      return { success: false, error: 'Claude Code CLI未安装' };
    }

    // 构建对话
    const conversation = [
      ...sessionHistory.map(m =>
        m.role === 'user' ? `Human: ${m.content}` : `Assistant: ${m.content}`
      ),
      `Human: ${message}`,
      'Assistant:',
    ].join('\n');

    const args = ['-p', conversation];

    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }

    if (options.model) {
      args.push('--model', options.model);
    }

    const command = Command.create('npx', ['claude', ...args]);
    const output = await command.execute();

    if (output.code === 0 && output.stdout) {
      return { success: true, output: output.stdout.toString().trim() };
    }

    return {
      success: false,
      error: output.stderr?.toString() || 'Claude Code CLI执行失败'
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `CLI异常: ${errorMsg}` };
  }
}

/**
 * 尝试API Gateway模式（支持MiniMax/Claude/OpenAI等）
 */
async function tryApiMode(
  messages: { role: 'user' | 'assistant'; content: string }[],
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
    provider?: string;
  }
): Promise<ClaudeCodeResponse> {
  const timeout = options.timeout || API_TIMEOUT;

  try {
    // 导入apiGateway（延迟导入避免循环依赖）
    const { apiGateway } = await import('@/services/api/gateway');

    // 检查API配置
    const validation = apiGateway.validateConfig();
    if (!validation.valid) {
      return {
        success: false,
        error: `API未配置: ${validation.error}`

      };
    }

    // 构建消息格式
    const apiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

    if (options.systemPrompt) {
      apiMessages.push({ role: 'system', content: options.systemPrompt });
    }

    apiMessages.push(...messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    })));

    // 调用API Gateway（带超时和重试）
    const result = await callApiWithRetry(
      () => apiGateway.chat({
        messages: apiMessages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      }),
      timeout
    );

    // 解析响应
    if (!result.ok) {
      // HTTP错误
      let errorDetail = `HTTP ${result.status}: ${result.statusText}`;
      try {
        const errorData = await result.json();
        errorDetail = errorData.error?.message || errorData.message || errorDetail;
      } catch { /* ignore */ }
      return { success: false, error: `API调用失败: ${errorDetail}` };
    }

    const data = await result.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      return { success: true, output: content };
    }

    return { success: false, error: 'API返回内容为空' };

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // 分类错误类型
    if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
      return { success: false, error: `网络错误: 请检查网络连接和API地址是否可访问` };
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
      return { success: false, error: `请求超时(${timeout/1000}秒): API响应过慢，请稍后重试` };
    }
    if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
      return { success: false, error: `API密钥无效或已过期，请检查设置中的API Key` };
    }
    if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
      return { success: false, error: `API访问被拒绝，请检查API Key权限` };
    }
    if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
      return { success: false, error: `API请求频率超限，请稍后重试` };
    }

    return { success: false, error: `API异常: ${errorMsg}` };
  }
}

/**
 * 带重试的API调用
 */
async function callApiWithRetry(
  apiCall: () => Promise<Response>,
  timeout: number,
  retryCount: number = 0
): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await apiCall();
      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // 判断是否应该重试
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRetryable = errorMsg.includes('timeout') ||
                          errorMsg.includes('network') ||
                          errorMsg.includes('fetch');

      if (isRetryable && retryCount < MAX_RETRIES) {
        console.log(`[ClaudeChat] API调用失败，${retryCount + 1}秒后重试...`);
        await sleep((retryCount + 1) * 1000);
        return callApiWithRetry(apiCall, timeout, retryCount + 1);
      }

      throw error;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * 工具函数：等待指定毫秒
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 其他导出函数 ====================

/**
 * 检查Claude Code CLI是否已安装
 */
export async function isClaudeCodeInstalled(): Promise<boolean> {
  try {
    const nodeCmd = Command.create('node', ['--version']);
    const nodeOutput = await nodeCmd.execute();
    if (nodeOutput.code !== 0) return false;

    const claudeCmd = Command.create('npx', ['claude', '--version']);
    const claudeOutput = await claudeCmd.execute();
    return claudeOutput.code === 0;
  } catch {
    return false;
  }
}

/**
 * 运行Claude Code --print命令（无会话历史）
 */
export async function runClaudePrint(
  prompt: string,
  options: {
    model?: string;
    systemPrompt?: string;
  } = {}
): Promise<ClaudeCodeResponse> {
  try {
    const cliInstalled = await isClaudeCodeInstalled();
    if (!cliInstalled) {
      // 回退到API模式
      return claudeChat(prompt, [], options);
    }

    const args = ['-p'];
    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt);
    }
    args.push(prompt);

    const command = Command.create('claude', args);
    const output = await command.execute();

    if (output.code === 0) {
      return { success: true, output: output.stdout?.toString() };
    } else {
      return { success: false, error: output.stderr?.toString() || 'Command failed' };
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
}

/**
 * 生成唯一会话ID
 */
export function generateSessionId(): string {
  return `claude-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 终止Claude Code会话
 */
export async function killClaudeSession(_sessionId: string): Promise<ClaudeCodeResponse> {
  return { success: true };
}
