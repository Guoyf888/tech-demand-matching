/**
 * SkillExecutionBridge - 技能执行桥接器
 *
 * 将 IntentClassifier 的分类结果桥接到实际执行：
 * - skill-execution -> unifiedSkillService.executeSkill()
 * - tool-execution -> hermes.executeTool()
 * - domain-analysis -> techMatch.analyzeDemand()
 *
 * 参考 OpenHuman 的 orchestrator -> worker 委派模式
 */

import { getHermesAgent } from './HermesAgent';
import { unifiedSkillService } from '@/services/skills/UnifiedSkillService';
import type { IntentClassification } from './IntentClassifier';

export interface ExecutionResult {
  success: boolean;
  output: string;
  source: 'skill' | 'tool' | 'agent';
  skillOrToolName: string;
  duration?: number;
}

export class SkillExecutionBridge {
  /**
   * 根据意图分类执行对应的技能或工具
   */
  async execute(classification: IntentClassification, userInput: string): Promise<ExecutionResult | null> {
    const startTime = Date.now();

    switch (classification.intent) {
      case 'skill-execution': {
        if (!classification.matchedSkill) return null;
        try {
          const result = await unifiedSkillService.executeSkill(classification.matchedSkill, { query: userInput });
          return {
            success: result.success,
            output: result.output || result.error || '',
            source: 'skill',
            skillOrToolName: result.skillName,
            duration: Date.now() - startTime,
          };
        } catch (err: unknown) {
          return {
            success: false,
            output: err instanceof Error ? err.message : 'Skill execution failed',
            source: 'skill',
            skillOrToolName: classification.matchedSkill,
            duration: Date.now() - startTime,
          };
        }
      }

      case 'tool-execution': {
        if (!classification.matchedTool) return null;
        try {
          const hermes = getHermesAgent();
          const result = await hermes.executeTool(classification.matchedTool, {
            query: userInput,
            task: userInput,
            demand: userInput,
          });
          return {
            success: result.success,
            output: result.output || result.error || '',
            source: 'tool',
            skillOrToolName: classification.matchedTool,
            duration: Date.now() - startTime,
          };
        } catch (err: unknown) {
          return {
            success: false,
            output: err instanceof Error ? err.message : 'Tool execution failed',
            source: 'tool',
            skillOrToolName: classification.matchedTool,
            duration: Date.now() - startTime,
          };
        }
      }

      case 'domain-analysis': {
        try {
          const { getTechMatchAgent } = await import('./TechMatchAgent');
          const techMatch = getTechMatchAgent();

          const domain = classification.matchedDomain || 'demand';
          let output: string;

          switch (domain) {
            case 'demand': {
              const analysis = await techMatch.analyzeDemand(userInput);
              output = analysis.report;
              break;
            }
            case 'result': {
              const analysis = await techMatch.analyzeTechResult(userInput);
              output = analysis.report;
              break;
            }
            case 'matching': {
              const match = await techMatch.performMatching(userInput);
              output = match.report;
              break;
            }
            case 'team': {
              const match = await techMatch.matchTeam(userInput);
              output = match.report;
              break;
            }
            default:
              return null;
          }

          return {
            success: true,
            output,
            source: 'agent',
            skillOrToolName: `tech-${domain}-analysis`,
            duration: Date.now() - startTime,
          };
        } catch (err: unknown) {
          return {
            success: false,
            output: err instanceof Error ? err.message : 'Domain analysis failed',
            source: 'agent',
            skillOrToolName: classification.matchedDomain || 'unknown',
            duration: Date.now() - startTime,
          };
        }
      }

      default:
        return null; // simple-chat 或 multi-step-task，不拦截
    }
  }
}

// 单例
let bridgeInstance: SkillExecutionBridge | null = null;

export function getSkillExecutionBridge(): SkillExecutionBridge {
  if (!bridgeInstance) {
    bridgeInstance = new SkillExecutionBridge();
  }
  return bridgeInstance;
}
