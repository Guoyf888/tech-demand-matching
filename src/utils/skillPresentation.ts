import type { Skill } from '@/types';

export interface SkillPresentation {
  shortDescription: string;
  domain: string;
  explanation: string;
}

const KEYWORD_PRESENTATIONS: Array<{ terms: string[]; label: string; domain: string; explanation: string }> = [
  { terms: ['literature', 'paper', 'citation', 'review'], label: '文献研究与评审', domain: '科研方法与写作', explanation: '用于文献检索、证据整理、引用管理和学术评审。' },
  { terms: ['gene', 'bio', 'scanpy', 'anndata', 'protein', 'cell'], label: '生物信息分析', domain: '生物信息与组学', explanation: '用于生物数据处理、组学分析和可重复科研工作流。' },
  { terms: ['chem', 'drug', 'molecule', 'rdkit', 'datamol'], label: '药物与化学计算', domain: '药物与化学', explanation: '用于分子数据处理、化学信息分析和药物研发辅助。' },
  { terms: ['clinical', 'health', 'dicom', 'pathology', 'medical'], label: '临床医学分析', domain: '临床与医学', explanation: '用于临床、医学影像和健康数据的规范化分析。' },
  { terms: ['data', 'scikit', 'pytorch', 'shap', 'polars', 'visualization'], label: '数据与模型分析', domain: '数据科学与AI', explanation: '用于数据处理、模型训练、解释评估和结果可视化。' },
  { terms: ['geo', 'spatial', 'map', 'earth'], label: '空间数据分析', domain: '地理与空间科学', explanation: '用于地理、空间、地图和遥感数据分析。' },
  { terms: ['qiskit', 'qutip', 'cirq', 'pennylane', 'quantum'], label: '量子计算工具', domain: '量子与物理计算', explanation: '用于量子算法、量子系统模拟和相关计算流程。' },
  { terms: ['simulation', 'matlab', 'material', 'fluid', 'engineering'], label: '工程仿真分析', domain: '工程仿真与材料', explanation: '用于工程建模、仿真计算、材料分析和参数优化。' },
  { terms: ['database', 'integration', 'automation', 'notebook', 'protocol'], label: '科研平台与自动化', domain: '科研平台与自动化', explanation: '用于科研平台连接、数据流转、实验流程和任务自动化。' },
  { terms: ['search', 'research'], label: '研究检索工具', domain: '研究与信息分析', explanation: '用于信息检索、资料核验、研究梳理和结论归纳。' },
  { terms: ['write', 'content', 'markdown'], label: '内容写作工具', domain: '内容与知识表达', explanation: '用于结构化写作、内容整理和知识表达。' },
  { terms: ['code', 'develop', 'program'], label: '软件开发工具', domain: '软件与工程效率', explanation: '用于代码实现、调试、评审和工程流程优化。' },
];

function hasChinese(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

function cleanDescription(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function getSkillPresentation(skill: Skill): SkillPresentation {
  const searchable = `${skill.name} ${skill.description} ${skill.group || ''}`.toLowerCase();
  const matched = KEYWORD_PRESENTATIONS.find((item) => item.terms.some((term) => searchable.includes(term)));
  const group = skill.group?.trim();
  const domain = group && hasChinese(group)
    ? group
    : matched?.domain
      || (skill.source === 'scientific' ? '科学计算与专业工具' : skill.source === 'hermes' ? '智能体工作流' : skill.source === 'openclaw' ? '开放技能生态' : '通用业务能力');
  const originalDescription = cleanDescription(skill.description || '');
  const explanation = hasChinese(originalDescription)
    ? originalDescription
    : matched?.explanation || `面向${domain}场景，为 ${skill.name} 提供专业方法、操作流程与执行指导。`;
  const shortDescription = matched?.label || (hasChinese(originalDescription) ? originalDescription.slice(0, 18) : `${domain}技能`);
  return { shortDescription, domain, explanation };
}
