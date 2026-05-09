/**
 * Unified Skill Service
 *
 * 统一整合所有技能来源：
 * - 内置技能 (builtInSkills)
 * - OpenClaw 技能
 * - 自定义技能 (skillStore)
 *
 * 提供统一的技能搜索、匹配、执行接口
 */

import { Skill } from '@/types';
import { getBuiltInSkills } from '@/services/skills/builtInSkills';
import { getOpenClawService } from '@/services/openclaw/OpenClawService';
import { skillStore } from '@/services/skills/skillStore';

export interface UnifiedSkill {
  skill: Skill;
  source: 'native' | 'openclaw' | 'custom';
  displayName: string;
  matchScore: number;
}

export interface SkillExecuteResult {
  success: boolean;
  output?: string;
  error?: string;
  skillName: string;
  executionTime?: number;
}

/**
 * 统一的技能服务
 */
class UnifiedSkillService {
  private static instance: UnifiedSkillService | null = null;
  private skillsCache: UnifiedSkill[] = [];
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 5000; // 5秒缓存

  private constructor() {}

  static getInstance(): UnifiedSkillService {
    if (!UnifiedSkillService.instance) {
      UnifiedSkillService.instance = new UnifiedSkillService();
    }
    return UnifiedSkillService.instance;
  }

  /**
   * 获取所有技能（带缓存）
   */
  getAllSkills(forceRefresh = false): UnifiedSkill[] {
    const now = Date.now();
    if (!forceRefresh && now - this.lastUpdate < this.CACHE_TTL && this.skillsCache.length > 0) {
      return this.skillsCache;
    }

    const unifiedSkills: UnifiedSkill[] = [];

    // 1. 内置技能 (Native Skills)
    const nativeSkills = getBuiltInSkills();
    for (const skill of nativeSkills) {
      if (skill.enabled) {
        unifiedSkills.push({
          skill,
          source: 'native',
          displayName: skill.name,
          matchScore: 0,
        });
      }
    }

    // 2. OpenClaw 技能
    const openClawService = getOpenClawService();
    const openClawSkills = openClawService.getAllSkills();
    for (const skill of openClawSkills) {
      if (skill.enabled) {
        unifiedSkills.push({
          skill,
          source: 'openclaw',
          displayName: skill.name,
          matchScore: 0,
        });
      }
    }

    // 3. 自定义技能 (从 skillStore 加载)
    const customSkills = skillStore.getAll();
    for (const skill of customSkills) {
      if (skill.enabled && !unifiedSkills.find(u => u.skill.name === skill.name)) {
        unifiedSkills.push({
          skill,
          source: 'custom',
          displayName: skill.name,
          matchScore: 0,
        });
      }
    }

    this.skillsCache = unifiedSkills;
    this.lastUpdate = now;
    return unifiedSkills;
  }

  /**
   * 按来源筛选技能
   */
  getSkillsBySource(source: 'native' | 'openclaw' | 'custom' | 'all'): UnifiedSkill[] {
    const all = this.getAllSkills();
    if (source === 'all') return all;
    return all.filter(s => s.source === source);
  }

  /**
   * 按关键词搜索技能（支持名称、描述、触发词）
   */
  searchSkills(query: string, limit = 10): UnifiedSkill[] {
    if (!query.trim()) {
      return this.getAllSkills().slice(0, limit);
    }

    const queryLower = query.toLowerCase();
    const all = this.getAllSkills();

    // 计算匹配分数
    const scored = all.map(item => {
      let score = 0;
      const name = item.skill.name.toLowerCase();
      const desc = item.skill.description.toLowerCase();
      const triggers = (item.skill.triggers || []).map(t => t.toLowerCase());

      // 名称完全匹配
      if (name === queryLower) score += 100;
      // 名称包含
      else if (name.includes(queryLower)) score += 50;
      // 描述包含
      else if (desc.includes(queryLower)) score += 20;
      // 触发词匹配
      else if (triggers.some(t => t.includes(queryLower))) score += 30;
      // 分词匹配
      else {
        const queryWords = queryLower.split(/\s+/);
        const matchCount = queryWords.filter(w =>
          name.includes(w) || desc.includes(w) || triggers.some(t => t.includes(w))
        ).length;
        score += matchCount * 10;
      }

      return { ...item, matchScore: score };
    });

    // 按分数排序并返回
    return scored
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * 根据用户输入智能推荐技能
   */
  recommendSkills(userInput: string, limit = 5): UnifiedSkill[] {
    const all = this.getAllSkills();
    const inputLower = userInput.toLowerCase();

    // 清理输入（移除标点）
    const cleanedInput = inputLower.replace(/[^\w\s\u4e00-\u9fa5]/g, ' ');

    return all
      .map(item => {
        let score = 0;
        const name = item.skill.name.toLowerCase();
        const desc = item.skill.description.toLowerCase();
        const triggers = (item.skill.triggers || []).map(t => t.toLowerCase());
        const group = (item.skill.group || '').toLowerCase();

        // 检查触发词匹配
        for (const trigger of triggers) {
          if (cleanedInput.includes(trigger)) {
            score += 40;
            // 触发词越短匹配度越高
            score += Math.max(0, 20 - trigger.length);
          }
        }

        // 检查名称/描述中的关键词
        const words = cleanedInput.split(/\s+/).filter(w => w.length > 2);
        for (const word of words) {
          if (name.includes(word)) score += 15;
          if (desc.includes(word)) score += 5;
          if (group.includes(word)) score += 10;
        }

        return { ...item, matchScore: score };
      })
      .filter(s => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * 获取技能统计
   */
  getStats(): { native: number; openclaw: number; custom: number; total: number } {
    const all = this.getAllSkills();
    return {
      native: all.filter(s => s.source === 'native').length,
      openclaw: all.filter(s => s.source === 'openclaw').length,
      custom: all.filter(s => s.source === 'custom').length,
      total: all.length,
    };
  }

  /**
   * 执行技能（统一执行入口）
   */
  async executeSkill(skillName: string, params: Record<string, unknown> = {}): Promise<SkillExecuteResult> {
    const startTime = Date.now();
    const all = this.getAllSkills();

    // 1. 精确匹配
    let skillItem = all.find(s =>
      s.skill.name.toLowerCase() === skillName.toLowerCase()
    );

    // 2. 模糊匹配
    if (!skillItem) {
      skillItem = all.find(s =>
        s.skill.name.toLowerCase().includes(skillName.toLowerCase()) ||
        (s.skill.triggers || []).some(t => t.toLowerCase().includes(skillName.toLowerCase()))
      );
    }

    if (!skillItem) {
      return {
        success: false,
        error: `未找到技能: ${skillName}`,
        skillName,
      };
    }

    try {
      const { skill, source } = skillItem;

      // 根据来源分发执行
      switch (source) {
        case 'openclaw': {
          const openClaw = getOpenClawService();
          const result = await openClaw.executeSkill(skill.id, params);
          return {
            success: result.success,
            output: result.output,
            error: result.error,
            skillName: skill.name,
            executionTime: Date.now() - startTime,
          };
        }

        case 'native':
        case 'custom': {
          // 内置/自定义技能模拟执行
          // 实际应用中，这里会根据技能类型调用不同的处理函数
          return {
            success: true,
            output: this.formatSkillOutput(skill, params),
            skillName: skill.name,
            executionTime: Date.now() - startTime,
          };
        }

        default:
          return {
            success: false,
            error: `未知技能来源: ${source}`,
            skillName,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || '技能执行失败',
        skillName,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 格式化技能输出
   */
  private formatSkillOutput(skill: Skill, _params: Record<string, unknown>): string {
    const lines = [
      `[技能: ${skill.icon} ${skill.name}]`,
      '',
      `描述: ${skill.description}`,
      '',
      `版本: v${skill.version}`,
      `分组: ${skill.group || '默认'}`,
      `来源: ${skill.isBuiltIn ? '内置' : '自定义'}`,
      '',
    ];

    if (skill.triggers && skill.triggers.length > 0) {
      lines.push('触发词:', ...skill.triggers.map(t => `  • ${t}`), '');
    }

    if (skill.actions && skill.actions.length > 0) {
      lines.push('可用操作:', ...skill.actions.map(a => `  • ${a.name}: ${a.description}`), '');
    }

    lines.push('---');
    lines.push('技能执行完成');

    return lines.join('\n');
  }

  /**
   * 检查技能是否存在
   */
  hasSkill(skillName: string): boolean {
    const all = this.getAllSkills();
    return all.some(s =>
      s.skill.name.toLowerCase() === skillName.toLowerCase()
    );
  }

  /**
   * 获取技能详情
   */
  getSkill(skillName: string): UnifiedSkill | undefined {
    const all = this.getAllSkills();
    return all.find(s =>
      s.skill.name.toLowerCase() === skillName.toLowerCase()
    );
  }

  /**
   * 生成技能调用提示（用于AI对话）
   */
  generateSkillContext(): string {
    const stats = this.getStats();
    const all = this.getAllSkills();

    const lines = [
      `【统一技能库】共 ${stats.total} 个技能 (内置:${stats.native} | OpenClaw:${stats.openclaw} | 自定义:${stats.custom})`,
      '',
    ];

    // 按分组展示
    const groups = new Map<string, UnifiedSkill[]>();
    for (const item of all) {
      const group = item.skill.group || '默认';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(item);
    }

    for (const [group, skills] of groups) {
      lines.push(`【${group}】`);
      for (const item of skills.slice(0, 5)) {
        lines.push(`  ${item.skill.icon} ${item.skill.name}: ${item.skill.description.slice(0, 40)}`);
      }
      if (skills.length > 5) {
        lines.push(`  ... 还有 ${skills.length - 5} 个`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// 单例导出
export const unifiedSkillService = UnifiedSkillService.getInstance();

export default UnifiedSkillService;
