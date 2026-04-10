import { Demand, TechResult } from '@/types';
import { apiGateway } from './api/gateway';

interface MatchResult {
  demand: Demand;
  tech: TechResult;
  score: number;
  reason: string;
}

export async function findMatches(
  demands: Demand[],
  techResults: TechResult[]
): Promise<MatchResult[]> {
  const matches: MatchResult[] = [];

  const completedDemands = demands.filter((d) => d.status === 'completed');
  const completedTechs = techResults.filter((t) => t.status === 'completed');

  if (!apiGateway.isConfigured() || completedDemands.length === 0 || completedTechs.length === 0) {
    return matches;
  }

  for (const demand of completedDemands) {
    for (const tech of completedTechs) {
      try {
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `分析需求和成果的匹配度。

需求：${demand.content}
需求标签：${demand.tags.join(', ')}

成果：${tech.content}
成果标签：${tech.tags.join(', ')}
成果概要：${tech.summary}

请评估匹配度（0-100），并给出简要理由。
以JSON格式返回：
{
  "score": 85,
  "reason": "匹配理由..."
}`,
            },
            { role: 'user', content: '评估匹配度' },
          ],
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          const result = JSON.parse(data.choices[0].message.content);
          if (result.score >= 50) {
            matches.push({
              demand,
              tech,
              score: result.score,
              reason: result.reason,
            });
          }
        }
      } catch (error) {
        console.error('匹配失败:', error);
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
