/**
 * 统一AI对话容器 v1.1.0
 * 整合 AI对话、Hermes任务规划、Claude终端 三大功能
 * Hermes-Agent作为唯一调度核心，Claude/OpenClaw/Skills均由其统筹
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamChat } from '@/services/api/gateway';
import { useApiStore } from '@/store/apiStore';
import { PROVIDER_META, type Provider } from '@/config/providers';
import { useThemeColors } from '@/store/themeStore';
import { v4 as uuidv4 } from 'uuid';
import { claudeChat, isClaudeCodeInstalled, type ClaudeCodeResponse } from '@/services/claudeCode';
import { getHermesAgent } from '@/services/hermes/HermesAgent';
import { getHermesSkillsService } from '@/services/hermes/HermesSkillsService';
import type { TechMatchAgent } from '@/services/hermes/TechMatchAgent';
import { unifiedSkillService } from '@/services/skills/UnifiedSkillService';
import { getIntentClassifier } from '@/services/hermes/IntentClassifier';
import { getSkillExecutionBridge } from '@/services/hermes/SkillExecutionBridge';
import { skillInjector } from '@/services/skills/SkillInjector';
import { scientificSkillService } from '@/services/skills/scientificSkills';
import { selectTier } from '@/services/hermes/AgentTier';
import { hermesSessionMemory } from '@/services/hermes/SessionMemory';
import {
  Bot, Sparkles, Zap, Lightbulb,
  Code, Upload, File, X, CheckCircle2,
  Target, Users, GitBranch, Cpu, SendHorizontal, Trash2,
  Search, ClipboardCheck, Handshake, ChevronRight, SlidersHorizontal
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

const providerOptions = Object.values(PROVIDER_META);

const modeOptions: Array<{ id: ChatMode; name: string }> = [
  { id: 'chat', name: 'AI 对话' },
  { id: 'hermes', name: 'Hermes 任务' },
  { id: 'smart-agent', name: '智能分析' },
  { id: 'terminal', name: 'Claude 终端' },
];

const starterPrompts = [
  {
    title: '帮我分析一项技术需求',
    description: '梳理应用场景、目标与关键技术难点',
    prompt: '请帮我分析一项技术需求，包括应用场景、目标、技术难点和可行路径。',
    icon: ClipboardCheck,
  },
  {
    title: '根据需求匹配技术成果',
    description: '生成匹配维度与成果对接建议',
    prompt: '请根据我的技术需求匹配合适的技术成果，并说明匹配依据和对接建议。',
    icon: Handshake,
  },
  {
    title: '评估科技成果的转化价值',
    description: '判断成熟度、应用方向与转化风险',
    prompt: '请评估一项科技成果的转化价值，包括成熟度、应用方向、市场潜力和主要风险。',
    icon: Lightbulb,
  },
] as const;

// ==================== 主组件 ====================

export function AIAgentChat() {
  const sessionIdRef = useRef(getHermesAgent().getSessionId());
  const [mode, setMode] = useState<ChatMode>('chat');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 模型选择 - 从localStorage恢复上次成功使用的模型
  const [selectedModel, setSelectedModel] = useState<Provider>(() => {
    const storedProvider = localStorage.getItem('lastSuccessfulModel');
    return storedProvider && storedProvider in PROVIDER_META ? storedProvider as Provider : 'openai';
  });

  const [executionState, setExecutionState] = useState<ExecutionState>({ status: 'idle' });

  // Terminal state
  const [terminalLines, setTerminalLines] = useState<{ type: string; content: string }[]>([]);
  const [terminalInput, setTerminalInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);

  // Unified message list - React不可变更新
  const [messages, setMessages] = useState<UnifiedMessage[]>(() => {
    const saved = hermesSessionMemory.getSession(sessionIdRef.current);
    return (saved?.messages || []).filter(message => (
      ['user', 'ai', 'hermes-plan', 'hermes-result', 'terminal', 'system', 'tech-result']
        .includes(message.type)
    )) as UnifiedMessage[];
  });

  // 智能Agent模式状态
  const [agentMode, setAgentMode] = useState<'demand' | 'result' | 'matching' | 'team'>('demand');
  const [agentLoading, setAgentLoading] = useState(false);

  // 文档上传状态
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentPreview, setDocumentPreview] = useState<{ text: string; type: string; industries: string[]; techs: string[] } | null>(null);

  // 主动技能推荐状态
  const [suggestedSkill, setSuggestedSkill] = useState<{
    name: string;
    description: string;
    source: 'scientific' | 'general';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);

  const { activeProvider, setActiveProvider } = useApiStore();
  const themeColors = useThemeColors();

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

  // 主动技能推荐（输入时防抖检测）
  useEffect(() => {
    if (mode !== 'chat' || input.length < 5) {
      setSuggestedSkill(null);
      return;
    }
    const timer = setTimeout(() => {
      const scientificRecommended = scientificSkillService.recommendSkills(input, 'chat', 1);
      if (scientificRecommended.length > 0) {
        setSuggestedSkill({
          name: scientificRecommended[0].name,
          description: scientificRecommended[0].description,
          source: 'scientific',
        });
        return;
      }
      const recommended = unifiedSkillService.recommendSkills(input, 1);
      if (recommended.length > 0 && recommended[0].matchScore >= 30) {
        setSuggestedSkill({
          name: recommended[0].skill.name,
          description: recommended[0].skill.description,
          source: 'general',
        });
      } else {
        setSuggestedSkill(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [input, mode]);

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
    hermesSessionMemory.saveSession(sessionIdRef.current, messages);
  }, [messages]);

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
    return newMessage.id;
  }, []);

  // 流式追加：先插入空消息，再按 chunk 累加 content
  const appendUnifiedMessage = useCallback((initialContent: string): string => {
    const id = uuidv4();
    setMessages(prev => [...prev, {
      id,
      type: 'ai',
      content: initialContent,
      timestamp: new Date().toISOString(),
    }]);
    return id;
  }, []);

  const patchUnifiedMessage = useCallback((id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  }, []);

  const clearConversation = useCallback(() => {
    hermesSessionMemory.clearSession(sessionIdRef.current);
    setMessages([]);
    const hermes = getHermesAgent();
    hermes.reset();
    sessionIdRef.current = hermes.getSessionId();
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

    // 拼接文档内容到用户消息
    let fullInput = input;
    if (documentPreview) {
      fullInput = `${input}\n\n---\n📎 附件内容（${documentPreview.type}）：\n${documentPreview.text.slice(0, 3000)}`;
    }

    if (mode === 'hermes') {
      addUnifiedMessage('user', fullInput);
      await handleHermesTask(fullInput);
    } else if (mode === 'chat') {
      addUnifiedMessage('user', fullInput);
      // 智能意图分类 + 层级路由（仅 Chat 模式）
      try {
        const classifier = getIntentClassifier();
        const classification = await classifier.classify(fullInput);

        if (classification.intent !== 'simple-chat' && classification.confidence >= 0.7) {
          // 根据意图选择 Agent 层级
          const tier = selectTier(classification.intent);

          if (tier === 'reasoning' || tier === 'worker') {
            // 使用 ToolLoop 执行复杂任务
            setIsLoading(true);
            const hermes = getHermesAgent();
            const result = await hermes.executeWithTier(fullInput, tier);
            if (result.success && result.finalOutput) {
              const toolInfo = result.toolCalls.length > 0
                ? `\n\n<details><summary>调用了 ${result.iterations} 个工具</summary>${result.toolCalls.map(t => `\n- ${t.toolId}`).join('')}</details>`
                : '';
              addUnifiedMessage('ai', result.finalOutput + toolInfo);
              setInput('');
              setDocumentFile(null);
              setDocumentPreview(null);
              if (inputRef.current) {
                inputRef.current.style.height = 'auto';
              }
              setIsLoading(false);
              return;
            }
            setIsLoading(false);
          }

          // 降级：尝试直接桥接执行
          const bridge = getSkillExecutionBridge();
          const bridgeResult = await bridge.execute(classification, fullInput);

          if (bridgeResult && bridgeResult.success) {
            const sourceLabel = bridgeResult.source === 'skill' ? '🔧 技能'
              : bridgeResult.source === 'tool' ? '⚡ 工具'
              : '📊 分析';
            addUnifiedMessage('ai', `${sourceLabel} [${bridgeResult.skillOrToolName}]\n\n${bridgeResult.output}`);
            setInput('');
            setDocumentFile(null);
            setDocumentPreview(null);
            if (inputRef.current) {
              inputRef.current.style.height = 'auto';
            }
            return;
          }
        }
      } catch {
        // 意图分类失败，降级到普通对话
      }
      await handleAIChat(fullInput);
    } else if (mode === 'smart-agent') {
      await handleSmartAgentTask(fullInput);
    }

    setInput('');
    setDocumentFile(null);
    setDocumentPreview(null);
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
        setActiveProvider(selectedModel);
      }

      // 使用 SkillInjector 进行 3-tier 技能注入（OpenHuman 模式）
      const allSkillItems = unifiedSkillService.getAllSkills();
      const generalSkills = allSkillItems
        .filter((item) => item.source !== 'scientific')
        .map((item) => item.skill);
      const injection = skillInjector.inject(generalSkills, userInput);
      const scientificContext = scientificSkillService.buildContext(userInput, 'chat');

      let systemPrompt = `你是技术经理人的AI助手，可以帮助分析技术需求、技术成果，提供创新建议，促成技术对接。用专业但易懂的语言回答。`;

      if (injection.rendered) {
        systemPrompt += '\n\n' + injection.rendered;
      } else {
        // 降级：当 SkillInjector 无匹配时，保留原有技能上下文
        const skillPrompt = unifiedSkillService.generateSkillContext();
        systemPrompt += '\n\n' + skillPrompt;
      }

      if (scientificContext.rendered) {
        systemPrompt += '\n\n' + scientificContext.rendered;
      }

      // 流式渲染：先插入空消息，逐 chunk 累加
      const streamId = appendUnifiedMessage('');
      let acc = '';
      const recentHistory = messages
        .filter(message => message.type === 'user' || message.type === 'ai')
        .slice(-12)
        .map(message => ({
          role: message.type === 'user' ? 'user' as const : 'assistant' as const,
          content: message.content,
        }));
      const handle = streamChat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
          { role: 'user', content: userInput },
        ],
      });
      try {
        for await (const chunk of handle) {
          acc += chunk;
          patchUnifiedMessage(streamId, acc);
        }
      } finally {
        handle.abort();
      }
      if (!acc) patchUnifiedMessage(streamId, '抱歉，我暂时无法回答这个问题。');

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
      const { getTechMatchAgent } = await import('@/services/hermes/TechMatchAgent');
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
    techMatch: TechMatchAgent,
    taskDescription: string,
    skillsService: ReturnType<typeof getHermesSkillsService>
  ): Promise<string> => {
    // 使用Hermes Skills进行增强分析
    const demandSkill = skillsService.getSkillByName('tech-demand-analysis');
    const scientificContext = scientificSkillService.buildContext(taskDescription, 'demand');

    // 调用TechMatchAgent进行分析
    const analysis = await techMatch.analyzeDemand(taskDescription);

    // 使用 Hermes 与科研技能方法论进一步增强
    if (demandSkill?.content || scientificContext.rendered) {
      const enhancePrompt = `你是一个专业AI技术经理人。请基于以下分析结果和方法论，进一步完善技术需求分析。

原始需求: ${taskDescription}

初步分析:
${analysis.report}

Hermes技能指导:
${demandSkill?.content || '无'}

科学技能方法论:
${scientificContext.rendered || '无'}

请区分事实、推断和待验证假设，提供更深入的技术路线、验证方案、风险与改进建议。`;

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
  const executeSmartResultAnalysis = async (techMatch: TechMatchAgent, taskDescription: string): Promise<string> => {
    const analysis = await techMatch.analyzeTechResult(taskDescription);
    const scientificContext = scientificSkillService.buildContext(taskDescription, 'result');
    if (scientificContext.rendered) {
      const enhancedResult = await claudeChat(`你是一个专业AI技术经理人。请基于初步报告和科学技能方法论，评估成果的创新性、证据质量、技术成熟度、可复制性、应用边界和转化风险。

原始成果:
${taskDescription}

初步报告:
${analysis.report}

科学技能方法论:
${scientificContext.rendered}

请明确区分已有证据、合理推断和仍需验证的结论，并给出下一步验证与转化建议。`);
      if (enhancedResult.success && enhancedResult.output) return enhancedResult.output;
    }
    return analysis.report;
  };

  /**
   * 智能双向匹配
   */
  const executeSmartMatching = async (techMatch: TechMatchAgent, taskDescription: string): Promise<string> => {
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
  const executeSmartTeamMatching = async (techMatch: TechMatchAgent, taskDescription: string): Promise<string> => {
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
        addTerminalLine('system', `  Hermes技能: ${skills.hermes} 个`);
        addTerminalLine('system', `  科研技能: ${skills.scientific} 个`);
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
      {/* 顶部助手栏 */}
      <div
        className="chat-header flex items-center px-4 py-3 gap-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}
      >
        <div className="chat-header-title flex items-center gap-3">
          <span
            className="assistant-brand-icon"
            style={{ backgroundColor: themeColors?.primary, color: '#fff' }}
          >
            <Bot size={18} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="assistant-brand-copy">
            <strong style={{ color: themeColors?.text }}>技术经理人 AI 助手</strong>
            <small style={{ color: themeColors?.textHint }}>{stats.scientific} 项科研技能已就绪</small>
          </span>
        </div>

        <div className="chat-header-controls">
          <span className="chat-mode-control" style={{ color: themeColors?.textHint }}>
            <SlidersHorizontal size={14} aria-hidden="true" />
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as ChatMode)}
              aria-label="选择助手模式"
              style={{ color: themeColors?.text, backgroundColor: themeColors?.surface }}
            >
              {modeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as Provider)}
            className="chat-model-select"
            aria-label="选择模型提供商"
            style={{
              backgroundColor: themeColors?.surface,
              color: themeColors?.text,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            {providerOptions.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            className="chat-clear-button ml-auto flex items-center justify-center"
            style={{ color: themeColors?.textSecondary, border: `1px solid ${themeColors?.border}` }}
            aria-label="清空当前会话"
            title="清空当前会话"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 统一的对话内容区域 */}
      <div className="chat-content flex-1 overflow-hidden">
        {/* Chat / Hermes Mode */}
        {(mode === 'chat' || mode === 'hermes') && (
          <div
            className="message-list h-full overflow-y-auto p-4 space-y-4"
            style={{ scrollbarWidth: 'thin', scrollbarColor: `${themeColors?.border} transparent` }}
          >
            {messages.length === 0 && mode === 'chat' && (
              <div className="assistant-start">
                <section
                  className="assistant-welcome"
                  style={{ backgroundColor: themeColors?.primaryLight }}
                >
                  <div className="assistant-welcome-copy">
                    <span className="assistant-eyebrow" style={{ color: themeColors?.primary }}>
                      技术成果转化助手
                    </span>
                    <h1 style={{ color: themeColors?.text }}>你好，我可以帮你推进技术对接</h1>
                    <p style={{ color: themeColors?.textSecondary }}>
                      从需求梳理、成果评估到供需匹配，直接描述你的目标即可。
                    </p>
                  </div>
                  <div
                    className="assistant-robot"
                    style={{ backgroundColor: themeColors?.surface, color: themeColors?.primary }}
                    aria-hidden="true"
                  >
                    <Bot size={42} strokeWidth={1.55} />
                    <span style={{ backgroundColor: themeColors?.success }} />
                  </div>
                </section>

                <section className="starter-prompts" aria-label="推荐任务">
                  <p className="starter-prompts-label" style={{ color: themeColors?.textSecondary }}>
                    你可以从这些任务开始
                  </p>
                  <div className="starter-prompt-list">
                    {starterPrompts.map((item) => {
                      const PromptIcon = item.icon;
                      return (
                        <button
                          key={item.title}
                          type="button"
                          className="starter-prompt"
                          onClick={() => {
                            setInput(item.prompt);
                            requestAnimationFrame(() => inputRef.current?.focus());
                          }}
                          style={{ borderColor: themeColors?.border, backgroundColor: themeColors?.surface }}
                        >
                          <span
                            className="starter-prompt-icon"
                            style={{ color: themeColors?.primary, backgroundColor: themeColors?.primaryLight }}
                          >
                            <PromptIcon size={17} aria-hidden="true" />
                          </span>
                          <span className="starter-prompt-copy">
                            <strong style={{ color: themeColors?.text }}>{item.title}</strong>
                            <small style={{ color: themeColors?.textHint }}>{item.description}</small>
                          </span>
                          <ChevronRight size={17} style={{ color: themeColors?.textHint }} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {messages.length === 0 && mode === 'hermes' && (
              <div className="chat-empty-state hermes-empty-state flex flex-col items-center justify-center h-full text-center p-8">
                <div
                  className="hermes-empty-icon"
                  style={{ color: themeColors?.primary, backgroundColor: themeColors?.primaryLight }}
                >
                  <Sparkles size={32} strokeWidth={1.6} aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold mb-3" style={{ color: themeColors?.text }}>
                  Hermes 任务规划
                </h2>
                <p className="text-sm mb-6 max-w-md" style={{ color: themeColors?.textSecondary }}>
                  描述目标，Hermes 会规划步骤并调度可用工具执行。
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

        {/* 高频任务入口 */}
        {mode === 'chat' && (
          <div className="assistant-tools" aria-label="快捷能力">
            <button
              type="button"
              onClick={() => {
                setInput('请联网搜索与我的技术需求相关的最新成果、团队和行业信息。');
                requestAnimationFrame(() => inputRef.current?.focus());
              }}
              disabled={isLoading}
              className="assistant-tool"
            >
              <Search size={18} aria-hidden="true" />
              <span><strong>AI 搜索</strong><small>检索成果与行业信息</small></span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('smart-agent');
                setAgentMode('demand');
              }}
              disabled={isLoading}
              className="assistant-tool"
            >
              <ClipboardCheck size={18} aria-hidden="true" />
              <span><strong>需求预判</strong><small>识别难点与可行路径</small></span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('smart-agent');
                setAgentMode('matching');
              }}
              disabled={isLoading}
              className="assistant-tool"
            >
              <Handshake size={18} aria-hidden="true" />
              <span><strong>智能匹配</strong><small>对接需求与技术成果</small></span>
            </button>
          </div>
        )}

        {documentFile && documentPreview && mode !== 'terminal' && (
          <div
            className="composer-notice"
            style={{ backgroundColor: themeColors?.success + '12', color: themeColors?.text }}
          >
            <File size={14} style={{ color: themeColors?.success }} aria-hidden="true" />
            <span className="truncate">{documentFile.name}</span>
            <span style={{ color: themeColors?.textSecondary }}>({documentPreview.type})</span>
            <button type="button" onClick={clearDocument} aria-label="移除已上传文档">
              <X size={13} aria-hidden="true" />
            </button>
          </div>
        )}

        {suggestedSkill && mode === 'chat' && (
          <div
            className="composer-notice skill-notice"
            style={{ backgroundColor: `${themeColors?.primary}12`, color: themeColors?.text }}
          >
            <Sparkles size={13} style={{ color: themeColors?.primary }} aria-hidden="true" />
            <span>{suggestedSkill.source === 'scientific' ? '科研技能' : '推荐技能'}：<strong>{suggestedSkill.name}</strong></span>
            <button
              type="button"
              className="skill-use-button"
              onClick={async () => {
                const bridge = getSkillExecutionBridge();
                const result = await bridge.execute(
                  { intent: 'skill-execution', confidence: 1, matchedSkill: suggestedSkill.name },
                  input
                );
                if (result?.success) {
                  addUnifiedMessage('user', input);
                  addUnifiedMessage('ai', `🔧 [${result.skillOrToolName}]\n\n${result.output}`);
                  setInput('');
                  setSuggestedSkill(null);
                }
              }}
              style={{ backgroundColor: themeColors?.primary, color: '#fff' }}
            >
              使用
            </button>
            <button type="button" onClick={() => setSuggestedSkill(null)} aria-label="忽略技能推荐">
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* 紧凑输入组件 */}
        <div
          className={`chat-composer-shell ${mode === 'terminal' ? 'terminal-composer' : ''}`}
          style={{ backgroundColor: themeColors?.surface, borderColor: themeColors?.border }}
        >
          {mode === 'terminal' ? (
            <input
              ref={terminalInputRef}
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={handleTerminalKeyDown}
              disabled={isLoading}
              className="chat-input"
              style={{ backgroundColor: '#0d1117', color: '#e0e0e0' }}
              placeholder={isLoading ? 'Processing...' : 'Type a command...'}
            />
          ) : (
            <>
              <label
                className="chat-upload-button"
                style={{
                  color: documentFile ? themeColors?.success : themeColors?.textSecondary,
                  backgroundColor: documentFile ? themeColors?.success + '14' : themeColors?.backgroundAlt,
                }}
                title="上传 Word 或 PDF 文档"
                aria-label="上传 Word 或 PDF 文档"
              >
                {documentLoading ? (
                  <span className="composer-spinner" style={{ borderTopColor: themeColors?.primary }} />
                ) : documentFile ? (
                  <CheckCircle2 size={18} aria-hidden="true" />
                ) : (
                  <Upload size={18} aria-hidden="true" />
                )}
                <input
                  type="file"
                  accept=".docx,.pdf"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={isLoading}
                />
              </label>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); adjustTextareaHeight(e); }}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'hermes'
                    ? '描述需要 Hermes 完成的任务...'
                    : mode === 'smart-agent'
                    ? '输入需要分析的需求或成果...'
                    : '请描述你的技术需求、成果或对接目标...'
                }
                className="chat-input"
                rows={1}
              />
            </>
          )}
          <button
            type="button"
            onClick={() => mode === 'terminal' ? handleTerminalCommand(terminalInput) : handleSend()}
            disabled={mode === 'terminal'
              ? !terminalInput.trim() || isLoading
              : !input.trim() || isLoading || agentLoading}
            className="send-btn chat-send-button"
            style={{ backgroundColor: themeColors?.primary }}
            aria-label={agentLoading ? '正在分析' : '发送'}
            title={agentLoading ? '正在分析' : '发送'}
          >
            <SendHorizontal size={17} aria-hidden="true" />
          </button>
        </div>

        {/* 提示信息 */}
        <div className="assistant-disclaimer mt-2 text-xs text-center" style={{ color: themeColors?.textHint }}>
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
