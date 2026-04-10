export interface Demand {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: 'draft' | 'analyzing' | 'completed';
  createdAt: string;
  updatedAt: string;
  analysis?: {
    enterpriseInfo?: string;
    industryAnalysis?: string;
    techRoadmap?: string;
    suggestions?: string;
  };
}

export interface TechResult {
  id: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  teamMembers: TeamMember[];
  documents: string[];
  status: 'draft' | 'processing' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
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
  icon: string;
  actions: SkillAction[];
  metadata: {
    createdAt: string;
    usageCount: number;
    successRate: number;
  };
}

export interface SkillAction {
  id: string;
  name: string;
  description: string;
}
