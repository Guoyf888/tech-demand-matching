/**
 * parseMatchResponse 单元测试
 *
 * 覆盖：纯 JSON / markdown 代码块 / 嵌套对象 / 多次返回 / 修复机制
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Demand, TechResult } from '@/types';

const gatewayMocks = vi.hoisted(() => ({
  isConfigured: vi.fn(),
  getConfigMetadata: vi.fn(),
  chat: vi.fn(),
}));

vi.mock('./api/gateway', () => ({
  apiGateway: gatewayMocks,
}));

import { parseMatchResponse, runMatching } from './matching';
import { matchRunStorage } from './storage/matchRunStorage';

const demand: Demand = {
  id: 'demand-1',
  title: '产线缺陷检测',
  content: '需要机器视觉检测铝材表面缺陷。',
  tags: ['人工智能'],
  status: 'completed',
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
};

const tech: TechResult = {
  id: 'tech-1',
  title: '机器视觉检测系统',
  content: '基于AI识别工业产品表面缺陷。',
  summary: '工业缺陷检测方案',
  tags: ['人工智能'],
  teamMembers: [],
  documents: [],
  status: 'completed',
  createdAt: '2026-09-04T00:00:00.000Z',
  updatedAt: '2026-09-04T00:00:00.000Z',
};

describe('matching run credibility', () => {
  beforeEach(() => {
    localStorage.clear();
    gatewayMocks.isConfigured.mockReset();
    gatewayMocks.getConfigMetadata.mockReset();
    gatewayMocks.chat.mockReset();
    gatewayMocks.getConfigMetadata.mockReturnValue({ provider: 'openai', modelId: 'gpt-test' });
  });

  it('awaits configuration and records an unconfigured run', async () => {
    gatewayMocks.isConfigured.mockResolvedValue(false);

    const result = await runMatching([demand], [tech]);

    expect(result.status).toBe('not_configured');
    expect(result.error).toContain('API');
    expect(gatewayMocks.chat).not.toHaveBeenCalled();
    expect(matchRunStorage.getAll()[0]).toMatchObject({
      id: result.id,
      status: 'not_configured',
      provider: 'openai',
      modelId: 'gpt-test',
    });
  });

  it('distinguishes an evaluation failure from a valid empty result', async () => {
    gatewayMocks.isConfigured.mockResolvedValue(true);
    gatewayMocks.chat.mockRejectedValue(new Error('upstream unavailable'));

    const result = await runMatching([demand], [tech]);

    expect(result.status).toBe('failed');
    expect(result.failedCount).toBe(1);
    expect(result.error).toContain('upstream unavailable');
    expect(matchRunStorage.getAll()[0].status).toBe('failed');
  });

  it('reports completed with no matches when evaluation succeeds below threshold', async () => {
    gatewayMocks.isConfigured.mockResolvedValue(true);
    gatewayMocks.chat.mockResolvedValue({
      json: async () => ({
        choices: [{ message: { content: '{"score": 20, "reason": "技术方向不一致"}' } }],
      }),
    });

    const result = await runMatching([demand], [tech]);

    expect(result.status).toBe('completed');
    expect(result.matches).toEqual([]);
    expect(result.failedCount).toBe(0);
  });
});

describe('parseMatchResponse', () => {
  it('parses plain JSON', () => {
    const result = parseMatchResponse('{"score": 85, "reason": "good match"}');
    expect(result).toEqual({ score: 85, reason: 'good match' });
  });

  it('parses JSON inside ```json code block', () => {
    const result = parseMatchResponse(
      '```json\n{"score": 72, "reason": "decent"}\n```'
    );
    expect(result).toEqual({ score: 72, reason: 'decent' });
  });

  it('parses JSON inside generic code block', () => {
    const result = parseMatchResponse(
      '```\n{"score": 60, "reason": "okay"}\n```'
    );
    expect(result).toEqual({ score: 60, reason: 'okay' });
  });

  it('extracts JSON from surrounding prose', () => {
    const result = parseMatchResponse(
      'Sure! Here is the evaluation:\n{"score": 90, "reason": "perfect"}\nDone.'
    );
    expect(result).toEqual({ score: 90, reason: 'perfect' });
  });

  it('handles nested objects (uses full slice, not first regex match)', () => {
    const result = parseMatchResponse(
      '{"score": 75, "reason": "has nested data", "metadata": {"foo": 1}}'
    );
    expect(result?.score).toBe(75);
    expect(result?.reason).toContain('nested');
  });

  it('repairs trailing commas', () => {
    const result = parseMatchResponse('{"score": 50, "reason": "ok",}');
    expect(result?.score).toBe(50);
  });

  it('preserves apostrophes while repairing trailing commas', () => {
    const result = parseMatchResponse('{"score": 68, "reason": "team\'s fit",}');
    expect(result).toEqual({ score: 68, reason: "team's fit" });
  });

  it('repairs single quotes', () => {
    const result = parseMatchResponse("{'score': 45, 'reason': 'fine'}");
    expect(result?.score).toBe(45);
  });

  it('repairs unquoted keys', () => {
    const result = parseMatchResponse('{score: 55, reason: "ok"}');
    expect(result?.score).toBe(55);
  });

  it('returns null for out-of-range score', () => {
    expect(parseMatchResponse('{"score": 150, "reason": "bad"}')).toBeNull();
    expect(parseMatchResponse('{"score": -10, "reason": "bad"}')).toBeNull();
  });

  it('returns null for missing score', () => {
    expect(parseMatchResponse('{"reason": "no score"}')).toBeNull();
  });

  it('returns null for non-numeric score', () => {
    expect(parseMatchResponse('{"score": "85", "reason": "string"}')).toBeNull();
  });

  it('rounds score to integer', () => {
    const result = parseMatchResponse('{"score": 87.6, "reason": "x"}');
    expect(result?.score).toBe(88);
  });

  it('returns null on completely invalid input', () => {
    expect(parseMatchResponse('not json at all')).toBeNull();
    expect(parseMatchResponse('')).toBeNull();
  });

  it('defaults reason to empty string when missing', () => {
    const result = parseMatchResponse('{"score": 70}');
    expect(result?.reason).toBe('');
  });
});
