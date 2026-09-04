import { describe, expect, it } from 'vitest';
import { NATIONAL_ECONOMIC_INDUSTRIES, isNationalEconomicIndustry } from './industries';
import { extractIndustryTags } from '@/services/documentParser';

describe('national economic industry tags', () => {
  it('contains all 20 GB/T 4754-2017 top-level categories', () => {
    expect(NATIONAL_ECONOMIC_INDUSTRIES).toHaveLength(20);
    expect(new Set(NATIONAL_ECONOMIC_INDUSTRIES.map((industry) => industry.code)).size).toBe(20);
  });

  it('classifies manufacturing and software content with shared labels', () => {
    expect(extractIndustryTags('新能源汽车电池生产线与智能质量检测')).toContain('制造业');
    expect(extractIndustryTags('建设人工智能软件与云计算数据平台')).toContain('信息传输、软件和信息技术服务业');
  });

  it('only accepts labels from the shared taxonomy', () => {
    expect(isNationalEconomicIndustry('制造业')).toBe(true);
    expect(isNationalEconomicIndustry('智能制造')).toBe(false);
  });
});
