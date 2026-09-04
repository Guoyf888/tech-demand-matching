import { Skill } from '@/types';
import { skillStore } from './skillStore';

export const builtInSkills: Skill[] = [
  {
    id: 'skill_find-skills',
    name: 'find-skills',
    description: '搜索和发现其他可用的AI技能，帮助用户找到适合特定任务的技能',
    version: '1.0.0',
    enabled: true,
    icon: '🔍',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_creator',
    name: 'Skill Creator',
    description: '创建新的AI技能，帮助用户自定义开发专属技能',
    version: '1.0.0',
    enabled: true,
    icon: '🛠️',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_summarize',
    name: 'summarize',
    description: '快速总结长文本、文档、会议记录等内容为简洁摘要',
    version: '1.0.0',
    enabled: true,
    icon: '📝',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
    content: `# Summarize Skill

You are a professional text summarization expert. Your task is to create clear, concise summaries.

## Workflow
1. Read the provided text carefully
2. Identify the main topics and key points
3. Create a structured summary with:
   - **Core Topic**: One sentence describing what the text is about
   - **Key Points**: 3-5 bullet points of the most important information
   - **Conclusion/Action Items**: If applicable, any conclusions or next steps

## Output Format
- Use clear, professional Chinese
- Keep the summary to 1/3 of the original length or less
- Preserve important numbers, dates, and proper nouns
- Use bullet points for readability`,
    triggers: ['总结', '摘要', '概括', 'summarize', 'summary', '概要', '提炼'],
  },
  {
    id: 'skill_supermemory',
    name: 'Supermemory',
    description: '强大的记忆能力，跨对话记住用户偏好、历史交互和重要上下文',
    version: '1.0.0',
    enabled: true,
    icon: '🧠',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
  },
  {
    id: 'skill_deep-research',
    name: 'deep-research',
    description: '深度研究能力，对复杂主题进行深入分析和多角度调研',
    version: '1.0.0',
    enabled: true,
    icon: '🔬',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    pinned: true,
    isBuiltIn: true,
    content: `# Deep Research Skill

You are a research analyst specializing in technology and innovation. Perform deep, multi-angle research on the given topic.

## Research Framework
1. **Background**: Provide context and current state of the topic
2. **Key Players**: Identify major organizations, researchers, or companies involved
3. **Technical Analysis**: Explain the underlying technology or methodology
4. **Market/Impact Analysis**: Assess market size, trends, and potential impact
5. **Challenges & Risks**: Identify current limitations and potential obstacles
6. **Future Outlook**: Predict trends and opportunities

## Output Requirements
- Cite specific data points and examples where possible
- Use structured headings for each section
- Provide both Chinese and international perspectives
- Include actionable insights and recommendations
- Length: comprehensive but focused (800-1500 words)`,
    triggers: ['深度研究', '调研', '深入分析', 'research', '研究', 'survey', '综述'],
  },
  {
    id: 'skill_search',
    name: '智能搜索',
    description: '搜索网络、文档和历史记录',
    version: '1.0.0',
    enabled: true,
    icon: '🔍',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    isBuiltIn: true,
  },
  {
    id: 'skill_document',
    name: '文档处理',
    description: '解析PDF、Word、Markdown文档',
    version: '1.0.0',
    enabled: true,
    icon: '📄',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    isBuiltIn: true,
  },
  {
    id: 'skill_code',
    name: '代码助手',
    description: '代码审查、生成、解释',
    version: '1.0.0',
    enabled: true,
    icon: '💻',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    isBuiltIn: true,
    content: `# Code Assistant Skill

You are an expert software engineer. Help with code-related tasks including review, generation, and explanation.

## Capabilities
- **Code Review**: Identify bugs, security issues, performance problems, and style improvements
- **Code Generation**: Write clean, efficient, well-structured code
- **Code Explanation**: Explain what code does in clear, accessible language

## Guidelines
- Always consider edge cases and error handling
- Follow language-specific best practices and conventions
- Provide code with clear comments for complex logic
- When reviewing, categorize issues as: Critical / Warning / Suggestion
- Output code in properly formatted code blocks with language tags`,
    triggers: ['代码', '编程', '审查代码', 'code', 'coding', 'review', '写代码'],
  },
  {
    id: 'skill_analysis',
    name: '数据分析',
    description: '数据分析、可视化、报告生成',
    version: '1.0.0',
    enabled: true,
    icon: '📊',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    isBuiltIn: true,
    content: `# Data Analysis Skill

You are a data analyst specializing in technology and business metrics. Analyze data and provide actionable insights.

## Analysis Framework
1. **Data Overview**: Describe the data structure, volume, and time range
2. **Statistical Summary**: Key metrics (mean, median, trends, distributions)
3. **Pattern Detection**: Identify trends, anomalies, and correlations
4. **Root Cause Analysis**: For any anomalies found, hypothesize causes
5. **Recommendations**: Provide data-driven suggestions

## Output Format
- Use tables for structured data comparison
- Include percentage changes and growth rates where relevant
- Highlight key findings in bold
- Provide both summary-level and detailed analysis
- Conclude with 3-5 actionable recommendations`,
    triggers: ['数据分析', '数据可视化', '统计', 'analysis', 'data', '报告'],
  },
  {
    id: 'skill_notification',
    name: '消息推送',
    description: '邮件、短信、API推送通知',
    version: '1.0.0',
    enabled: false,
    icon: '🔔',
    actions: [],
    metadata: {
      createdAt: new Date().toISOString(),
      usageCount: 0,
      successRate: 0,
    },
    group: '内置',
    isBuiltIn: true,
  },
];

export function getBuiltInSkills(): Skill[] {
  const stored = skillStore.getAll();
  const storedIds = new Set(stored.map((skill) => skill.id));
  const missingBuiltIns = builtInSkills.filter((skill) => !storedIds.has(skill.id));

  for (const skill of missingBuiltIns) {
    skillStore.save(skill);
  }

  return [...stored, ...missingBuiltIns];
}
