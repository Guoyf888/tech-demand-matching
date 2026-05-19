/**
 * 统一AI对话容器 v1.1.0
 * 整合 AI对话、Hermes任务规划、Claude终端 三大功能
 * Hermes-Agent作为唯一调度核心，Claude/OpenClaw/Skills均由其统筹
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { apiGateway } from '@/services/api/gateway';
import { useApiStore } from '@/store/apiStore';
import { themes, useThemeStore } from '@/store/themeStore';
import { v4 as uuidv4 } from 'uuid';
import { claudeChat, isClaudeCodeInstalled, type ClaudeCodeResponse } from '@/services/claudeCode';
import { getHermesAgent } from '@/services/hermes/HermesAgent';
import { getHermesSkillsService } from '@/services/hermes/HermesSkillsService';
import { getTechMatchAgent } from '@/services/hermes/TechMatchAgent';
import { unifiedSkillService } from '@/services/skills/UnifiedSkillService';
import {
  Bot, Sparkles, Zap, Lightbulb,
  FileText, Code, Upload, File, X, CheckCircle2,
  Target, Users, GitBranch, Cpu
} from 'lucide-react';
import { parseDocument, detectContentType, extractIndustryTags, extractTechTags } from '@/services/documentParser';
import { MessageItem } from './MessageItem';
import './AIAgentChat.css';

// ==================== 类型定义 ====================

type ChatMode = 'chat' | 'hermes' | 'terminal' | 'smart-agent';

interface ExecutionState {
  status: 'idle' | 'planning' | 'executing' | 'completed' | 'failed';
  currentStep?: number;
  totalSteps?: number;
  stepDescription?: string;
  result?: string;
}

interface UnifiedMessage {
  id: string;
  type: 'user' | 'ai' | 'hermes-plan' | 'hermes-result' | 'terminal' | 'system' | 'tech-result';
  content: string;
  timestamp: string;
}

// ==================== 常量 ====================

// 工具名称常量 - 全部使用短横线格式（无下划线）
// 注意：HermesAgent内部已实现自动规范化（_转-），此处仅供类型参考
const TOOL_IDS = {
  CLAUDE_CODE: 'claude-code',
  TASK_PLANNING: 'task-planning',
  WEB_SEARCH: 'web-search',
  DOCUMENT_ANALYSIS: 'document-analysis',
  OPENCLAW_SKILL: 'openclaw-skill',
  NATIVE_SKILL: 'native-skill',
  COMPANY_RESEARCH: 'company-research',
  POLICY_QA: 'policy-qa',
  POLICY_COMPILATION: 'policy-compilation',
  INDUSTRY_CHAIN: 'industry-chain-analysis',
  TECH_PREDICTION: 'enterprise-tech-prediction',
  RESULT_MATCHING: 'result-demand-matching',
} as const;
void TOOL_IDS; // 避免TS报错，实际使用HermesAgent统一调度

const modelOptions = [
  { id: 'openai', name: 'OpenAI GPT-4' },
  { id: 'claude', name: 'Claude 3.5' },
  { id: 'qwen', name: '阿里 Qwen' },
  { id: 'ernie', name: '百度 文心一言' },
  { id: 'zhipu', name: '智谱 GLM-4' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'kimi', name: 'Kimi' },
  { id: 'openrouter', name: 'OpenRouter' },
];

// ==================== 主组件 ====================

export function AIAgentChat() {
  const [mode, setMode] = useState<ChatMode>('chat');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 模型选择 - 从localStorage恢复上次成功使用的模型
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('lastSuccessfulModel') || 'openai';
  });

  const [executionState, setExecutionState] = useState<ExecutionState>({ status: 'idle' });

  // Terminal state
  const [terminalLines, setTerminalLines] = useState<{ type: string; content: string }[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);

  // Unified message list - React不可变更新
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);

  // 智能Agent模式状态
  const [agentMode, setAgentMode] = useState<'demand' | 'result' | 'matching' | 'team'>('demand');
  const [agentLoading, setAgentLoading] = useState(false);

  // 文档上传状态
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ text: string; type: string; industries: string[]; techs: string[] } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  const { activeProvider, setActiveProvider } = useApiStore();
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const stats = unifiedSkillService.getStats();

  // Check Claude Code CLI availability
  useEffect(() => {
    isClaudeCodeInstalled().then((available) => {
      setCliAvailable(available);
      addTerminalLine('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addTerminalLine('system', '  Claude Code Terminal  ·  AI Development Assistant');
      addTerminalLine('system', '  OpenClaw Skills: Available | Hermes Agent: Integrated');
      addTerminalLine('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addTerminalLine('info', '  Ready. Type "help" for available commands.');
      addTerminalLine('system', '');
    });
  }, []);

  const addTerminalLine = useCallback((type: string, content: string) => {
    setTerminalLines(prev => [...prev, { type, content }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, terminalLines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  // Add message to unified list - React不可变更新
  const addUnifiedMessage = useCallback((type: UnifiedMessage['type'], content: string) => {
    const newMessage: UnifiedMessage = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Process with Hermes - Hermes作为唯一调度核心
  const processWithHermes = async (userInput: string): Promise<string> => {
    const hermes = getHermesAgent();

    setExecutionState({ status: 'planning', stepDescription: '正在分析需求...' });
    const analysis = await hermes.analyzeDemand(userInput);

    const analysisContent = `🔍 **需求分析**

**关键词**: ${analysis.keywords.join(', ')}
**意图**: ${analysis.intent}
**类别**: ${analysis.category}
**复杂度**: ${analysis.complexity}

**建议工具**: ${analysis.suggestedTools.join(', ')}
**建议技能**: ${analysis.suggestedSkills.join(', ') || '无'}`;

    addUnifiedMessage('hermes-plan', analysisContent);

    setExecutionState({ status: 'planning', stepDescription: '正在制定执行计划...' });
    const plan = await hermes.createPlan(userInput, { analysis });

    const planSteps = plan.map((step, i) =>
      `${i + 1}. **${step.action}**
   工具: ${step.tool || 'AI分析'}
   技能: ${step.skillId || '无'}
   说明: ${step.description}`
    ).join('\n\n');

    const planContent = `📋 **执行计划**\n\n${planSteps}`;
    addUnifiedMessage('hermes-plan', planContent);

    setExecutionState({ status: 'executing', stepDescription: '开始执行计划...' });

    // Hermes执行计划 - 所有工具由Hermes统一调度
    const results = await hermes.executePlan();

    const resultDetails = plan.map((step, i) => {
      const stepResult = results.results[step.step];
      return `${i + 1}. **${step.action}** - ${stepResult?.success ? '✅ 完成' : '❌ 失败'}
   ${stepResult?.output || stepResult?.error || ''}`;
    }).join('\n\n');

    const resultContent = `🎯 **执行结果**\n\n${resultDetails}\n\n---\n\n${results.success ? '✅ 所有任务执行成功！' : '⚠️ 部分任务执行遇到问题，请检查上述结果。'}`;
    addUnifiedMessage('hermes-result', resultContent);

    setExecutionState({ status: 'completed', result: results.summary });
    return results.summary;
  };

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading || agentLoading) return;

    if (mode === 'hermes') {
      addUnifiedMessage('user', input);
      await handleHermesTask(input);
    } else if (mode === 'chat') {
      addUnifiedMessage('user', input);
      await handleAIChat(input);
    } else if (mode === 'smart-agent') {
      await handleSmartAgentTask(input);
    }

    setInput('');
    // 重置textarea高度
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  // AI Chat handler
  const handleAIChat = async (userInput: string) => {
    setIsLoading(true);

    try {
      if (selectedModel !== activeProvider) {
        setActiveProvider(selectedModel as typeof activeProvider);
      }

      const skillPrompt = unifiedSkillService.generateSkillContext();
      const recommendedSkills = unifiedSkillService.recommendSkills(userInput, 1);

      let systemPrompt = `你是技术经理人的AI助手，可以帮助分析技术需求、技术成果，提供创新建议，促成技术对接。用专业但易懂的语言回答。${skillPrompt}`;

      if (recommendedSkills[0]) {
        const matchedSkill = recommendedSkills[0].skill;
        systemPrompt += `\n\n用户可能想使用技能: ${matchedSkill.name} - ${matchedSkill.description}`;
      }

      const response = await apiGateway.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
      });

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || '抱歉，我暂时无法回答这个问题。';
      addUnifiedMessage('ai', assistantContent);

      // 成功调用后保存模型到localStorage
      localStorage.setItem('lastSuccessfulModel', selectedModel);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      addUnifiedMessage('system', `❌ 错误: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Hermes task handler - Hermes作为唯一调度核心
  const handleHermesTask = async (taskDescription: string) => {
    if (!taskDescription.trim()) return;

    setIsLoading(true);

    try {
      await processWithHermes(taskDescription);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error || '未知错误');
      addUnifiedMessage('system', `❌ Hermes执行失败\n\n错误原因: ${errorMessage}`);
      setExecutionState({ status: 'failed', result: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // 智能Agent模式任务处理
  // ============================================

  /**
   * 处理智能Agent任务 - 一键调用AI完成所有分析
   */
  const handleSmartAgentTask = async (taskDescription: string) => {
    if (!taskDescription.trim()) return;

    setAgentLoading(true);
    addUnifiedMessage('user', taskDescription);

    try {
      const techMatch = getTechMatchAgent();
      const skillsService = getHermesSkillsService();

      // 根据模式执行不同的分析
      let result = '';

      switch (agentMode) {
        case 'demand':
          // 技术需求分析
          result = await executeSmartDemandAnalysis(techMatch, taskDescription, skillsService);
          break;
        case 'result':
          // 技术成果分析
          result = await executeSmartResultAnalysis(techMatch, taskDescription);
          break;
        case 'matching':
          // 需求-成果智能匹配
          result = await executeSmartMatching(techMatch, taskDescription);
          break;
        case 'team':
          // 团队匹配
          result = await executeSmartTeamMatching(techMatch, taskDescription);
          break;
        default:
          result = '未知的分析模式';
      }

      addUnifiedMessage('tech-result', result);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error || '未知错误');
      addUnifiedMessage('system', `❌ 智能分析失败\n\n错误原因: ${errorMessage}`);
    } finally {
      setAgentLoading(false);
    }
  };

  /**
   * 智能需求分析 - 调用TechMatchAgent + HermesSkills
   */
  const executeSmartDemandAnalysis = async (
    techMatch: ReturnType<typeof getTechMatchAgent>,
    taskDescription: string,
    skillsService: ReturnType<typeof getHermesSkillsService>
  ): Promise<string> => {
    // 使用Hermes Skills进行增强分析
    const demandSkill = skillsService.getSkillByName('tech-demand-analysis');

    // 调用TechMatchAgent进行分析
    const analysis = await techMatch.analyzeDemand(taskDescription);

    // 如果有Hermes Skill指导，使用AI进一步增强
    if (demandSkill?.content) {
      const enhancePrompt = `你是一个技术需求分析专家。请基于以下分析结果和技能指导，进一步完善分析。

原始需求: ${taskDescription}

初步分析:
${analysis.report}

技能指导:
${demandSkill.content}

请提供更深入的分析和改进建议。`;

      const enhancedResult = await claudeChat(enhancePrompt);
      if (enhancedResult.success && enhancedResult.output) {
        return enhancedResult.output;
      }
    }

    return analysis.report;
  };

  /**
   * 智能成果分析
   */
  const executeSmartResultAnalysis = async (techMatch: ReturnType<typeof getTechMatchAgent>, taskDescription: string): Promise<string> => {
    const analysis = await techMatch.analyzeTechResult(taskDescription);
    return analysis.report;
  };

  /**
   * 智能双向匹配
   */
  const executeSmartMatching = async (techMatch: ReturnType<typeof getTechMatchAgent>, taskDescription: string): Promise<string> => {
    // 智能识别是需求还是成果
    const isDemand = taskDescription.match(/需要|寻求|希望|要求|开发|解决/);
    const isResult = taskDescription.match(/成果|技术|专利|方案|产品|研发/);

    if (isDemand && !isResult) {
      // 假设是需求，搜索相关成果
      const searchResult = await techMatch.performMatching(taskDescription, undefined);
      return searchResult.report;
    } else if (isResult && !isDemand) {
      // 假设是成果，搜索相关需求
      const searchResult = await techMatch.performMatching(undefined, taskDescription);
      return searchResult.report;
    } else {
      // 混合内容，让AI判断
      const searchResult = await techMatch.performMatching(taskDescription, undefined);
      return searchResult.report;
    }
  };

  /**
   * 智能团队匹配
   */
  const executeSmartTeamMatching = async (techMatch: ReturnType<typeof getTechMatchAgent>, taskDescription: string): Promise<string> => {
    const matchResult = await techMatch.matchTeam(taskDescription);
    return matchResult.report;
  };

  // Claude Chat handler
  const handleClaudeChat = async (message: string): Promise<ClaudeCodeResponse> => {
    if (cliAvailable) {
      return await claudeChat(message);
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          output: `Simulated response to: ${message}\n\nClaude Code CLI would execute this in full integration mode.`
        });
      }, 1000);
    });
  };

  const terminalCommands = [
    {
      name: 'chat',
      description: '与 AI 对话',
      execute: async (args: string[]) => {
        if (args.length === 0) {
          addTerminalLine('info', '  Usage: chat <message>');
          return;
        }
        const message = args.join(' ');
        addTerminalLine('info', `  ◌ ${message}`);
        const result = await handleClaudeChat(message);
        if (result.success && result.output) {
          addTerminalLine('success', '  ✓ Response received');
          result.output.split('\n').forEach((line) => addTerminalLine('output', `  ${line}`));
        } else {
          addTerminalLine('error', `  ✗ Error: ${result.error || 'Unknown error'}`);
        }
      },
    },
    {
      name: 'plan',
      description: 'Hermes任务规划',
      execute: async (args: string[]) => {
        const task = args.join(' ') || '帮我分析一个技术需求';
        addTerminalLine('info', `  🤖 启动Hermes任务规划: ${task}`);
        setMode('hermes');
        await handleHermesTask(task);
      },
    },
    {
      name: 'skills',
      description: '查看可用技能',
      execute: async () => {
        const skills = unifiedSkillService.getStats();
        addTerminalLine('system', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        addTerminalLine('system', `  技能库统计`);
        addTerminalLine('system', `  内置技能: ${skills.native} 个`);
        addTerminalLine('system', `  自定义技能: ${skills.custom} 个`);
        addTerminalLine('system', `  OpenClaw技能: ${skills.openclaw} 个`);
        addTerminalLine('system', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      },
    },
    {
      name: 'clear',
      description: '清空终端',
      execute: async () => {
        setTerminalLines([]);
      },
    },
    {
      name: 'help',
      description: '帮助',
      execute: async () => {
        addTerminalLine('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addTerminalLine('system', '  Commands: chat <msg>, plan <task>, skills, clear, help');
        addTerminalLine('system', `  Claude Code CLI: ${cliAvailable ? 'Connected' : 'Simulation Mode'}`);
        addTerminalLine('system', `  Hermes Agent: Active | Skills: ${stats.total} total`);
        addTerminalLine('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      },
    },
  ];

  const handleTerminalCommand = async (cmdInput: string) => {
    const trimmed = cmdInput.trim();
    if (!trimmed) return;

    addTerminalLine('input', `❯ ${trimmed}`);
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setTerminalInput('');

    if (trimmed.startsWith('chat ')) {
      const message = trimmed.substring(5);
      const result = await handleClaudeChat(message);
      if (result.success && result.output) {
        addTerminalLine('success', '  ✓ Response received');
        result.output.split('\n').forEach((line) => addTerminalLine('output', `  ${line}`));
      } else {
        addTerminalLine('error', `  ✗ ${result.error || 'Failed'}`);
      }
      return;
    }

    const parts = trimmed.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const cmd = terminalCommands.find(c => c.name === cmdName);

    if (cmd) {
      setIsLoading(true);
      try {
        await cmd.execute(args);
      } finally {
        setIsLoading(false);
      }
    } else {
      addTerminalLine('error', `  ✗ Unknown command: ${cmdName}`);
      addTerminalLine('info', '  Type "help" for available commands');
    }
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTerminalCommand(terminalInput);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setTerminalInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setTerminalInput('');
        } else {
          setHistoryIndex(newIndex);
          setTerminalInput(commandHistory[newIndex]);
        }
      }
    }
  };

  /**
   * 键盘事件处理 - 严格区分Shift+Enter（换行）和Enter（发送）
   * - Enter: 发送消息
   * - Shift+Enter: 允许换行（textarea默认行为）
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter: 不阻止默认行为，允许换行
  };

  /**
   * textarea高度自动调整
   */
  const adjustTextareaHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Quick action buttons for Hermes
  const handleQuickAction = (action: string) => {
    switch (action) {
      case '智能规划':
        handleHermesTask(input || '帮我分析一个技术需求');
        break;
      case '深度研究':
        handleHermesTask('进行深度研究');
        break;
      case 'Claude Code':
        handleHermesTask('生成代码并执行');
        break;
    }
  };

  // Skills shortcut buttons
  const handleSkillsAction = (skillName: string) => {
    const skillStats = unifiedSkillService.getStats();
    addUnifiedMessage('system', `📦 技能库: ${skillName}\n\n内置技能: ${skillStats.native} | 自定义技能: ${skillStats.custom} | OpenClaw: ${skillStats.openclaw}`);
    handleHermesTask(`请使用${skillName}技能处理当前需求`);
  };

  // 文档上传处理
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const validTypes = ['.docx', '.pdf'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      addUnifiedMessage('system', `❌ 不支持的文件格式，仅支持 ${validTypes.join(', ')}`);
      return;
    }

    setDocumentFile(file);
    setDocumentLoading(true);
    setDocumentPreview(null);

    try {
      const parsed = await parseDocument(file);
      const contentType = detectContentType(parsed.text);
      const industries = extractIndustryTags(parsed.text);
      const techs = extractTechTags(parsed.text);

      setDocumentPreview({
        text: parsed.text.slice(0, 500) + (parsed.text.length > 500 ? '...' : ''),
        type: contentType === 'demand' ? '技术需求' : contentType === 'result' ? '技术成果' : '未确定类型',
        industries,
        techs,
      });

      addUnifiedMessage('system',
        `📄 文档已解析: ${file.name}\n` +
        `类型: ${contentType === 'demand' ? '技术需求' : contentType === 'result' ? '技术成果' : '待定'}\n` +
        `行业标签: ${industries.join(', ') || '未识别'}\n` +
        `技术领域: ${techs.join(', ') || '未识别'}\n\n` +
        `内容预览: ${parsed.text.slice(0, 200)}...`
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '解析失败';
      addUnifiedMessage('system', `❌ 文档解析失败: ${errorMsg}`);
      setDocumentFile(null);
    } finally {
      setDocumentLoading(false);
    }
  };

  // 清除上传的文档
  const clearDocument = () => {
    setDocumentFile(null);
    setDocumentPreview(null);
  };

  return (
    <div
      className="ai-chat-container flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      {/* 顶部标题栏 */}
      <div
        className="chat-header flex items-center px-4 py-3 gap-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}
      >
        {/* 标题和模型选择器 */}
        <div className="flex items-center gap-3">
          <span className="text-xl">🤖</span>
          <span className="text-lg font-semibold" style={{ color: themeColors?.text }}>AI对话</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: themeColors?.surface,
              color: themeColors?.text,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            {modelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 统一的对话内容区域 */}
      <div className="chat-content flex-1 overflow-hidden">
        {/* Chat / Hermes Mode */}
        {(mode === 'chat' || mode === 'hermes') && (
          <div
            className="message-list h-full overflow-y-auto p-4 space-y-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${themeColors?.border} transparent` }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                {/* 动画图标容器 */}
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-ai-purple) 100%)' }}>
                    {mode === 'chat' ? (
                      <Bot size={40} className="text-white" strokeWidth={1.5} />
                    ) : (
                      <Sparkles size={40} className="text-white" strokeWidth={1.5} />
                    )}
                  </div>
                  {/* 背景光晕 */}
                  <div className="absolute inset-0 w-24 h-24 rounded-full animate-ping opacity-20"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-ai-purple) 100%)' }} />
                </div>

                {/* 标题 */}
                <h2 className="text-xl font-semibold mb-3" style={{ color: themeColors?.text }}>
                  {mode === 'chat' ? '您好，我是技术经理人AI助手' : 'Hermes 任务规划模式'}
                </h2>

                {/* 描述 */}
                <p className="text-sm mb-8 max-w-md" style={{ color: themeColors?.textSecondary }}>
                  {mode === 'chat'
                    ? '可以帮您分析技术需求、技术成果，提供创新建议，促成技术对接'
                    : '自动调度 Claude Code、OpenClaw技能和内置技能完成任务规划'}
                </p>

                {/* 快捷功能入口 */}
                {mode === 'chat' && (
                  <div className="flex flex-wrap gap-3 justify-center max-w-lg">
                    <button
                      onClick={() => setInput('帮我分析一个技术需求')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:scale-105"
                      style={{
                        backgroundColor: themeColors?.surface,
                        border: `1px solid ${themeColors?.border}`,
                        color: themeColors?.textSecondary
                      }}
                    >
                      <Lightbulb size={16} style={{ color: 'var(--color-primary)' }} />
                      技术需求分析
                    </button>
                    <button
                      onClick={() => setInput('上传技术成果有什么流程？')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:scale-105"
                      style={{
                        backgroundColor: themeColors?.surface,
                        border: `1px solid ${themeColors?.border}`,
                        color: themeColors?.textSecondary
                      }}
                    >
                      <FileText size={16} style={{ color: 'var(--color-ai-purple)' }} />
                      成果上传咨询
                    </button>
                    <button
                      onClick={() => setInput('智能匹配能做什么？')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all hover:scale-105"
                      style={{
                        backgroundColor: themeColors?.surface,
                        border: `1px solid ${themeColors?.border}`,
                        color: themeColors?.textSecondary
                      }}
                    >
                      <Zap size={16} style={{ color: 'var(--color-warning)' }} />
                      智能匹配介绍
                    </button>
                  </div>
                )}

                {mode === 'hermes' && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm" style={{ color: themeColors?.primary }}>
                      <Sparkles size={14} className="inline mr-1" />
                      输入任务描述，点击下方按钮启动任务规划
                    </p>
                    <div className="flex gap-3 mt-2">
                      <div className="flex items-center gap-1 text-xs" style={{ color: themeColors?.textHint }}>
                        <Code size={12} /> Claude Code
                      </div>
                      <div className="flex items-center gap-1 text-xs" style={{ color: themeColors?.textHint }}>
                        <Zap size={12} /> OpenClaw
                      </div>
                      <div className="flex items-center gap-1 text-xs" style={{ color: themeColors?.textHint }}>
                        <Bot size={12} /> 内置技能
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} themeColors={themeColors} />
            ))}

            {isLoading && (
              <div className="ai-message animate-pulse">
                <div className="flex flex-col gap-2">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-4 w-36 rounded" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* ============================================ */}
        {/* 智能Agent模式 - Smart Agent Mode */}
        {/* ============================================ */}
        {mode === 'smart-agent' && (
          <div className="h-full flex flex-col">
            {/* 模式选择标签 */}
            <div className="agent-mode-tabs px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}>
              <div className="flex items-center gap-2 overflow-x-auto">
                {[
                  { id: 'demand' as const, label: '🔍 需求分析', icon: Target, desc: '深度分析技术需求' },
                  { id: 'result' as const, label: '🔬 成果分析', icon: Cpu, desc: '评估技术成果价值' },
                  { id: 'matching' as const, label: '🤝 智能匹配', icon: GitBranch, desc: '需求-成果双向匹配' },
                  { id: 'team' as const, label: '👥 团队匹配', icon: Users, desc: '匹配合适团队' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAgentMode(tab.id)}
                    className="px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all flex items-center gap-2"
                    style={{
                      backgroundColor: agentMode === tab.id ? themeColors?.primary : themeColors?.surface,
                      color: agentMode === tab.id ? '#fff' : themeColors?.textSecondary,
                      border: `1px solid ${agentMode === tab.id ? themeColors?.primary : themeColors?.border}`,
                    }}
                  >
                    <tab.icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* 模式说明 */}
              <div className="mt-2 text-xs" style={{ color: themeColors?.textHint }}>
                {agentMode === 'demand' && '🔍 技术需求分析 - 深度分析需求背景、目标、可行性和实现路径'}
                {agentMode === 'result' && '🔬 技术成果分析 - 评估创新性、成熟度、市场价值和转化建议'}
                {agentMode === 'matching' && '🤝 智能双向匹配 - 在技术成果和技术需求之间进行智能匹配'}
                {agentMode === 'team' && '👥 团队智能匹配 - 根据需求匹配合适的技术团队或专家'}
              </div>
            </div>

            {/* 消息列表 */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ scrollbarWidth: 'thin' }}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  {/* 动画图标 */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                      {agentMode === 'demand' && <Target size={36} className="text-white" strokeWidth={1.5} />}
                      {agentMode === 'result' && <Cpu size={36} className="text-white" strokeWidth={1.5} />}
                      {agentMode === 'matching' && <GitBranch size={36} className="text-white" strokeWidth={1.5} />}
                      {agentMode === 'team' && <Users size={36} className="text-white" strokeWidth={1.5} />}
                    </div>
                  </div>

                  <h2 className="text-lg font-semibold mb-2" style={{ color: themeColors?.text }}>
                    智能Agent - {agentMode === 'demand' ? '技术需求分析' : agentMode === 'result' ? '技术成果分析' : agentMode === 'matching' ? '智能双向匹配' : '团队匹配'}
                  </h2>
                  <p className="text-sm mb-6 max-w-md" style={{ color: themeColors?.textSecondary }}>
                    {agentMode === 'demand' && '输入技术需求描述，AI将自动进行深度分析，包括背景、目标、可行性评估'}
                    {agentMode === 'result' && '输入技术成果信息，AI将评估其创新性、成熟度和市场价值'}
                    {agentMode === 'matching' && '输入需求或成果描述，AI将进行智能双向匹配分析'}
                    {agentMode === 'team' && '输入技术需求，AI将匹配合适的技术团队或专家'}
                  </p>
                  {/* 快捷示例 */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {agentMode === 'demand' && [
                      '需要开发一个基于深度学习的图像识别系统',
                      '寻求工业机器人视觉引导方案',
                      '希望建立智能仓储管理系统',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="tech-quick-btn"
                      >
                        {q}
                      </button>
                    ))}
                    {agentMode === 'result' && [
                      '研发了一种新型石墨烯电池材料',
                      '开发了自主导航的巡检机器人',
                      '申请了多项人工智能算法专利',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="tech-quick-btn"
                      >
                        {q}
                      </button>
                    ))}
                    {agentMode === 'matching' && [
                      '需要：工业视觉检测方案',
                      '成果：高性能图像识别算法',
                      '技术对接：智能制造领域',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="tech-quick-btn"
                      >
                        {q}
                      </button>
                    ))}
                    {agentMode === 'team' && [
                      '需要：机器学习算法研发团队',
                      '寻求：有自动驾驶经验的团队',
                      '希望：物联网解决方案团队',
                    ].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="tech-quick-btn"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} themeColors={themeColors} />
              ))}

              {agentLoading && (
                <div className="ai-message animate-pulse">
                  <div className="flex flex-col gap-2">
                    <div className="skeleton h-4 w-48 rounded" />
                    <div className="skeleton h-4 w-36 rounded" />
                    <div className="text-xs mt-2" style={{ color: themeColors?.textHint }}>
                      🤖 智能Agent分析中...
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Terminal Mode */}
        {mode === 'terminal' && (
          <div className="h-full flex flex-col" style={{ backgroundColor: '#0d1117' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs ml-2" style={{ color: '#8b949e' }}>zsh — claude-terminal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#484f58' }}>{cliAvailable ? 'CLI Connected' : 'Simulation'}</span>
                <button
                  onClick={() => setTerminalLines([])}
                  className="px-2 py-1 rounded text-xs"
                  style={{ backgroundColor: '#30363d', color: '#8b949e' }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div
              className="flex-1 p-4 overflow-y-auto font-mono text-sm"
              onClick={() => terminalInputRef.current?.focus()}
            >
              {terminalLines.map((line, idx) => (
                <div key={idx} className="mb-1 whitespace-pre-wrap" style={{
                  color: line.type === 'error' ? '#f85149' :
                    line.type === 'success' ? '#3fb950' :
                      line.type === 'system' ? '#8b949e' :
                        line.type === 'info' ? '#58a6ff' :
                          line.type === 'input' ? '#e6edf3' : '#c9d1d9'
                }}>
                  {line.content}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Hermes执行状态 */}
      {mode === 'hermes' && executionState.status !== 'idle' && (
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}
        >
          <div className="flex items-center gap-3">
            {executionState.status === 'planning' && (
              <>
                <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${themeColors?.primary} transparent transparent transparent` }} />
                <span className="text-sm font-medium" style={{ color: themeColors?.primary }}>规划中...</span>
              </>
            )}
            {executionState.status === 'executing' && (
              <>
                <div className="w-4 h-4 rounded-full animate-pulse" style={{ backgroundColor: themeColors?.primary }} />
                <span className="text-sm font-medium" style={{ color: themeColors?.primary }}>执行中...</span>
              </>
            )}
            {executionState.status === 'completed' && (
              <>
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium" style={{ color: themeColors?.success }}>执行完成</span>
              </>
            )}
            {executionState.status === 'failed' && (
              <>
                <span className="text-lg">❌</span>
                <span className="text-sm font-medium" style={{ color: themeColors?.error }}>执行失败</span>
              </>
            )}
            {executionState.stepDescription && (
              <span className="text-xs" style={{ color: themeColors?.textHint }}>{executionState.stepDescription}</span>
            )}
          </div>
        </div>
      )}

      {/* 统一的输入区域 */}
      <div
        className="chat-input-area p-4 flex-shrink-0"
        style={{ borderTop: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}
      >
        {/* Hermes快捷按钮 */}
        {mode === 'hermes' && (
          <div className="hermes-btns">
            <button
              onClick={() => handleQuickAction('智能规划')}
              disabled={isLoading}
              className="hermes-btn"
            >
              🎯 智能规划
            </button>
            <button
              onClick={() => handleQuickAction('深度研究')}
              disabled={isLoading}
              className="hermes-btn"
              style={{ backgroundColor: '#9333EA', color: '#fff', border: 'none' }}
            >
              🔬 深度研究
            </button>
            <button
              onClick={() => handleQuickAction('Claude Code')}
              disabled={isLoading}
              className="hermes-btn"
              style={{ backgroundColor: '#9333EA', color: '#fff', border: 'none' }}
            >
              💻 Claude Code
            </button>
          </div>
        )}

        {/* 技能库快捷按钮 - Chat模式 */}
        {mode === 'chat' && (
          <div className="skills-btns">
            <button
              onClick={() => handleSkillsAction('代码审查')}
              disabled={isLoading}
              className="skills-btn"
            >
              🔍 代码审查
            </button>
            <button
              onClick={() => handleSkillsAction('需求分析')}
              disabled={isLoading}
              className="skills-btn"
            >
              📋 需求分析
            </button>
            <button
              onClick={() => handleSkillsAction('方案生成')}
              disabled={isLoading}
              className="skills-btn"
            >
              💡 方案生成
            </button>
            <button
              onClick={() => handleSkillsAction('联网搜索')}
              disabled={isLoading}
              className="skills-btn"
            >
              🌐 联网搜索
            </button>
          </div>
        )}

        {/* 模式切换Tab */}
        <div className="flex items-center gap-1 mt-3 px-1">
          {[
            { id: 'chat' as ChatMode, label: '💬 AI对话' },
            { id: 'hermes' as ChatMode, label: '✨ Hermes' },
            { id: 'smart-agent' as ChatMode, label: '🤖 智能Agent' },
            { id: 'terminal' as ChatMode, label: '💻 Claude终端' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className="mode-tab px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: mode === tab.id ? themeColors?.primary : 'transparent',
                color: mode === tab.id ? '#fff' : themeColors?.textSecondary,
                border: `1px solid ${mode === tab.id ? themeColors?.primary : themeColors?.border}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 输入框和发送按钮 */}
        <div className="flex gap-3 mt-3">
          {mode === 'terminal' ? (
            <input
              ref={terminalInputRef}
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={handleTerminalKeyDown}
              disabled={isLoading}
              className="chat-input flex-1"
              style={{
                backgroundColor: '#0d1117',
                color: '#e0e0e0',
                border: '1px solid #30363d',
              }}
              placeholder={isLoading ? 'Processing...' : 'Type a command...'}
            />
          ) : (
            <>
              {/* 文档上传按钮 */}
              <label
                className="flex items-center justify-center px-3 rounded-lg cursor-pointer transition-all hover:scale-105"
                style={{
                  backgroundColor: documentFile ? themeColors?.success + '20' : themeColors?.surface,
                  border: `1px solid ${documentFile ? themeColors?.success : themeColors?.border}`,
                  color: documentFile ? themeColors?.success : themeColors?.textSecondary,
                }}
                title="上传WORD/PDF文档，智能识别内容"
              >
                {documentLoading ? (
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${themeColors?.primary} transparent transparent transparent` }} />
                ) : documentFile ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Upload size={18} />
                )}
                <input
                  type="file"
                  accept=".docx,.pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>

              {/* 已上传文档预览 */}
              {documentFile && documentPreview && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{
                    backgroundColor: themeColors?.success + '15',
                    border: `1px solid ${themeColors?.success}`,
                    color: themeColors?.text,
                  }}
                >
                  <File size={14} style={{ color: themeColors?.success }} />
                  <span className="truncate max-w-32">{documentFile.name}</span>
                  <span style={{ color: themeColors?.textSecondary }}>({documentPreview.type})</span>
                  <button
                    onClick={clearDocument}
                    className="ml-1 p-0.5 rounded hover:bg-black/10"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextareaHeight(e); }}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'hermes'
                  ? '输入任务描述，按 Enter 发送，Shift+Enter 换行...'
                  : mode === 'smart-agent'
                  ? '输入需求/成果描述，AI一键分析...'
                  : '输入问题，按 Enter 发送，Shift+Enter 换行...'
              }
              className="chat-input flex-1"
              rows={4}
                style={{
                  minHeight: '80px',
                  maxHeight: '160px',
                  height: '80px',
                  resize: 'vertical',
                  overflowY: 'auto',
                }}
              />
            </>
          )}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || agentLoading}
            className="send-btn"
            style={{
              backgroundColor: mode === 'smart-agent' ? '#9333EA' : themeColors?.primary,
            }}
          >
            {agentLoading ? '分析中...' : '发送'}
          </button>
        </div>

        {/* 提示信息 */}
        <div className="mt-2 text-xs text-center" style={{ color: themeColors?.textHint }}>
          {mode === 'chat' && 'AI 助手可能会产生不准确的信息，请以实际验证为准'}
          {mode === 'hermes' && 'Hermes会自动分析需求、制定计划并调用Claude Code/OpenClaw/内置技能执行'}
          {mode === 'smart-agent' && '智能Agent融合hermes-agent技能系统，一键完成需求/成果/团队分析'}
          {mode === 'terminal' && 'chat <msg> · plan <task> · skills · help · ↑↓ history'}
        </div>
      </div>
    </div>
  );
}

export function TerminalPanel() {
  return <AIAgentChat />;
}

export default AIAgentChat;
