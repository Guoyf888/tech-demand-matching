/**
 * Hermes Agent - Unified Task Planning and Tool Orchestration System
 *
 * Integrates:
 * - Hermes Agent task planning
 * - Claude Code CLI execution
 * - OpenClaw skill dispatch
 * - Native system skills
 */

import { claudeChat, isClaudeCodeInstalled } from '@/services/claudeCode';
import { getOpenClawService } from '@/services/openclaw/OpenClawService';
import { getBuiltInSkills } from '@/services/skills/builtInSkills';
import { searchService } from '@/services/search';
import { v4 as uuidv4 } from 'uuid';
import { normalizeEncoding } from './skillManager';
import { type TierLevel, TIER_CONFIGS } from './AgentTier';
import { runToolLoop, type ToolLoopResult } from './ToolLoop';
import { skillInjector } from '@/services/skills/SkillInjector';
import { unifiedSkillService } from '@/services/skills/UnifiedSkillService';

/**
 * 工具名称规范化 - 增强容错
 * @param tool 工具名称
 * @returns 规范化后的工具名称（无下划线，全小写）
 */
export function normalizeToolName(tool: string | undefined): string {
  if (!tool) return '';
  // 先规范化编码（修复乱码），再替换下划线为短横线
  const normalized = normalizeEncoding(tool);
  return normalized.replace(/_/g, '-').toLowerCase().trim();
}

// Tool definition
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: 'code' | 'analysis' | 'search' | 'document' | 'system' | 'openclaw' | 'skill';
  source: 'claude-code' | 'hermes' | 'openclaw' | 'native';
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Task definition
export interface Task {
  id: string;
  type: 'analyze' | 'plan' | 'execute' | 'research' | 'coordinate';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  subtasks?: Task[];
  result?: string;
  dependencies?: string[];
}

// Plan step definition
export interface PlanStep {
  step: number;
  action: string;
  tool?: string;
  skillId?: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

// Hermes Agent state
export interface HermesState {
  sessionId: string;
  tasks: Task[];
  currentTask?: string;
  plan: PlanStep[];
  executionLog: string[];
  tools: Tool[];
}

/**
 * 安全地执行异步操作并返回结果
 */
async function safeExecute<T>(
  fn: () => Promise<T>,
  fallback: T,
  errorContext: string = ''
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error || '未知错误');
    console.error(`${errorContext}失败:`, errorMsg);
    return fallback;
  }
}

/**
 * 格式化错误消息为中文
 */
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return 'API密钥无效或已过期';
    }
    if (msg.includes('403') || msg.includes('Forbidden')) {
      return 'API访问被拒绝，请检查权限';
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return 'API请求频率超限，请稍后重试';
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      return '网络连接失败，请检查网络';
    }
    return msg.slice(0, 100);
  }
  return '执行过程中发生未知错误';
}

// Claude Code Tool
const claudeCodeTool: Tool = {
  id: 'claude-code',
  name: 'claude_code',
  description: 'Delegate coding tasks to Claude Code CLI. Use for building features, refactoring, PR reviews, and iterative coding.',
  category: 'code',
  source: 'claude-code',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const { command, task, workdir, maxTurns, allowedTools } = params;

    const cliAvailable = await safeExecute(
      () => isClaudeCodeInstalled(),
      false,
      '检查Claude Code CLI'
    );

    if (!cliAvailable) {
      return {
        success: true,
        output: `[模拟模式] Claude Code 将执行:\n任务: ${task || command}\n工作目录: ${workdir || '/project'}\n最大轮次: ${maxTurns || 10}\n可用工具: ${allowedTools || 'all'}\n\n提示: Claude Code CLI 未安装，当前为模拟执行模式。`
      };
    }

    try {
      const prompt: string = (task as string) || (command as string) || 'Complete the coding task';
      const result = await claudeChat(prompt);

      if (result.success) {
        return { success: true, output: result.output };
      } else {
        return { success: false, error: formatErrorMessage(result.error) };
      }
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

// Web Search Tool - 使用真实搜索服务
const webSearchTool: Tool = {
  id: 'web-search',
  name: 'web_search',
  description: 'Search the web for information. Use for researching technologies, finding documentation, company news, and gathering context.',
  category: 'search',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    // 优先使用params.query，其次使用params.task（从executeStep传入），最后使用action描述
    const query = (params.query as string) || (params.task as string) || '未指定搜索关键词';
    const numResults = (params.numResults as number) || 5;
    const searchType = (params.searchType as 'general' | 'news') || 'general';

    try {
      const response = await searchService.search({
        query,
        numResults,
        searchType,
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || '搜索失败'
        };
      }

      const resultsText = response.results.map((r, i) =>
        `${i + 1}. [${r.source || '未知来源'}] ${r.title}\n   ${r.snippet}\n   链接: ${r.url}`
      ).join('\n\n');

      return {
        success: true,
        output: `[Web Search] 搜索查询: ${query}\n\n找到 ${response.results.length} 条结果:\n\n${resultsText}`
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '搜索服务异常';
      return {
        success: false,
        error: errorMsg
      };
    }
  }
};

// 企业背景调查工具
const companyResearchTool: Tool = {
  id: 'company-research',
  name: 'company_research',
  description: 'Research company background information including news, industry trends, and patent information. Use for due diligence on enterprises.',
  category: 'search',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    // 优先使用params.companyName，其次使用params.task
    const companyName = (params.companyName as string) || (params.task as string);

    if (!companyName) {
      return {
        success: false,
        error: '未指定公司名称'
      };
    }

    try {
      const result = await searchService.researchCompany(companyName);

      // 格式化新闻
      const newsText = result.news.length > 0
        ? result.news.map((n, i) => `${i + 1}. [${n.source || '未知来源'}] ${n.title}\n   ${n.snippet}\n   ${n.publishedAt ? `发布时间: ${n.publishedAt}` : ''}`)
        .join('\n\n')
        : '暂无相关新闻';

      // 格式化行业动态
      const industryText = result.industryNews.length > 0
        ? result.industryNews.map((n, i) => `${i + 1}. [${n.source || '未知来源'}] ${n.title}\n   ${n.snippet}`)
        .join('\n\n')
        : '暂无行业动态';

      // 格式化专利信息
      const patentsText = result.patents && result.patents.length > 0
        ? result.patents.map((p, i) => `${i + 1}. ${p.title}\n   ${p.snippet}`)
        .join('\n\n')
        : '暂无专利信息';

      let output = `# 企业背景调查报告: ${companyName}\n\n`;

      if (result.basicInfo) {
        output += `## 基本信息\n`;
        output += `| 项目 | 内容 |\n|------|------|\n`;
        if (result.basicInfo.legalRepresentative) {
          output += `| 法定代表人 | ${result.basicInfo.legalRepresentative} |\n`;
        }
        if (result.basicInfo.registeredCapital) {
          output += `| 注册资本 | ${result.basicInfo.registeredCapital} |\n`;
        }
        if (result.basicInfo.establishmentDate) {
          output += `| 成立日期 | ${result.basicInfo.establishmentDate} |\n`;
        }
        if (result.basicInfo.businessStatus) {
          output += `| 经营状态 | ${result.basicInfo.businessStatus} |\n`;
        }
        if (result.basicInfo.mainBusiness) {
          output += `| 主营业务 | ${result.basicInfo.mainBusiness} |\n`;
        }
        output += '\n';
      }

      output += `## 最新动态 (${result.news.length}条)\n${newsText}\n\n`;
      output += `## 行业动态 (${result.industryNews.length}条)\n${industryText}\n\n`;
      output += `## 相关专利 (${result.patents?.length || 0}条)\n${patentsText}\n`;

      return {
        success: true,
        output
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : '企业调研异常';
      return {
        success: false,
        error: errorMsg
      };
    }
  }
};

// Document Analysis Tool
const documentAnalysisTool: Tool = {
  id: 'document-analysis',
  name: 'document_analysis',
  description: 'Analyze documents, extract key information, summarize content, and extract structured data.',
  category: 'document',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const document = (params.document as string) || (params.task as string) || '未指定文档';
    const type = params.type || 'general';

    const analysisPrompt = `你是一位专业的文档分析专家。请对以下文档进行${type === 'general' ? '综合' : String(type)}分析，提取关键信息、生成摘要、识别主要实体和关键数据点。

文档内容：
${document.slice(0, 4000)}

请用中文输出结构化分析结果。`;

    try {
      const result = await claudeChat(analysisPrompt);
      return {
        success: result.success,
        output: result.success ? result.output : `文档分析失败: ${formatErrorMessage(result.error)}`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

// Task Planning Tool
const taskPlanningTool: Tool = {
  id: 'task-planning',
  name: 'task_planning',
  description: 'Break down complex technical demands into actionable sub-tasks with clear dependencies.',
  category: 'system',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const { demand, context } = params;

    const planningPrompt = `You are a technical project planner. Break down this technical demand into clear, actionable steps:

Demand: ${demand}
Context: ${context || 'No additional context'}

Provide a numbered list of steps, each with:
- Action to take
- Tool/approach to use
- Expected outcome

Format your response as a structured plan.`;

    try {
      const result = await claudeChat(planningPrompt);
      return {
        success: result.success,
        output: result.success ? result.output : `规划失败: ${formatErrorMessage(result.error)}`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

// OpenClaw Skill Tool - dispatches to OpenClaw skills
const openClawSkillTool: Tool = {
  id: 'openclaw-skill',
  name: 'openclaw_skill',
  description: 'Execute OpenClaw skills for specialized tasks like summarize, github, discord, spotify, etc.',
  category: 'openclaw',
  source: 'openclaw',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const { skillName, action, ...skillParams } = params;

    if (!skillName) {
      return { success: false, error: '未指定技能名称' };
    }

    try {
      const openClaw = getOpenClawService();
      const skill = openClaw.getSkillByName(skillName as string);

      if (!skill) {
        // Try to find by trigger
        const matchedSkill = openClaw.findSkillByTrigger(skillName as string);
        if (matchedSkill) {
          return await openClaw.executeSkill(matchedSkill.id, skillParams);
        }
        return { success: false, error: `未找到OpenClaw技能: ${skillName}` };
      }

      return await openClaw.executeSkill(skill.id, skillParams);
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

// Native Skill Tool - dispatches to system native skills
const nativeSkillTool: Tool = {
  id: 'native-skill',
  name: 'native_skill',
  description: 'Execute native system skills like find-skills, summarize, code-assistant, etc.',
  category: 'skill',
  source: 'native',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const { skillName, action } = params;

    if (!skillName) {
      return { success: false, error: '未指定技能名称' };
    }

    try {
      const nativeSkills = getBuiltInSkills();
      const skill = nativeSkills.find(s =>
        s.name.toLowerCase() === (skillName as string)?.toLowerCase()
      );

      if (!skill) {
        return { success: false, error: `未找到内置技能: ${skillName}` };
      }

      const systemPrompt = (skill.content
        ? skill.content
        : `You are the "${skill.name}" skill. ${skill.description}`
      ).slice(0, 8192);
      const userMessage = (params.query as string) || (params.task as string) || `Execute ${skill.name}: ${action || 'default'}`;

      const result = await claudeChat(userMessage, [], { systemPrompt });
      return {
        success: result.success,
        output: result.success ? result.output : `技能执行失败: ${formatErrorMessage(result.error)}`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

// ============================================
// AI技术经理人 - 五大科技服务工具
// ============================================

/**
 * 政策智能问答工具
 * 根据用户问题搜索相关政策并给出智能解答
 */
const policyQATool: Tool = {
  id: 'policy-qa',
  name: 'policy_qa',
  description: '政策智能问答 - 解答科技政策相关问题，支持创新基金、高新认定、研发费用加计扣除等',
  category: 'analysis',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const query = (params.query as string) || (params.task as string) || '';
    const deepThinking = (params.deepThinking as boolean) || false;

    if (!query) {
      return { success: false, error: '未指定政策问题' };
    }

    try {
      // 搜索相关政策
      const searchQuery = `${query} 科技创新政策`;
      const searchResponse = await searchService.search({
        query: searchQuery,
        numResults: deepThinking ? 10 : 5,
        searchType: 'news',
      });

      let context = '';
      if (searchResponse.success && searchResponse.results.length > 0) {
        context = searchResponse.results.map(r =>
          `【${r.title}】\n来源: ${r.source || '未知'}\n摘要: ${r.snippet}\n链接: ${r.url}`
        ).join('\n\n');
      }

      // 构建分析提示词（增强版）
      const analysisPrompt = `你是科创政策AI问答专家，需基于以下信息回答政策相关问题。

用户输入：${query}

搜索到的政策信息：
${context || '暂无相关政策信息，请基于已有知识回答'}

要求：
1. 精准匹配相关政策文件，给出政策名称、发布部门、核心条款；
2. 结合企业场景给出政策落地建议；
3. 语言简洁专业，符合政府/园区/企业用户阅读习惯。

请以结构化格式回答：
**一、政策依据**
列出相关政策名称和文号

**二、核心条款**
简要说明政策要点

**三、适用条件**
说明企业或项目需要满足的条件

**四、支持方式**
说明资金、税收、资质等支持

**五、落地建议**
申请时需要注意的关键点和建议`;

      const result = await claudeChat(analysisPrompt);

      if (result.success && result.output) {
        return {
          success: true,
          output: `📋 **政策智能问答**

**问题**: ${query}

${result.output}`
        };
      }

      return { success: false, error: `政策分析失败: ${formatErrorMessage(result.error)}` };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

/**
 * 政策汇编工具
 * 汇总某个领域或地区的最新政策
 */
const policyCompilationTool: Tool = {
  id: 'policy-compilation',
  name: 'policy_compilation',
  description: '政策汇编 - 汇总某个领域或地区的科技创新政策，支持按时间、类型筛选',
  category: 'analysis',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const topic = (params.topic as string) || (params.query as string) || (params.task as string) || '';
    const deepThinking = (params.deepThinking as boolean) || false;

    if (!topic) {
      return { success: false, error: '未指定政策汇编主题' };
    }

    try {
      // 搜索相关政策
      const searchQuery = `${topic} 科技创新政策 扶持`;
      const newsResponse = await searchService.search({
        query: searchQuery,
        numResults: deepThinking ? 15 : 8,
        searchType: 'news',
      });

      let policyList = '';
      if (newsResponse.success && newsResponse.results.length > 0) {
        policyList = newsResponse.results.map((r, i) =>
          `${i + 1}. **${r.title}**\n   📰 来源: ${r.source || '未知'} ${r.publishedAt ? `| 📅 ${r.publishedAt}` : ''}\n   📝 摘要: ${r.snippet}\n   🔗 链接: ${r.url}`
        ).join('\n\n');
      }

      // 按类别分组分析
      const compilationPrompt = `你是一个政策研究专家。请为用户整理"${topic}"领域的政策汇编。

搜索到的政策:
${policyList || '暂无政策数据'}

请按以下格式整理:
# ${topic} 政策汇编

## 📌 最新政策动态
[列出最近发布的重要政策]

## 💰 资金支持类政策
[列出资金、补贴、奖励类政策]

## 📊 资质认定类政策
[列出高新企业、技术中心等认定类政策]

## 🔧 研发支持类政策
[列出研发费用加计扣除、技术改造等支持]

## ⚠️ 注意事项
[整理申请要点和常见问题]

---
*数据来源：公开政策信息整理*`;

      const result = await claudeChat(compilationPrompt);

      return {
        success: true,
        output: result.success && result.output
          ? `📚 **政策汇编**: ${topic}\n\n${result.output}`
          : `📚 **政策汇编**: ${topic}\n\n暂无相关政策信息，请尝试其他主题。`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

/**
 * 产业链分析工具
 * 分析某个产业链的上中下游、关键环节、代表性企业
 */
const industryChainAnalysisTool: Tool = {
  id: 'industry-chain-analysis',
  name: 'industry_chain_analysis',
  description: '产业链分析 - 分析产业链结构、关键环节、代表性企业和技术趋势',
  category: 'analysis',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const industry = (params.industry as string) || (params.query as string) || (params.task as string) || '';
    const deepThinking = (params.deepThinking as boolean) || false;

    if (!industry) {
      return { success: false, error: '未指定产业链分析对象' };
    }

    try {
      // 搜索产业链信息
      const searchQuery = `${industry}产业链分析 上中下游`;
      const searchResponse = await searchService.search({
        query: searchQuery,
        numResults: deepThinking ? 10 : 6,
        searchType: 'general',
      });

      let context = '';
      if (searchResponse.success && searchResponse.results.length > 0) {
        context = searchResponse.results.map(r =>
          `【${r.title}】\n${r.snippet}\n来源: ${r.source || '未知'}`
        ).join('\n\n');
      }

      const analysisPrompt = `你是产业链分析专家，需为以下行业/企业生成产业链分析报告。

用户输入：${industry}

已收集的信息：
${context || '暂无数据，基于知识分析'}

要求：
1. 梳理上游原材料、中游制造、下游应用的完整产业链；
2. 分析核心企业、技术壁垒、市场规模、发展趋势；
3. 生成可视化的产业链图谱文字描述；
4. 数据来源需标注，结论需有支撑。

请按以下格式输出：

# ${industry} 产业链分析报告

## 一、产业链全景图
[用文字描述上、中、下游各环节]

## 二、上游（原材料/基础环节）
[列出上游环节和代表性企业/供应商]

## 三、中游（核心制造/研发环节）
[列出中游核心企业和关键技术]

## 四、下游（应用/服务环节）
[列出下游应用领域和代表性企业]

## 五、核心企业分析
[分析3-5家代表性企业的市场地位和技术优势]

## 六、技术壁垒与市场规模
[分析行业技术壁垒和当前市场规模]

## 七、技术发展趋势
[分析该产业的技术发展方向和未来趋势]

## 八、投资机会与风险提示
[给出简要的投资机会和风险分析]

---
*数据来源：${searchResponse.success ? `Web搜索（${searchResponse.provider}）` : '知识库'}*`;

      const result = await claudeChat(analysisPrompt);

      return {
        success: true,
        output: result.success && result.output
          ? `🔗 **产业链分析**: ${industry}\n\n${result.output}`
          : `🔗 **产业链分析**: ${industry}\n\n产业链分析失败，请稍后重试。`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

/**
 * 企业技术预测工具
 * 基于企业信息和技术趋势预测未来发展方向
 */
const enterpriseTechPredictionTool: Tool = {
  id: 'enterprise-tech-prediction',
  name: 'enterprise_tech_prediction',
  description: '企业技术预测 - 基于企业现状和技术趋势预测未来3-5年技术发展方向',
  category: 'analysis',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const companyName = (params.companyName as string) || (params.query as string) || (params.task as string) || '';
    const deepThinking = (params.deepThinking as boolean) || false;

    if (!companyName) {
      return { success: false, error: '未指定企业名称' };
    }

    try {
      // 企业背景调查
      const researchResult = await searchService.researchCompany(companyName);

      let companyInfo = `企业名称: ${companyName}\n`;
      if (researchResult.basicInfo) {
        companyInfo += `主营业务: ${researchResult.basicInfo.mainBusiness || '未知'}\n`;
        companyInfo += `注册状态: ${researchResult.basicInfo.businessStatus || '未知'}\n`;
        companyInfo += `注册资本: ${researchResult.basicInfo.registeredCapital || '未知'}\n`;
        companyInfo += `成立日期: ${researchResult.basicInfo.establishmentDate || '未知'}\n`;
      }

      // 搜索企业最新技术动态
      const techSearch = await searchService.search({
        query: `${companyName} 技术创新 研发`,
        numResults: deepThinking ? 10 : 5,
        searchType: 'news',
      });

      let techNews = '';
      if (techSearch.success && techSearch.results.length > 0) {
        techNews = techSearch.results.map(r =>
          `• ${r.title} (${r.source || '未知'})${r.publishedAt ? ` - ${r.publishedAt}` : ''}`
        ).join('\n');
      }

      const predictionPrompt = `你是企业技术预测专家，需为以下企业生成技术演变路径预测报告。

用户输入：${companyName}

企业基本信息：
${companyInfo}

最新技术动态：
${techNews || '暂无公开技术动态'}

要求：
1. 分析企业现有技术布局、专利情况、研发方向；
2. 预测未来3-5年技术发展路径、关键突破点、风险点；
3. 结合行业趋势给出技术落地建议；
4. 报告结构清晰，分点论述。

请按以下格式输出：

# ${companyName} 技术演变路径预测报告

## 一、企业技术现状
[分析企业当前的技术能力、研发投入、专利布局]

## 二、行业技术趋势
[分析所处行业的技术发展方向和热点]

## 三、未来3-5年技术预测
[预测企业可能的技术发展方向和关键突破点]

## 四、重点技术方向
[列出3-5个建议重点投入的技术方向，并说明理由]

## 五、技术路线图
[给出一个简要的技术发展时间表，包含里程碑]

## 六、风险与挑战
[分析技术发展可能面临的挑战和风险]

## 七、落地建议
[给出针对性的技术落地建议和实施方案]

---
*数据来源：${techSearch.success ? `Web搜索（${techSearch.provider}）+ 企业数据库` : '企业数据库'}`;

      const result = await claudeChat(predictionPrompt);

      return {
        success: true,
        output: result.success && result.output
          ? `🔮 **企业技术预测**: ${companyName}\n\n${result.output}`
          : `🔮 **企业技术预测**: ${companyName}\n\n技术预测失败，请稍后重试。`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

/**
 * 成果需求双向匹配工具
 * 在技术成果和技术需求之间进行智能匹配
 */
const resultDemandMatchingTool: Tool = {
  id: 'result-demand-matching',
  name: 'result_demand_matching',
  description: '成果需求双向匹配 - 在技术成果和技术需求之间进行智能匹配推荐',
  category: 'analysis',
  source: 'hermes',
  execute: async (params: Record<string, unknown>): Promise<ToolResult> => {
    const demandText = (params.demand as string) || (params.query as string) || (params.task as string) || '';
    const resultText = (params.result as string) || '';
    const deepThinking = (params.deepThinking as boolean) || false;

    if (!demandText && !resultText) {
      return { success: false, error: '请提供技术需求或技术成果描述' };
    }

    try {
      // 确定匹配方向和搜索相关数据
      let searchQuery = '';
      let matchType = '';

      if (demandText && resultText) {
        matchType = '双向匹配';
        searchQuery = `${demandText} ${resultText}`;
      } else if (demandText) {
        matchType = '需求找成果';
        searchQuery = `技术成果解决方案 ${demandText}`;
      } else {
        matchType = '成果找需求';
        searchQuery = `技术需求 应用场景 ${resultText}`;
      }

      const searchResponse = await searchService.search({
        query: searchQuery,
        numResults: deepThinking ? 10 : 6,
        searchType: 'general',
      });

      let context = '';
      if (searchResponse.success && searchResponse.results.length > 0) {
        context = searchResponse.results.map(r =>
          `【${r.title}】\n${r.snippet}\n来源: ${r.source || '未知'}`
        ).join('\n\n');
      }

      const matchingPrompt = `你是一个技术经济匹配专家。请分析技术供给和需求的匹配情况。

匹配类型: ${matchType}

技术需求:
${demandText || '未提供'}

技术成果:
${resultText || '未提供'}

相关参考信息:
${context || '暂无参考信息'}

请按以下格式输出匹配分析:

# 技术成果-需求匹配分析

## 📋 需求分析
[分析技术需求的核心要点、关键指标]

## 📦 成果分析
[分析技术成果的特点、优势、适用场景]

## ✅ 匹配度评估
[给出0-100的匹配度评分，并说明理由]

## 🎯 匹配亮点
[列出3-5个高度匹配的点]

## ⚠️ 差异与建议
[列出存在的差异和改进建议]

## 💡 合作建议
[给出合作模式和发展建议]`;

      const result = await claudeChat(matchingPrompt);

      return {
        success: true,
        output: result.success && result.output
          ? `🤝 **${matchType}分析**\n\n${result.output}`
          : `🤝 **${matchType}分析**\n\n匹配分析失败，请稍后重试。`
      };
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }
};

// Hermes Agent Class
export class HermesAgent {
  private state: HermesState;
  private tools: Map<string, Tool>;
  private initialized: boolean = false;

  constructor() {
    // CRITICAL: Initialize tools Map FIRST, before anything else
    this.tools = new Map();

    // Initialize state
    this.state = {
      sessionId: uuidv4(),
      tasks: [],
      plan: [],
      executionLog: [],
      tools: []
    };

    // Mark as initialized BEFORE registering tools
    this.initialized = true;

    // Register all default tools
    this.registerDefaultToolsInternal();
  }

  /**
   * 确保工具已初始化 - throw error if not ready
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('HermesAgent未初始化，请刷新页面重试');
    }
    if (!this.state) {
      throw new Error('HermesAgent状态异常，请刷新页面重试');
    }
    if (!this.tools || !(this.tools instanceof Map)) {
      // Re-initialize if corrupted
      console.warn('HermesAgent工具状态异常，重新初始化...');
      this.tools = new Map();
      this.registerDefaultToolsInternal();
    }
  }

  /**
   * Internal method to register default tools - called during construction
   */
  private registerDefaultToolsInternal(): void {
    if (!this.tools) {
      this.tools = new Map();
    }

    const toolsToRegister = [
      claudeCodeTool,
      webSearchTool,
      companyResearchTool,
      documentAnalysisTool,
      taskPlanningTool,
      openClawSkillTool,
      nativeSkillTool,
      policyQATool,
      policyCompilationTool,
      industryChainAnalysisTool,
      enterpriseTechPredictionTool,
      resultDemandMatchingTool
    ];

    for (const tool of toolsToRegister) {
      try {
        if (tool && tool.id) {
          this.tools.set(tool.id, tool);
        }
      } catch (error) {
        console.error(`注册工具失败 ${tool?.id || 'unknown'}:`, error);
      }
    }

    // Update state with registered tools
    if (this.state) {
      this.state.tools = Array.from(this.tools.values());
    }
  }

  registerTool(tool: Tool): boolean {
    try {
      // Ensure initialization
      if (!this.initialized) {
        console.error('HermesAgent未初始化');
        return false;
      }
      if (!this.tools) {
        this.tools = new Map();
      }

      if (!tool || !tool.id) {
        console.warn('无效的工具配置:', tool);
        return false;
      }
      this.tools.set(tool.id, tool);
      if (this.state) {
        this.state.tools = Array.from(this.tools.values());
      }
      return true;
    } catch (error) {
      console.error('注册工具失败:', error);
      return false;
    }
  }

  /**
   * 直接执行指定工具 - 用于AI技术经理人等直接工具调用场景
   * @param toolId 工具ID（支持短横线和下划线格式）
   * @param params 工具参数
   */
  async executeTool(toolId: string, params: Record<string, unknown>): Promise<ToolResult> {
    this.ensureInitialized();

    // 规范化工具名称
    const normalizedToolId = normalizeToolName(toolId);
    let tool = this.tools.get(normalizedToolId);

    // 尝试原始名称
    if (!tool) {
      tool = this.tools.get(toolId);
    }

    // 尝试带下划线的版本
    if (!tool) {
      tool = this.tools.get(toolId.replace(/-/g, '_'));
    }

    if (!tool) {
      const availableTools = Array.from(this.tools.keys());
      return {
        success: false,
        error: `未找到工具: ${toolId}\n可用工具: ${availableTools.join(', ') || '无'}`
      };
    }

    try {
      const result = await tool.execute(params);
      return result;
    } catch (error: unknown) {
      return { success: false, error: formatErrorMessage(error) };
    }
  }

  getTools(): Tool[] {
    this.ensureInitialized();
    return this.state?.tools || [];
  }

  getSessionId(): string {
    return this.state?.sessionId || '';
  }

  /**
   * 获取所有可用的技能列表（综合所有来源）
   */
  getAllAvailableSkills() {
    try {
      const nativeSkills = getBuiltInSkills();
      const openClawService = getOpenClawService();
      const openClawSkills = openClawService.getAllSkills();

      return {
        native: nativeSkills,
        openclaw: openClawSkills,
        total: nativeSkills.length + openClawSkills.length
      };
    } catch (error) {
      console.error('获取技能列表失败:', error);
      return {
        native: [],
        openclaw: [],
        total: 0
      };
    }
  }

  // Analyze demand and extract keywords
  async analyzeDemand(demand: string): Promise<{
    keywords: string[];
    intent: string;
    category: string;
    complexity: 'low' | 'medium' | 'high';
    suggestedTools: string[];
    suggestedSkills: string[];
  }> {
    this.ensureInitialized();

    const analysisPrompt = `分析以下技术需求并提取结构化信息：

需求: ${demand}

请以JSON格式返回，包含以下字段：
{
  "keywords": ["关键词1", "关键词2"],
  "intent": "用户想要完成的目标",
  "category": "技术类别（如：软件开发、数据科学、硬件、研究）",
  "complexity": "low|medium|high（复杂度）",
  "suggestedTools": ["建议使用的工具列表"],
  "suggestedSkills": ["建议使用的技能名称列表"]
}`;

    try {
      const result = await claudeChat(analysisPrompt);
      if (result.success && result.output) {
        const jsonMatch = result.output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            // Validate required fields
            if (parsed.keywords && parsed.intent && parsed.category) {
              return parsed;
            }
          } catch {
            // JSON parse failed, use fallback
          }
        }
      }
    } catch (error) {
      console.error('需求分析失败:', error);
    }

    // Fallback analysis - use simple keyword extraction
    const fallbackResult = this.fallbackAnalysis(demand);
    return fallbackResult;
  }

  /**
   * 回退分析逻辑（当API调用失败时）
   */
  private fallbackAnalysis(demand: string): {
    keywords: string[];
    intent: string;
    category: string;
    complexity: 'low' | 'medium' | 'high';
    suggestedTools: string[];
    suggestedSkills: string[];
  } {
    try {
      const openClaw = getOpenClawService();
      const matchedSkills: string[] = [];

      // Check for OpenClaw skill triggers
      const allSkills = [...getBuiltInSkills(), ...openClaw.getAllSkills()];
      for (const skill of allSkills) {
        if (skill.triggers?.some(t => demand.toLowerCase().includes(t.toLowerCase()))) {
          matchedSkills.push(skill.name);
        }
      }

      const keywords = demand.split(/[\s,，、]+/)
        .filter(w => w.length > 2)
        .slice(0, 10);

      return {
        keywords,
        intent: '技术需求分析',
        category: this.detectCategory(demand),
        complexity: demand.length > 200 ? 'high' : demand.length > 50 ? 'medium' : 'low',
        suggestedTools: matchedSkills.length > 0 ? ['openclaw_skill', 'native_skill'] : ['claude_code', 'task_planning'],
        suggestedSkills: matchedSkills
      };
    } catch {
      return {
        keywords: demand.split(/\s+/).filter(w => w.length > 3).slice(0, 10),
        intent: 'technical_requirement_analysis',
        category: 'software_development',
        complexity: demand.length > 200 ? 'high' : 'medium',
        suggestedTools: ['claude_code'],
        suggestedSkills: []
      };
    }
  }

  /**
   * 根据需求内容检测类别
   */
  private detectCategory(demand: string): string {
    const lowerDemand = demand.toLowerCase();
    if (lowerDemand.match(/ai|机器学习|深度学习|模型训练/)) return 'data_science';
    if (lowerDemand.match(/硬件|芯片|嵌入式|单片机/)) return 'hardware';
    if (lowerDemand.match(/网站|web|前端|后端|api/)) return 'web_development';
    if (lowerDemand.match(/app|移动端|ios|android/)) return 'mobile_development';
    if (lowerDemand.match(/安全|加密|隐私/)) return 'security';
    return 'software_development';
  }

  // Create task plan from demand
  async createPlan(demand: string, context?: Record<string, unknown>): Promise<PlanStep[]> {
    this.ensureInitialized();

    const analysis = await this.analyzeDemand(demand);

    const planningPrompt = `为以下技术需求创建详细的执行计划：

需求: ${demand}

分析结果:
- 关键词: ${analysis.keywords.join(', ')}
- 意图: ${analysis.intent}
- 类别: ${analysis.category}
- 复杂度: ${analysis.complexity}
- 建议工具: ${analysis.suggestedTools.join(', ')}
- 建议技能: ${analysis.suggestedSkills.join(', ')}

背景信息: ${context ? JSON.stringify(context) : '无'}

可用工具:
- claude_code: 用于代码生成、调试和执行
- web_search: 用于调研技术和文档
- document_analysis: 用于分析文档和提取信息
- task_planning: 用于分解复杂任务
- openclaw_skill: 用于执行OpenClaw技能（如summarize、github、discord等）
- native_skill: 用于执行内置系统技能

请创建编号的执行计划，每个步骤包含:
1. 步骤编号
2. 操作描述
3. 使用的工具（从上面的可用工具中选择）
4. 技能名称（如果使用openclaw_skill或native_skill）
5. 预期结果

请以JSON数组格式返回:
[
  {"step": 1, "action": "...", "tool": "...", "skillId": "...", "description": "..."},
  ...
]`;

    try {
      const result = await claudeChat(planningPrompt);
      if (result.success && result.output) {
        const jsonMatch = result.output.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const plan = JSON.parse(jsonMatch[0]) as PlanStep[];
            // Validate plan
            if (Array.isArray(plan) && plan.length > 0) {
              this.state.plan = plan;
              return plan;
            }
          } catch {
            // JSON parse failed
          }
        }
      }
    } catch (error) {
      console.error('创建执行计划失败:', error);
    }

    // Default fallback plan
    const fallbackPlan = this.getDefaultPlan();
    this.state.plan = fallbackPlan;
    return fallbackPlan;
  }

  /**
   * 获取默认执行计划
   */
  private getDefaultPlan(): PlanStep[] {
    return [
      {
        step: 1,
        action: '需求分析与理解',
        tool: 'task_planning',
        description: '深入分析技术需求，提取关键信息和核心目标',
        status: 'pending'
      },
      {
        step: 2,
        action: '行业与技术调研',
        tool: 'web_search',
        description: '调研相关行业现状、技术路线和最佳实践',
        status: 'pending'
      },
      {
        step: 3,
        action: '竞品与技术分析',
        tool: 'document_analysis',
        description: '分析同类产品和技术的特点与优势',
        status: 'pending'
      },
      {
        step: 4,
        action: '技术方案生成',
        tool: 'claude_code',
        description: '基于分析结果生成技术研发方案和建议',
        status: 'pending'
      },
      {
        step: 5,
        action: '报告整理与输出',
        tool: 'task_planning',
        description: '整理分析结果，生成结构化报告',
        status: 'pending'
      }
    ];
  }

  // Execute a plan step
  async executeStep(step: PlanStep): Promise<ToolResult> {
    try {
      this.ensureInitialized();
    } catch (error) {
      return { success: false, error: `Agent初始化失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }

    if (!step.tool) {
      return { success: false, error: `步骤 ${step.step} 未指定工具` };
    }

    // Ensure tools map exists
    if (!this.tools) {
      this.tools = new Map();
    }

    // 规范化工具名称：使用normalizeToolName增强容错
    const normalizedToolId = normalizeToolName(step.tool);
    let tool = this.tools.get(normalizedToolId);

    // 如果找不到，尝试原始名称（兼容两种格式）
    if (!tool) {
      tool = this.tools.get(step.tool);
    }

    if (!tool) {
      // Try to find an alternative tool
      const availableTools = Array.from(this.tools.keys());
      return {
        success: false,
        error: `未找到工具: ${normalizedToolId}\n可用工具: ${availableTools.join(', ') || '无'}`
      };
    }

    try {
      // 构建工具参数：根据不同工具类型映射正确参数
      const params: Record<string, unknown> = {
        task: step.action,
        description: step.description,
        skillName: step.skillId || step.action,
      };

      // 根据工具类型映射具体参数
      const toolId = normalizedToolId.toLowerCase();
      if (toolId.includes('web-search') || toolId.includes('web_search')) {
        // Web搜索工具：从action/description提取搜索关键词
        params.query = step.action || step.description;
        params.numResults = 5;
        params.searchType = 'general';
      } else if (toolId.includes('document') || toolId.includes('document_analysis')) {
        // 文档分析工具：使用description作为文档内容
        params.document = step.description;
        params.type = 'general';
      } else if (toolId.includes('company') || toolId.includes('company_research')) {
        // 企业调查工具：从description提取公司名
        params.companyName = step.description;
      } else if (toolId.includes('claude-code') || toolId.includes('claude_code')) {
        // Claude Code工具：传递完整需求
        params.query = step.description;
      }

      const result = await tool.execute(params);

      step.status = result.success ? 'completed' : 'failed';
      step.result = result.output || result.error;

      if (this.state) {
        this.state.executionLog.push(
          `[${new Date().toLocaleString('zh-CN')}] 步骤 ${step.step}: ${step.action} (${step.tool}) - ${result.success ? '成功' : '失败'}`
        );
      }

      return result;
    } catch (error: unknown) {
      step.status = 'failed';
      const errorMsg = formatErrorMessage(error);
      step.result = errorMsg;

      return { success: false, error: errorMsg };
    }
  }

  // Execute full plan
  async executePlan(): Promise<{
    success: boolean;
    results: Record<number, ToolResult>;
    summary: string;
  }> {
    this.ensureInitialized();

    const results: Record<number, ToolResult> = {};
    let allSuccess = true;

    if (!this.state.plan || this.state.plan.length === 0) {
      return {
        success: false,
        results: {},
        summary: '执行计划为空，请先创建计划'
      };
    }

    for (const step of this.state.plan) {
      step.status = 'in_progress';
      try {
        const result = await this.executeStep(step);
        results[step.step] = result;
        if (!result.success) {
          allSuccess = false;
        }
      } catch (error) {
        allSuccess = false;
        results[step.step] = {
          success: false,
          error: formatErrorMessage(error)
        };
      }
    }

    const summary = this.state.plan.map(s =>
      `步骤 ${s.step} (${s.tool}): ${s.status} - ${s.result || ''}`
    ).join('\n');

    return { success: allSuccess, results, summary };
  }

  // Get current state
  getState(): HermesState | null {
    return this.state ? { ...this.state } : null;
  }

  // Get execution log
  getLog(): string[] {
    return this.state?.executionLog ? [...this.state.executionLog] : [];
  }

  // Reset session
  reset(): void {
    try {
      this.state = {
        sessionId: uuidv4(),
        tasks: [],
        plan: [],
        executionLog: [],
        tools: Array.from(this.tools.values())
      };
    } catch (error) {
      console.error('重置会话失败:', error);
    }
  }

  /**
   * 使用层级系统执行任务（Phase 3 核心方法）
   * 结合 SkillInjector + AgentTier + ToolLoop
   */
  async executeWithTier(userTask: string, tier: TierLevel): Promise<ToolLoopResult> {
    const tierConfig = TIER_CONFIGS[tier];

    // 通过 SkillInjector 获取相关技能内容
    const allSkills = unifiedSkillService.getAllSkills().map(u => u.skill);
    const injection = skillInjector.inject(allSkills, userTask);

    return runToolLoop(userTask, tierConfig, {
      systemPrompt: tierConfig.systemPromptPrefix,
      skillContent: injection.rendered || undefined,
    });
  }
}

// Singleton instance
let hermesAgentInstance: HermesAgent | null = null;

export function getHermesAgent(): HermesAgent {
  if (!hermesAgentInstance) {
    try {
      hermesAgentInstance = new HermesAgent();
    } catch (error) {
      console.error('创建HermesAgent实例失败:', error);
      throw error;
    }
  }
  return hermesAgentInstance;
}

// Skill interface (compatible with Hermes format)
export interface HermesSkill {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  metadata?: {
    hermes?: {
      tags?: string[];
      related_skills?: string[];
    };
  };
  content: string;
  tools?: string[];
}

// Parse SKILL.md content
export function parseSkillMarkdown(content: string): HermesSkill | null {
  try {
    const lines = content.split('\n');
    let frontmatterEnd = -1;
    const metadata: Record<string, unknown> = {};

    if (lines[0]?.trim() === '---') {
      for (let i = 1; i < lines.length; i++) {
        if (lines[i]?.trim() === '---') {
          frontmatterEnd = i;
          break;
        }
        const colonIndex = lines[i].indexOf(':');
        if (colonIndex > 0) {
          const key = lines[i].substring(0, colonIndex).trim();
          const value = lines[i].substring(colonIndex + 1).trim();
          metadata[key] = value;
        }
      }
    }

    const skillContent = frontmatterEnd >= 0
      ? lines.slice(frontmatterEnd + 1).join('\n').trim()
      : content;

    return {
      name: (metadata.name as string) || 'Unnamed Skill',
      description: (metadata.description as string) || '',
      version: metadata.version as string,
      author: metadata.author as string,
      license: metadata.license as string,
      metadata: metadata.metadata as HermesSkill['metadata'],
      content: skillContent
    };
  } catch {
    return null;
  }
}

export default HermesAgent;
