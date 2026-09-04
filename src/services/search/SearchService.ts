/**
 * 搜索服务 - 统一入口
 * 根据配置自动选择合适的搜索提供商
 */

import { SearchRequest, SearchResponse, CompanyResearchResult, ISearchProvider } from './types';
import { useSearchConfigStore } from '@/store/searchConfigStore';

// 导入各提供商
import { MockSearchProvider } from './providers/MockSearchProvider';
import { TavilySearchProvider } from './providers/TavilySearchProvider';

export class SearchService {
  private providers: Map<string, ISearchProvider> = new Map();
  private activeProvider: ISearchProvider | null = null;

  constructor() {
    // 注册所有提供商
    this.registerProvider(new MockSearchProvider());
    this.registerProvider(new TavilySearchProvider());
  }

  /**
   * 注册搜索提供商
   */
  registerProvider(provider: ISearchProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * 获取当前活跃的搜索提供商
   */
  getActiveProvider(): ISearchProvider {
    const state = useSearchConfigStore.getState();
    const activeName = state.activeProvider;

    // 如果当前provider实例已存在且是同一个，直接返回
    if (this.activeProvider && this.activeProvider.name === activeName) {
      return this.activeProvider;
    }

    // 获取对应provider
    const provider = this.providers.get(activeName);
    if (provider) {
      this.activeProvider = provider;
      return provider;
    }

    // 默认回退到mock
    const mockProvider = this.providers.get('mock');
    if (mockProvider) {
      this.activeProvider = mockProvider;
      return mockProvider;
    }

    throw new Error('无可用的搜索提供商');
  }

  /**
   * 执行搜索
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    try {
      const provider = this.getActiveProvider();
      const result = await provider.search(request);

      return result;
    } catch (error: any) {
      console.error('[搜索服务] 搜索异常:', error);
      return {
        success: false,
        results: [],
        error: error.message || '搜索服务异常',
        provider: 'none',
        query: request.query,
      };
    }
  }

  /**
   * 执行企业背景研究
   * 综合搜索企业的新闻、专利、行业动态等信息
   */
  async researchCompany(companyName: string, signal?: AbortSignal): Promise<CompanyResearchResult> {
    try {
      const provider = this.getActiveProvider();

      // 如果provider支持researchCompany方法
      if ('researchCompany' in provider && typeof provider.researchCompany === 'function') {
        return await provider.researchCompany(companyName, signal);
      }

      // 否则手动执行多个搜索
      return await this.manualResearch(companyName, signal);
    } catch (error: any) {
      console.error('[搜索服务] 企业研究异常:', error);

      return {
        companyName,
        success: false,
        error: error instanceof Error ? error.message : '企业研究服务异常',
        provider: this.activeProvider?.name || 'none',
        news: [],
        industryNews: [],
      };
    }
  }

  /**
   * 手动执行企业研究（当provider不支持researchCompany时）
   */
  private async manualResearch(companyName: string, signal?: AbortSignal): Promise<CompanyResearchResult> {
    const [news, industry] = await Promise.all([
      this.search({
        query: `${companyName} 最新动态 新闻 ${new Date().getFullYear()}`,
        numResults: 5,
        searchType: 'news',
        signal,
      }),
      this.search({
        query: `${companyName} 所在行业 最新动态 技术趋势`,
        numResults: 5,
        signal,
      }),
    ]);

    return {
      companyName,
      success: news.success && industry.success,
      error: news.error || industry.error,
      provider: news.provider || industry.provider,
      news: news.success ? news.results : [],
      industryNews: industry.success ? industry.results : [],
    };
  }

  /**
   * 搜索专利信息
   */
  async searchPatents(companyName: string): Promise<SearchResponse> {
    return this.search({
      query: `${companyName} 专利 发明专利 申请`,
      numResults: 10,
      searchType: 'patents',
    });
  }

  /**
   * 搜索行业信息
   */
  async searchIndustry(industryName: string): Promise<SearchResponse> {
    return this.search({
      query: `${industryName} 行业动态 市场分析 技术趋势 ${new Date().getFullYear()}`,
      numResults: 10,
    });
  }

  /**
   * 检查当前provider是否已配置
   */
  isConfigured(): boolean {
    try {
      const provider = this.getActiveProvider();
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * 获取所有可用的provider名称
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// 导出单例
export const searchService = new SearchService();

export default searchService;
