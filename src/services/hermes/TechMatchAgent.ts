/**
 * TechMatch Agent - 技术需求/成果/团队智能匹配系统
 *
 * 融合hermes-agent技能系统，实现：
 * 1. 技术需求分析
 * 2. 技术成果分析
 * 3. 需求-成果/团队智能匹配
 * 4. 所有功能通过AI对话一键调用
 */

import { v4 as uuidv4 } from 'uuid';
import { claudeChat } from '@/services/claudeCode';
import { searchService } from '@/services/search';

// 分析结果类型
export interface DemandAnalysis {
  id: string;
  content: string;
  keywords: string[];
  industry: string[];
  techFields: string[];
  maturity: 'concept' | 'prototype' | 'producing' | 'mature';
  complexity: 'simple' | 'moderate' | 'complex';
  budget?: string;
  timeline?: string;
  report: string;
  createdAt: string;
}

export interface TechResultAnalysis {
  id: string;
  content: string;
  title: string;
  innovation: {
    score: number;
    highlights: string[];
    comparison: string;
  };
  maturity: {
    level: number; // TRL 1-9
    status: string;
    evidence: string[];
  };
  marketValue: {
    score: number;
    targetMarket: string;
    advantages: string[];
    applications: string[];
  };
  transferPath: string[];
  report: string;
  createdAt: string;
}

export interface MatchResult {
  id: string;
  demandId: string;
  resultId?: string;
  score: number;
  matchType: 'demand-to-result' | 'result-to-demand' | 'team-matching';
  highlights: string[];
  gaps: string[];
  suggestions: string[];
  cooperationMode: string;
  report: string;
  createdAt: string;
}

// 匹配工具
interface MatchingTool {
  id: string;
  name: string;
  description: string;
  execute: (params: Record<string, unknown>) => Promise<{ success: boolean; output?: string; error?: string }>;
}

// TechMatch Agent
export class TechMatchAgent {
  private tools: Map<string, MatchingTool> = new Map();

  constructor() {
    this.initializeTools();
  }

  // 初始化工具
  private initializeTools(): void {
    // 技术需求分析工具
    this.registerTool({
      id: 'demand-analysis',
      name: 'demand_analysis',
      description: '深度分析技术需求，包括背景、目标、可行性',
      execute: async (params) => {
        const { demand } = params;
        if (!demand) return { success: false, error: '未提供需求描述' };

        const result = await this.analyzeDemand(demand as string);
        return {
          success: true,
          output: result.report,
        };
      },
    });

    // 技术成果分析工具
    this.registerTool({
      id: 'result-analysis',
      name: 'result_analysis',
      description: '评估技术成果的创新性、成熟度、市场价值',
      execute: async (params) => {
        const { result: resultContent, title } = params;
        if (!resultContent) return { success: false, error: '未提供成果描述' };

        const result = await this.analyzeTechResult(resultContent as string, title as string);
        return {
          success: true,
          output: result.report,
        };
      },
    });

    // 双向匹配工具
    this.registerTool({
      id: 'smart-matching',
      name: 'smart_matching',
      description: '在技术成果和技术需求之间进行智能匹配',
      execute: async (params) => {
        const { demand, result } = params;
        if (!demand && !result) {
          return { success: false, error: '请提供技术需求或技术成果' };
        }

        const matchResult = await this.performMatching(
          demand as string | undefined,
          result as string | undefined
        );
        return {
          success: true,
          output: matchResult.report,
        };
      },
    });

    // 团队匹配工具
    this.registerTool({
      id: 'team-matching',
      name: 'team_matching',
      description: '根据技术需求匹配合适的团队或专家',
      execute: async (params) => {
        const { demand, teamRequirements } = params;
        if (!demand) return { success: false, error: '未提供需求描述' };

        const result = await this.matchTeam(demand as string, teamRequirements as string | undefined);
        return {
          success: true,
          output: result.report,
        };
      },
    });
  }

  // 注册工具
  private registerTool(tool: MatchingTool): void {
    this.tools.set(tool.id, tool);
  }

  // 获取所有工具
  getTools(): MatchingTool[] {
    return Array.from(this.tools.values());
  }

  // 执行工具
  async executeTool(toolId: string, params: Record<string, unknown>): Promise<{ success: boolean; output?: string; error?: string }> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { success: false, error: `未找到工具: ${toolId}` };
    }
    return tool.execute(params);
  }

  // ============================================
  // 核心功能：技术需求分析
  // ============================================
  async analyzeDemand(demandText: string): Promise<DemandAnalysis> {
    const id = uuidv4();

    // 关键词提取
    const keywords = this.extractKeywords(demandText);

    // 行业识别
    const industry = this.identifyIndustry(demandText);

    // 技术领域识别
    const techFields = this.identifyTechFields(demandText);

    // 复杂度评估
    const complexity = this.evaluateComplexity(demandText);

    // 生成分析报告
    const report = await this.generateDemandReport({
      demandText,
      keywords,
      industry,
      techFields,
      complexity,
    });

    return {
      id,
      content: demandText,
      keywords,
      industry,
      techFields,
      maturity: 'prototype',
      complexity,
      report,
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================
  // 核心功能：技术成果分析
  // ============================================
  async analyzeTechResult(resultText: string, title?: string): Promise<TechResultAnalysis> {
    const id = uuidv4();

    // 使用AI分析成果
    const analysisPrompt = `你是技术成果评估专家。请分析以下技术成果：

技术成果：${resultText}
${title ? `成果标题：${title}` : ''}

请评估以下维度并给出结构化分析：

1. **创新性评估** (0-100分)
   - 核心创新点
   - 与现有技术对比
   - 专利保护情况

2. **成熟度评估** (TRL 1-9)
   - 当前状态
   - 验证证据
   - 产业化准备

3. **市场价值评估** (0-100分)
   - 目标市场
   - 竞争优势
   - 应用场景

请以JSON格式返回：
{
  "innovation": {
    "score": 评分,
    "highlights": ["亮点1", "亮点2"],
    "comparison": "与现有技术对比"
  },
  "maturity": {
    "level": TRL等级,
    "status": "状态描述",
    "evidence": ["证据1", "证据2"]
  },
  "marketValue": {
    "score": 评分,
    "targetMarket": "目标市场",
    "advantages": ["优势1", "优势2"],
    "applications": ["应用场景1", "应用场景2"]
  }
}`;

    const aiResult = await claudeChat(analysisPrompt);
    let analysis = {
      innovation: { score: 75, highlights: ['技术创新点'], comparison: '国内领先' },
      maturity: { level: 6, status: '中试阶段', evidence: ['完成实验室验证'] },
      marketValue: { score: 70, targetMarket: '制造业', advantages: ['成本优势'], applications: ['工业检测'] },
    };

    if (aiResult.success && aiResult.output) {
      try {
        const jsonMatch = aiResult.output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.innovation && parsed.maturity && parsed.marketValue) {
            analysis = parsed;
          }
        }
      } catch { /* ignore */ }
    }

    const report = await this.generateResultReport(resultText, title, analysis);

    return {
      id,
      content: resultText,
      title: title || '未命名成果',
      innovation: analysis.innovation,
      maturity: analysis.maturity,
      marketValue: analysis.marketValue,
      transferPath: this.suggestTransferPath(analysis),
      report,
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================
  // 核心功能：智能匹配
  // ============================================
  async performMatching(demandText?: string, resultText?: string): Promise<MatchResult> {
    const id = uuidv4();
    const matchType = demandText && resultText ? 'demand-to-result' :
                      demandText ? 'demand-to-result' : 'result-to-demand';

    // 执行AI匹配分析
    const matchingPrompt = `你是技术经济匹配专家。请分析技术供需匹配情况。

匹配类型: ${matchType === 'demand-to-result' ? '需求找成果' : '成果找需求'}

技术需求:
${demandText || '未提供'}

技术成果:
${resultText || '未提供'}

请进行深度匹配分析，评估：
1. 匹配度评分 (0-100)
2. 高度匹配的要点 (3-5个)
3. 存在差异的点
4. 合作建议

请以JSON格式返回：
{
  "score": 匹配度评分,
  "matchType": "${matchType}",
  "highlights": ["亮点1", "亮点2", "亮点3"],
  "gaps": ["差异点1", "差异点2"],
  "suggestions": ["建议1", "建议2"],
  "cooperationMode": "建议的合作模式"
}`;

    const aiResult = await claudeChat(matchingPrompt);
    let matchAnalysis = {
      score: 75,
      highlights: ['技术方向契合', '应用场景重叠'],
      gaps: ['成熟度差异', '规模差异'],
      suggestions: ['建议小规模试点', '加强技术对接'],
      cooperationMode: '技术转让或联合研发',
    };

    if (aiResult.success && aiResult.output) {
      try {
        const jsonMatch = aiResult.output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.score !== undefined) {
            matchAnalysis = parsed;
          }
        }
      } catch { /* ignore */ }
    }

    const report = await this.generateMatchingReport(
      matchType,
      demandText,
      resultText,
      matchAnalysis
    );

    return {
      id,
      demandId: demandText ? uuidv4() : '',
      resultId: resultText ? uuidv4() : undefined,
      score: matchAnalysis.score,
      matchType,
      highlights: matchAnalysis.highlights,
      gaps: matchAnalysis.gaps,
      suggestions: matchAnalysis.suggestions,
      cooperationMode: matchAnalysis.cooperationMode,
      report,
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================
  // 核心功能：团队匹配
  // ============================================
  async matchTeam(demandText: string, teamRequirements?: string): Promise<MatchResult> {
    const id = uuidv4();

    // 搜索相关团队/专家
    const searchQuery = `${demandText} 技术团队 研发`;
    const searchResponse = await searchService.search({
      query: searchQuery,
      numResults: 5,
    });

    let searchContext = '';
    if (searchResponse.success && searchResponse.results.length > 0) {
      searchContext = searchResponse.results.map(r =>
        `【${r.title}】\n${r.snippet}\n来源: ${r.source || '未知'}`
      ).join('\n\n');
    }

    const matchingPrompt = `你是技术团队匹配专家。请根据需求匹配合适的团队。

技术需求：${demandText}
${teamRequirements ? `团队要求：${teamRequirements}` : ''}

参考信息：
${searchContext || '暂无搜索数据'}

请评估匹配度并给出建议。

请以JSON格式返回：
{
  "score": 匹配度评分,
  "highlights": ["匹配亮点1", "匹配亮点2"],
  "gaps": ["差距点1", "差距点2"],
  "suggestions": ["建议1", "建议2"],
  "cooperationMode": "合作模式建议"
}`;

    const aiResult = await claudeChat(matchingPrompt);
    let matchAnalysis = {
      score: 70,
      highlights: ['技术方向匹配', '团队经验相符'],
      gaps: ['规模差异'],
      suggestions: ['建议进一步沟通', '了解团队详细情况'],
      cooperationMode: '项目合作或技术顾问',
    };

    if (aiResult.success && aiResult.output) {
      try {
        const jsonMatch = aiResult.output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.score !== undefined) {
            matchAnalysis = parsed;
          }
        }
      } catch { /* ignore */ }
    }

    const report = this.generateTeamMatchingReport(demandText, matchAnalysis);

    return {
      id,
      demandId: uuidv4(),
      score: matchAnalysis.score,
      matchType: 'team-matching',
      highlights: matchAnalysis.highlights,
      gaps: matchAnalysis.gaps,
      suggestions: matchAnalysis.suggestions,
      cooperationMode: matchAnalysis.cooperationMode,
      report,
      createdAt: new Date().toISOString(),
    };
  }

  // ============================================
  // 辅助方法
  // ============================================

  private extractKeywords(text: string): string[] {
    const words = text.split(/[\s,，、]+/)
      .filter(w => w.length > 2)
      .slice(0, 10);
    return words;
  }

  private identifyIndustry(text: string): string[] {
    const industries: string[] = [];
    const textLower = text.toLowerCase();

    const industryMap: Record<string, string[]> = {
      '人工智能': ['ai', '人工智能', '机器学习', '深度学习'],
      '半导体': ['芯片', '半导体', '集成电路', 'ic'],
      '新能源': ['电池', '光伏', '储能', '氢能', '新能源'],
      '生物医药': ['医药', '生物', '药物', '疫苗', '医疗'],
      '智能制造': ['制造', '工业', '机器人', '自动化'],
      '新材料': ['材料', '纳米', '高分子', '复合材料'],
      '新一代信息技术': ['5g', '6g', '物联网', '云计算', '大数据'],
    };

    for (const [industry, keywords] of Object.entries(industryMap)) {
      if (keywords.some(kw => textLower.includes(kw))) {
        industries.push(industry);
      }
    }

    return industries.length > 0 ? industries : ['其他'];
  }

  private identifyTechFields(text: string): string[] {
    const fields: string[] = [];
    const textLower = text.toLowerCase();

    const techMap: Record<string, string[]> = {
      '软件开发': ['软件', 'app', 'web', '前端', '后端'],
      '硬件设计': ['硬件', '电路', 'pcb', '嵌入式'],
      '算法研发': ['算法', '模型', '训练', '优化'],
      '系统集成': ['系统', '集成', '平台', '架构'],
      '数据科学': ['数据', '分析', '挖掘', '可视化'],
    };

    for (const [field, keywords] of Object.entries(techMap)) {
      if (keywords.some(kw => textLower.includes(kw))) {
        fields.push(field);
      }
    }

    return fields.length > 0 ? fields : ['综合技术'];
  }

  private evaluateComplexity(text: string): 'simple' | 'moderate' | 'complex' {
    const length = text.length;
    const hasMultipleParts = text.includes('并且') || text.includes('同时') || text.includes('还需');

    if (length > 500 || hasMultipleParts) return 'complex';
    if (length > 100) return 'moderate';
    return 'simple';
  }

  private suggestTransferPath(analysis: { maturity: { level: number }; marketValue: { score: number } }): string[] {
    const paths: string[] = [];
    const trl = analysis.maturity.level;
    const marketScore = analysis.marketValue.score;

    if (trl < 4) {
      paths.push('技术孵化', '产学研合作', '联合研发');
    } else if (trl < 7) {
      paths.push('中试合作', '技术许可', '技术入股');
    } else {
      paths.push('技术转让', '技术许可', '产业化合作');
    }

    if (marketScore > 70) {
      paths.push('产业化投资', '市场推广');
    }

    return paths;
  }

  // 生成需求分析报告
  private async generateDemandReport(params: {
    demandText: string;
    keywords: string[];
    industry: string[];
    techFields: string[];
    complexity: 'simple' | 'moderate' | 'complex';
  }): Promise<string> {
    const { demandText, keywords, industry, techFields, complexity } = params;

    const report = `📋 **技术需求分析报告**

## 一、需求概述
${demandText}

## 二、关键词提取
${keywords.map(k => `- ${k}`).join('\n')}

## 三、行业领域
${industry.map(i => `- ${i}`).join('\n')}

## 四、技术领域
${techFields.map(t => `- ${t}`).join('\n')}

## 五、复杂度评估
- **复杂度等级**: ${complexity === 'simple' ? '简单' : complexity === 'moderate' ? '中等' : '复杂'}
- **需求描述长度**: ${demandText.length} 字符

## 六、建议行动
1. ${complexity === 'complex' ? '建议进行深度技术调研' : '可以进行快速原型开发'}
2. 根据技术领域选择合适的团队
3. 制定详细的项目计划

---
*由AI技术经理人自动生成*`;

    return report;
  }

  // 生成成果分析报告
  private async generateResultReport(
    resultText: string,
    title: string | undefined,
    analysis: {
      innovation: { score: number; highlights: string[]; comparison: string };
      maturity: { level: number; status: string; evidence: string[] };
      marketValue: { score: number; targetMarket: string; advantages: string[]; applications: string[] };
    }
  ): Promise<string> {
    const report = `🔬 **技术成果分析报告**

## 一、成果概述
${title ? `**标题**: ${title}\n\n` : ''}**成果描述**: ${resultText}

## 二、创新性评估
- **评分**: ${analysis.innovation.score}/100
- **核心亮点**:
${analysis.innovation.highlights.map(h => `  - ${h}`).join('\n')}
- **技术对比**: ${analysis.innovation.comparison}

## 三、成熟度评估
- **TRL等级**: ${analysis.maturity.level} (${this.getTRLDescription(analysis.maturity.level)})
- **当前状态**: ${analysis.maturity.status}
- **验证证据**:
${analysis.maturity.evidence.map(e => `  - ${e}`).join('\n')}

## 四、市场价值评估
- **评分**: ${analysis.marketValue.score}/100
- **目标市场**: ${analysis.marketValue.targetMarket}
- **竞争优势**:
${analysis.marketValue.advantages.map(a => `  - ${a}`).join('\n')}
- **应用场景**:
${analysis.marketValue.applications.map(a => `  - ${a}`).join('\n')}

## 五、转化建议
${this.suggestTransferPath(analysis).map(p => `- ${p}`).join('\n')}

---
*由AI技术经理人自动生成*`;

    return report;
  }

  // 生成匹配报告
  private async generateMatchingReport(
    matchType: string,
    demandText: string | undefined,
    resultText: string | undefined,
    analysis: {
      score: number;
      highlights: string[];
      gaps: string[];
      suggestions: string[];
      cooperationMode: string;
    }
  ): Promise<string> {
    const report = `🤝 **技术供需匹配分析报告**

## 一、匹配概述
- **匹配类型**: ${matchType === 'demand-to-result' ? '需求找成果' : '成果找需求'}
- **匹配评分**: ${analysis.score}/100
- **合作模式**: ${analysis.cooperationMode}

## 二、技术需求
${demandText || '未提供'}

## 三、技术成果
${resultText || '未提供'}

## 四、匹配亮点
${analysis.highlights.map(h => `- ${h}`).join('\n')}

## 五、差异分析
${analysis.gaps.map(g => `- ${g}`).join('\n')}

## 六、合作建议
${analysis.suggestions.map(s => `- ${s}`).join('\n')}

## 七、推荐合作模式
**${analysis.cooperationMode}**

---
*由AI技术经理人自动生成*`;

    return report;
  }

  // 生成团队匹配报告
  private generateTeamMatchingReport(
    demandText: string,
    analysis: {
      score: number;
      highlights: string[];
      gaps: string[];
      suggestions: string[];
      cooperationMode: string;
    }
  ): string {
    return `👥 **团队匹配分析报告**

## 一、需求概述
${demandText}

## 二、匹配评分
**${analysis.score}/100**

## 三、匹配亮点
${analysis.highlights.map(h => `- ${h}`).join('\n')}

## 四、差距分析
${analysis.gaps.map(g => `- ${g}`).join('\n')}

## 五、建议
${analysis.suggestions.map(s => `- ${s}`).join('\n')}

## 六、推荐合作模式
**${analysis.cooperationMode}**

---
*由AI技术经理人自动生成*`;
  }

  // 获取TRL等级描述
  private getTRLDescription(level: number): string {
    const trlDescriptions: Record<number, string> = {
      1: '基本原理验证',
      2: '技术概念确认',
      3: '关键功能验证',
      4: '实验室环境验证',
      5: '相关环境验证',
      6: '相关环境原型演示',
      7: ' operational environment原型演示',
      8: '系统完成并通过验证',
      9: '系统通过实际运行验证',
    };
    return trlDescriptions[level] || '未知';
  }
}

// 单例实例
let techMatchAgentInstance: TechMatchAgent | null = null;

export function getTechMatchAgent(): TechMatchAgent {
  if (!techMatchAgentInstance) {
    techMatchAgentInstance = new TechMatchAgent();
  }
  return techMatchAgentInstance;
}

export default TechMatchAgent;
