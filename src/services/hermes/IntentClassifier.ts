/**
 * IntentClassifier - 意图分类器
 *
 * 两层分类策略（参考 OpenHuman 的 orchestrator 模式）：
 * 1. 快速规则匹配（无LLM调用）：@提及、/命令、领域关键词、技能触发词
 * 2. LLM分类（模糊输入）：200 token 快速分类
 *
 * 置信度阈值：>= 0.8 快速匹配，>= 0.7 LLM匹配
 */

import { unifiedSkillService } from '@/services/skills/UnifiedSkillService';

export type IntentType =
  | 'simple-chat'       // 简单问答
  | 'skill-execution'   // 匹配到具体技能
  | 'tool-execution'    // 匹配到 Hermes 工具
  | 'multi-step-task'   // 需要 Hermes 计划+执行管道
  | 'domain-analysis';  // 匹配 TechMatchAgent

export interface IntentClassification {
  intent: IntentType;
  confidence: number;       // 0-1
  matchedSkill?: string;    // 技能名称
  matchedTool?: string;     // 工具 ID
  matchedDomain?: string;   // 'demand' | 'result' | 'matching' | 'team'
  suggestedMode?: 'chat' | 'hermes' | 'smart-agent';
  reason?: string;
}

// 领域关键词到工具的映射
const DOMAIN_TOOL_MAP: Array<{ patterns: RegExp[]; tool: string; domain?: string }> = [
  { patterns: [/政策/, /补贴/, /高新认定/, /加计扣除/, /科技政策/, /产业政策/], tool: 'policy-qa' },
  { patterns: [/政策.*汇编/, /政策.*整理/, /政策.*编撰/], tool: 'policy-compilation' },
  { patterns: [/产业链/, /供应链/, /上下游/, /产业集群/], tool: 'industry-chain-analysis' },
  { patterns: [/企业.*预测/, /技术.*预测/, /公司.*技术/, /技术趋势/], tool: 'enterprise-tech-prediction' },
  { patterns: [/需求.*匹配/, /成果.*匹配/, /对接/, /供需/], tool: 'result-demand-matching' },
  { patterns: [/公司.*调研/, /企业.*背景/, /企业.*画像/], tool: 'company-research' },
  { patterns: [/搜索.*政策/, /查.*政策/], tool: 'web-search' },
];

// 领域分析关键词
const DOMAIN_ANALYSIS_MAP: Array<{ patterns: RegExp[]; domain: string }> = [
  { patterns: [/技术需求/, /需求分析/, /需要.*技术/, /寻求.*合作/], domain: 'demand' },
  { patterns: [/技术成果/, /成果分析/, /专利/, /技术方案/], domain: 'result' },
  { patterns: [/匹配/, /对接/, /供需匹配/], domain: 'matching' },
  { patterns: [/团队/, /人才/, /专家/, /研发团队/], domain: 'team' },
];

export class IntentClassifier {
  /**
   * 快速规则匹配（无 LLM 调用）
   * 高置信度匹配直接返回，避免额外的 LLM 延迟
   */
  classifyFast(userInput: string): IntentClassification | null {
    const input = userInput.toLowerCase();

    // 1. @ 提及匹配（OpenHuman inject.rs Tier 1 模式）
    const atMention = userInput.match(/(?:^|[^a-zA-Z0-9_])@([\w][\w-]*)/);
    if (atMention) {
      const skillName = atMention[1];
      const allSkills = unifiedSkillService.getAllSkills();
      const matched = allSkills.find(s =>
        s.skill.name.toLowerCase().replace(/[\s_-]+/g, '-') ===
        skillName.toLowerCase().replace(/[\s_-]+/g, '-')
      );
      if (matched) {
        return {
          intent: 'skill-execution',
          confidence: 0.95,
          matchedSkill: matched.skill.name,
          reason: `@mention: ${skillName}`,
        };
      }
    }

    // 2. / 命令匹配
    const slashCommand = userInput.match(/^\/([\w][\w-]*)/);
    if (slashCommand) {
      const cmdName = slashCommand[1];
      const allSkills = unifiedSkillService.getAllSkills();
      const matched = allSkills.find(s =>
        s.skill.name.toLowerCase() === cmdName.toLowerCase() ||
        s.skill.name.toLowerCase().replace(/[\s_-]+/g, '-') === cmdName.toLowerCase()
      );
      if (matched) {
        return {
          intent: 'skill-execution',
          confidence: 0.95,
          matchedSkill: matched.skill.name,
          reason: `slash command: /${cmdName}`,
        };
      }
    }

    // 3. 领域关键词 -> 工具匹配
    for (const entry of DOMAIN_TOOL_MAP) {
      if (entry.patterns.some(p => p.test(input))) {
        return {
          intent: 'tool-execution',
          confidence: 0.85,
          matchedTool: entry.tool,
          reason: `domain keyword match: ${entry.tool}`,
        };
      }
    }

    // 4. 领域分析关键词
    for (const entry of DOMAIN_ANALYSIS_MAP) {
      if (entry.patterns.some(p => p.test(input))) {
        return {
          intent: 'domain-analysis',
          confidence: 0.8,
          matchedDomain: entry.domain,
          suggestedMode: 'smart-agent',
          reason: `domain analysis: ${entry.domain}`,
        };
      }
    }

    // 5. 技能触发词匹配
    const recommended = unifiedSkillService.recommendSkills(userInput, 1);
    if (recommended.length > 0 && recommended[0].matchScore >= 40) {
      return {
        intent: 'skill-execution',
        confidence: Math.min(recommended[0].matchScore / 100, 0.9),
        matchedSkill: recommended[0].skill.name,
        reason: `trigger match (score: ${recommended[0].matchScore})`,
      };
    }

    return null; // 无快速匹配，需 LLM 分类
  }

  /**
   * LLM 分类（用于模糊输入）
   * 200 maxTokens 极速分类
   */
  async classifyWithLLM(userInput: string): Promise<IntentClassification> {
    const classificationPrompt = `Classify this user message into exactly one category. Respond with JSON only.

"${userInput.slice(0, 500)}"

Categories:
- simple-chat: General Q&A, greetings, simple questions not requiring tools
- skill-execution: User explicitly wants to use a specific skill or tool
- tool-execution: User needs domain-specific tools (policy QA, industry chain analysis, company research, web search)
- multi-step-task: Complex task requiring planning and multiple execution steps
- domain-analysis: Technical demand/result analysis or supply-demand matching

JSON format: {"intent":"category","confidence":0.0-1.0,"reason":"brief reason"}`;

    try {
      const { claudeChat } = await import('@/services/claudeCode');
      const result = await claudeChat(classificationPrompt, [], { maxTokens: 200 });
      if (result.success && result.output) {
        const jsonMatch = result.output.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            intent: parsed.intent || 'simple-chat',
            confidence: parsed.confidence || 0.5,
            suggestedMode: parsed.intent === 'multi-step-task' ? 'hermes' :
                          parsed.intent === 'domain-analysis' ? 'smart-agent' : 'chat',
            reason: parsed.reason || 'LLM classification',
          };
        }
      }
    } catch {
      // 分类失败，降级为简单对话
    }

    return { intent: 'simple-chat', confidence: 0.5, reason: 'LLM classification failed, defaulting to chat' };
  }

  /**
   * 组合分类：快速规则 + LLM 分类
   * 快速规则 >= 0.8 直接返回，否则用 LLM
   */
  async classify(userInput: string): Promise<IntentClassification> {
    const fast = this.classifyFast(userInput);
    if (fast && fast.confidence >= 0.8) {
      return fast;
    }
    return this.classifyWithLLM(userInput);
  }
}

// 单例
let intentClassifierInstance: IntentClassifier | null = null;

export function getIntentClassifier(): IntentClassifier {
  if (!intentClassifierInstance) {
    intentClassifierInstance = new IntentClassifier();
  }
  return intentClassifierInstance;
}
