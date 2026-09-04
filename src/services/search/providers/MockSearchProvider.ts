/**
 * Mock搜索提供者 - 用于演示模式
 * 当未配置真实API时，返回模拟数据
 */

import { SearchRequest, SearchResponse, CompanyResearchResult, ISearchProvider } from '../types';

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const handleAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export class MockSearchProvider implements ISearchProvider {
  readonly name = 'mock';
  readonly supportsAdvancedSearch = false;

  isConfigured(): boolean {
    return true; // Mock模式始终可用
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const { query, numResults = 5 } = request;

    // 模拟网络延迟
    await delay(500 + Math.random() * 500, request.signal);

    // 生成模拟搜索结果
    const results = this.generateMockResults(query, numResults);

    return {
      success: true,
      results,
      provider: 'mock',
      query,
      isMock: true,
    };
  }

  async researchCompany(companyName: string, signal?: AbortSignal): Promise<CompanyResearchResult> {
    await delay(800 + Math.random() * 700, signal);

    return {
      companyName,
      success: true,
      provider: 'mock',
      isMock: true,
      basicInfo: {
        legalRepresentative: '张某某',
        registeredCapital: '5000万元人民币',
        establishmentDate: '2015年6月',
        businessStatus: '在业',
        mainBusiness: '软件开发、技术咨询、信息技术服务',
      },
      news: [
        {
          title: `${companyName}完成新一轮战略融资，估值超10亿`,
          url: 'https://example.com/news/1',
          snippet: '该公司近日宣布完成B轮融资，由知名投资机构领投，所获资金将用于技术研发和市场拓展...',
          publishedAt: '2024-01-15',
          source: '36氪',
        },
        {
          title: `${companyName}发布年度技术成果报告`,
          url: 'https://example.com/news/2',
          snippet: '年度报告显示，公司在过去一年新增专利申请50余项，技术研发投入同比增长40%...',
          publishedAt: '2024-01-10',
          source: '科技日报',
        },
        {
          title: `${companyName}入选年度最具创新力企业榜单`,
          url: 'https://example.com/news/3',
          snippet: '凭借在人工智能领域的持续创新和技术突破，该公司成功入选本年度创新企业榜单...',
          publishedAt: '2024-01-05',
          source: '创业邦',
        },
      ],
      patents: [
        {
          title: `${companyName}获得"一种智能推荐算法"发明专利`,
          url: 'https://example.com/patent/1',
          snippet: '本发明公开了一种基于深度学习的个性化推荐算法，能够有效提升推荐准确率...',
          publishedAt: '2023-12-20',
          source: '国家知识产权局',
        },
      ],
      industryNews: [
        {
          title: '人工智能行业2024年发展趋势预测',
          url: 'https://example.com/industry/1',
          snippet: '随着大模型技术的成熟和应用场景的拓展，AI行业将迎来新一轮爆发式增长...',
          publishedAt: '2024-01-12',
          source: '艾瑞咨询',
        },
        {
          title: '国家出台政策支持企业数字化转型',
          url: 'https://example.com/industry/2',
          snippet: '国务院印发《数字化转型行动方案》，明确提出支持企业加快数字化智能化改造...',
          publishedAt: '2024-01-08',
          source: '新华网',
        },
      ],
    };
  }

  private generateMockResults(query: string, numResults: number) {
    const templates = [
      {
        title: `关于${query}的最新研究进展`,
        snippet: `近期，国内外多家研究机构在${query}领域取得了重要突破。研究表明，该技术在实际应用中具有显著优势...`,
        source: '学术前沿',
      },
      {
        title: `${query}行业深度分析报告`,
        snippet: `本报告对${query}行业进行了全面深入的分析，涵盖了市场规模、竞争格局、技术趋势等多个维度...`,
        source: '行业研究',
      },
      {
        title: `${query}技术应用案例集`,
        snippet: `本文汇集了${query}在多个行业的典型应用案例，展示了该技术的实际落地效果和商业价值...`,
        source: '案例分享',
      },
      {
        title: `专家解读：${query}的未来发展方向`,
        snippet: `业内专家表示，${query}将在未来几年迎来快速发展期，技术成熟度将不断提升，应用场景将更加丰富...`,
        source: '专家访谈',
      },
      {
        title: `${query}国家标准正式发布`,
        snippet: `近日，相关国家标准机构正式发布了${query}的国家标准，这将有助于规范行业发展，提升产品质量...`,
        source: '标准发布',
      },
      {
        title: `资本加速布局${query}赛道`,
        snippet: `随着${query}市场的快速扩张，越来越多的投资机构开始关注并布局这一领域，相关融资事件频发...`,
        source: '投资观察',
      },
    ];

    return templates.slice(0, numResults).map((template, index) => ({
      title: template.title,
      url: `https://example.com/result/${index + 1}`,
      snippet: template.snippet,
      publishedAt: new Date(Date.now() - index * 86400000).toISOString().split('T')[0],
      source: template.source,
    }));
  }
}

export default MockSearchProvider;
