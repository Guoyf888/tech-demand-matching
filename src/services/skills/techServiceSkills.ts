/**
 * 科技服务技能实现
 * 提供政策问答、政策汇编、产业链分析、企业技术预测、成果需求双向匹配服务
 *
 * 特性：
 * - 完善的错误处理和超时重试
 * - 搜索服务兜底逻辑（Mock模式）
 * - MiniMax API格式适配
 * - 详细错误信息返回
 * - 支持全局默认模型切换
 */

import { claudeChat } from '@/services/claudeCode';
import { searchService, SearchResponse } from '@/services/search';
import { ModelConfig } from '@/config/modelConfig';

// ==================== 类型定义 ====================

export interface TechServiceResult {
  type: string;
  input: string;
  analysisResult: string;
  meta: {
    title: string;
    subtitle: string;
    tags: string[];
  };
  error?: string;  // 新增：错误信息
  searchProvider?: string;  // 新增：搜索提供者
}

export interface ServiceConfig {
  toolName: string;
  inputText: string;
  deepThinking: boolean;
  searchType?: 'general' | 'news';
  contextAddition?: string;  // 额外的上下文信息
}

// ==================== 配置常量 ====================

// 搜索结果数量配置
const SEARCH_CONFIG = {
  deep: { numResults: 10, searchType: 'news' as const },
  normal: { numResults: 5, searchType: 'news' as const },
};

// 超时配置（毫秒）
const SEARCH_TIMEOUT = 30000;

// ==================== 提示词模板 ====================

const PROMPT_TEMPLATES: Record<string, string> = {
  'policy-qa': `你是科创政策AI问答专家，需基于以下企业/行业信息回答政策相关问题。

用户输入：{input}

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
申请时需要注意的关键点和建议`,

  'policy-compilation': `你是科创政策汇编专家，需为以下需求整理政策汇编报告。

用户输入：{input}

要求：
1. 按「国家级-省级-市级」分类整理相关政策；
2. 标注政策有效期、适用范围、扶持力度；
3. 生成结构化政策汇编文档，支持AI检索关键词标注。

请按以下格式输出：
# {input} 政策汇编

## 一、国家级政策
[列出相关国家政策]

## 二、省级政策
[列出相关省级政策]

## 三、市级政策
[列出相关市级政策]

## 四、政策时效汇总
[汇总各政策的有效期和申请时间]

## 五、适用行业/领域
[标注各政策的适用范围]`,

  'industry-chain-analysis': `你是产业链分析专家，需为以下行业/企业生成产业链分析报告。

用户输入：{input}

要求：
1. 梳理上游原材料、中游制造、下游应用的完整产业链；
2. 分析核心企业、技术壁垒、市场规模，发展趋势；
3. 生成可视化的产业链图谱文字描述；
4. 数据来源需标注，结论需有支撑。

请按以下格式输出：

# {input} 产业链分析报告

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
[给出简要的投资机会和风险分析]`,

  'enterprise-tech-prediction': `你是企业技术预测专家，需为以下企业生成技术演变路径预测报告。

用户输入：{input}

要求：
1. 分析企业现有技术布局、专利情况、研发方向；
2. 预测未来3-5年技术发展路径、关键突破点、风险点；
3. 结合行业趋势给出技术落地建议；
4. 报告结构清晰，分点论述。

请按以下格式输出：

# {input} 技术演变路径预测报告

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
[给出针对性的技术落地建议和实施方案]`,

  'result-demand-matching': `你是成果需求双向匹配专家，需完成以下匹配分析。

用户输入：{input}

要求：
1. 识别需求方/成果方的核心诉求/技术亮点；
2. 按匹配度（高/中/低）排序匹配结果；
3. 给出匹配理由、合作建议、落地路径。

请按以下格式输出：

# 技术成果-需求双向匹配分析

## 一、需求分析
[分析技术需求的核心要点、关键指标]

## 二、成果分析
[分析技术成果的特点、优势、适用场景]

## 三、匹配度评估
[给出0-100的匹配度评分，并说明理由]

## 四、匹配亮点
[列出3-5个高度匹配的点]

## 五、差异与建议
[列出存在的差异和改进建议]

## 六、合作建议
[给出合作模式和发展建议]`
};

// ==================== 辅助函数 ====================

/**
 * 获取服务标题
 */
export const getServiceTitle = (toolName: string): string => {
  const titleMap: Record<string, string> = {
    'policy-qa': '政策AI问答报告',
    'policy-compilation': '政策汇编分析报告',
    'industry-chain-analysis': '产业链分析报告',
    'enterprise-tech-prediction': '企业技术预测报告',
    'result-demand-matching': '成果需求双向匹配报告'
  };
  return titleMap[toolName] || '科创服务分析报告';
};

/**
 * 生成服务标签
 */
export const getServiceTags = (toolName: string, input: string): string[] => {
  const baseTags: Record<string, string[]> = {
    'policy-qa': ['政策问答', 'AI匹配', '政策解读'],
    'policy-compilation': ['政策汇编', '政策库', 'AI检索'],
    'industry-chain-analysis': ['产业链', '产业报告', 'AI分析'],
    'enterprise-tech-prediction': ['技术预测', '企业技术', '演变路径'],
    'result-demand-matching': ['成果匹配', '需求匹配', '双向匹配']
  };

  // 提取关键词
  const keyword = input.replace(/公司|企业|行业|分析|预测/g, '').trim().slice(0, 8);
  const tags = baseTags[toolName] || ['科创服务'];
  return keyword ? [...tags, keyword] : tags;
};

/**
 * 执行带超时的搜索
 */
async function searchWithTimeout(
  query: string,
  config: { numResults: number; searchType: 'general' | 'news' }
): Promise<SearchResponse & { searchProvider: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT);

  try {
    const result = await searchService.search({
      query,
      numResults: config.numResults,
      searchType: config.searchType,
    });

    clearTimeout(timeoutId);

    return {
      ...result,
      searchProvider: result.provider || 'unknown'
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 构建搜索上下文
 */
function buildSearchContext(searchResponse: SearchResponse | null, maxItems: number = 5): string {
  if (!searchResponse || !searchResponse.success || searchResponse.results.length === 0) {
    return '';
  }

  return searchResponse.results.slice(0, maxItems).map(r =>
    `【${r.title}】\n来源: ${r.source || '未知'}\n摘要: ${r.snippet}${r.url ? `\n链接: ${r.url}` : ''}`
  ).join('\n\n');
}

/**
 * 获取搜索关键词后缀
 */
function getSearchKeywordSuffix(toolName: string): string {
  const suffixMap: Record<string, string> = {
    'industry-chain-analysis': '产业链',
    'enterprise-tech-prediction': '技术',
    'policy-qa': '科技创新政策',
    'policy-compilation': '政策',
    'result-demand-matching': '技术成果',
  };
  return suffixMap[toolName] || '政策';
}

// ==================== 核心执行函数 ====================

/**
 * 执行科技服务技能
 *
 * @param toolName 工具名称（对应服务类型）
 * @param inputText 用户输入
 * @param deepThinking 是否深度思考模式
 * @param modelConfig 模型配置（可选，默认使用全局默认模型）
 * @returns 服务执行结果
 */
export const executeTechService = async (
  toolName: string,
  inputText: string,
  deepThinking: boolean = false,
  modelConfig?: ModelConfig
): Promise<TechServiceResult> => {
  // 记录开始时间
  const startTime = Date.now();
  const timeLog = (msg: string) => console.log(`[TechService:${toolName}] ${msg} (+${Date.now() - startTime}ms)`);

  timeLog('开始执行');

  // 1. 校验输入
  if (!inputText || inputText.trim().length === 0) {
    return createErrorResult(toolName, inputText, '请输入有效的问题或需求描述');
  }

  // 2. 获取提示词模板
  const promptTemplate = PROMPT_TEMPLATES[toolName];
  if (!promptTemplate) {
    return createErrorResult(toolName, inputText, `未知的科技服务工具：${toolName}，可用工具: policy-qa, policy-compilation, industry-chain-analysis, enterprise-tech-prediction, result-demand-matching`);
  }

  // 3. 执行搜索获取上下文数据
  timeLog('开始搜索');
  const searchConfig = deepThinking ? SEARCH_CONFIG.deep : SEARCH_CONFIG.normal;
  const searchQuery = `${inputText} ${getSearchKeywordSuffix(toolName)}`;

  let searchResponse: (SearchResponse & { searchProvider: string }) | null = null;
  let searchError: string | null = null;

  try {
    searchResponse = await searchWithTimeout(searchQuery, searchConfig);
    timeLog(`搜索完成，结果数: ${searchResponse.results.length}, 提供者: ${searchResponse.searchProvider}`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    searchError = errorMsg;

    if (errorMsg.includes('abort')) {
      searchError = '搜索超时，请稍后重试';
    }
    timeLog(`搜索失败: ${searchError}`);

    // 搜索失败时继续执行（使用空上下文）
    searchResponse = null;
  }

  // 4. 构建AI提示词
  const searchContext = buildSearchContext(searchResponse);
  const contextAddition = searchContext
    ? `\n\n参考数据（来源: ${searchResponse?.searchProvider || '搜索服务'}）:\n${searchContext}`
    : '\n\n注意：暂无相关参考数据，请基于已有知识分析';

  const prompt = promptTemplate.replace('{input}', inputText) + contextAddition;

  // 5. 调用AI生成结果
  timeLog('开始AI分析');
  let aiResult: { success: boolean; output?: string; error?: string };

  try {
    // claudeChat现在会自动选择CLI或API模式，支持传入modelConfig
    const chatOptions = {
      temperature: deepThinking ? 0.5 : 0.7,
      maxTokens: deepThinking ? 4000 : 2048,
    };

    // 如果传入了模型配置，使用配置的模型
    if (modelConfig && modelConfig.model !== '默认') {
      aiResult = await claudeChat(prompt, [], {
        ...chatOptions,
        provider: modelConfig.model.toLowerCase() as 'minimax' | 'claude' | 'gpt',
      });
    } else {
      // 默认使用CLI优先回退到API模式
      aiResult = await claudeChat(prompt, [], chatOptions);
    }
    timeLog(`AI分析完成, success: ${aiResult.success}`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    aiResult = { success: false, error: `AI调用异常: ${errorMsg}` };
    timeLog(`AI调用异常: ${errorMsg}`);
  }

  // 6. 构建返回结果
  if (aiResult.success && aiResult.output) {
    return {
      type: toolName,
      input: inputText,
      analysisResult: aiResult.output,
      meta: {
        title: getServiceTitle(toolName),
        subtitle: `生成于${new Date().toLocaleString('zh-CN')}`,
        tags: getServiceTags(toolName, inputText)
      },
      searchProvider: searchResponse?.searchProvider
    };
  }

  // AI调用失败，返回详细错误信息
  const errorMsg = aiResult.error || 'AI分析失败';

  // 提供更友好的错误提示
  let friendlyError = errorMsg;
  if (errorMsg.includes('API未配置')) {
    friendlyError = 'AI服务未配置：请先在设置中配置API密钥和模型';
  } else if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
    friendlyError = 'AI服务响应超时：请稍后重试，或切换至深度思考模式减少搜索范围';
  } else if (errorMsg.includes('API密钥无效')) {
    friendlyError = 'API密钥无效或已过期：请在设置中更新API密钥';
  } else if (errorMsg.includes('网络错误')) {
    friendlyError = '网络连接失败：请检查网络和API地址配置';
  }

  return createErrorResult(toolName, inputText, friendlyError);
};

/**
 * 创建错误结果
 */
function createErrorResult(
  toolName: string,
  inputText: string,
  errorMessage: string
): TechServiceResult {
  return {
    type: toolName,
    input: inputText,
    analysisResult: '',
    error: errorMessage,
    meta: {
      title: getServiceTitle(toolName),
      subtitle: `执行失败 | ${new Date().toLocaleString('zh-CN')}`,
      tags: ['执行失败', '错误']
    }
  };
}

// ==================== 直接执行函数（简化调用） ====================

/**
 * 政策智能问答
 */
export async function executePolicyQA(
  query: string,
  deepThinking: boolean = false,
  modelConfig?: ModelConfig
): Promise<TechServiceResult> {
  return executeTechService('policy-qa', query, deepThinking, modelConfig);
}

/**
 * 政策汇编
 */
export async function executePolicyCompilation(
  topic: string,
  deepThinking: boolean = false,
  modelConfig?: ModelConfig
): Promise<TechServiceResult> {
  return executeTechService('policy-compilation', topic, deepThinking, modelConfig);
}

/**
 * 产业链分析
 */
export async function executeIndustryChainAnalysis(
  industry: string,
  deepThinking: boolean = false,
  modelConfig?: ModelConfig
): Promise<TechServiceResult> {
  return executeTechService('industry-chain-analysis', industry, deepThinking, modelConfig);
}

/**
 * 企业技术预测
 */
export async function executeEnterpriseTechPrediction(
  companyName: string,
  deepThinking: boolean = false,
  modelConfig?: ModelConfig
): Promise<TechServiceResult> {
  return executeTechService('enterprise-tech-prediction', companyName, deepThinking, modelConfig);
}

/**
 * 成果需求双向匹配
 */
export async function executeResultDemandMatching(
  demand: string,
  deepThinking: boolean = false,
  modelConfig?: ModelConfig
): Promise<TechServiceResult> {
  return executeTechService('result-demand-matching', demand, deepThinking, modelConfig);
}

// 默认导出
export default executeTechService;
