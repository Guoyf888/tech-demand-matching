// 修复：补全类型定义，增加可选属性+默认值，避免运行时报错

export interface Demand {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'analyzing' | 'completed' | 'failed';
  analysis?: {
    enterpriseInfo?: string;
    industryAnalysis?: string;
    techRoadmap?: string;
    suggestions?: string | string[];
    error?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TechResult {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  teamMembers: TeamMember[];
  documents: string[];
  status: 'draft' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface Match {
  id: string;
  demandId: string;
  techId: string;
  score: number;
  reason: string;
  status: 'pending' | 'contacted' | 'cooperating' | 'completed';
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  icon?: string;
  actions: SkillAction[];
  metadata: {
    createdAt: string;
    usageCount: number;
    successRate: number;
  };
  group?: string;
  pinned?: boolean;
  isBuiltIn?: boolean;
  source?: 'hermes' | 'openclaw' | 'native';
  content?: string;
  triggers?: string[];
  author?: string;
  prerequisites?: {
    bins?: string[];
    env?: string[];
  };
}

export interface SkillAction {
  id: string;
  name: string;
  trigger?: string;
  parameters?: SkillParameter[];
  description: string;
}

export interface SkillParameter {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
  description: string;
}

// 补充错误类型定义
export type ErrorType = 'validate' | 'network' | 'api' | 'server' | 'timeout' | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  stack?: string;
}

// 补充工具执行结果类型
export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  data?: unknown;
  error?: AppError;
  timestamp: string;
}
