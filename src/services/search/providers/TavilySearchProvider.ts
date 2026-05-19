/**
 * Tavily Search API 提供者
 * 文档: https://docs.tavily.com/
 * 免费额度: 1000次/天
 */

import { SearchRequest, SearchResponse, CompanyResearchResult, ISearchProvider } from '../types';
import { useSearchConfigStore } from '@/store/searchConfigStore';

export class TavilySearchProvider implements ISearchProvider {
  readonly name = 'tavily';
  readonly supportsAdvancedSearch = true;

  private getConfig() {
    const state = useSearchConfigStore.getState();
    return state.providers.tavily;
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config?.apiKey);
  }

  private getBaseUrl(): string {
    const config = this.getConfig();
    return config?.baseUrl || 'https://api.tavily.com';
  }

  private getApiKey(): string {
    const config = this.getConfig();
    return config?.apiKey || '';
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const { query, numResults = 10, searchType = 'general' } = request;

    if (!this.isConfigured()) {
      return {
        success: false,
        results: [],
        error: 'Tavily API未配置，请先在设置中配置API Key',
        provider: 'tavily',
        query,
      };
    }

    try {
      const endpoint = `${this.getBaseUrl()}/search`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getApiKey()}`,
        },
        body: JSON.stringify({
          query,
          search_depth: searchType === 'news' ? 'basic' : 'advanced',
          max_results: numResults,
          include_answer: true,
          include_raw_content: false,
          include_images: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          results: [],
          error: `Tavily API错误 (${response.status}): ${errorText}`,
          provider: 'tavily',
          query,
        };
      }

      const data = await response.json();

      return {
        success: true,
        results: (data.results || []).map((item: { title?: string; url?: string; content?: string; description?: string; published_date?: string }) => ({
          title: item.title || '无标题',
          url: item.url || '',
          snippet: item.content || item.description || '',
          publishedAt: item.published_date,
          source: item.url ? new URL(item.url).hostname.replace('www.', '') : 'unknown',
        })),
        provider: 'tavily',
        query,
        totalResults: data.total_results,
      };
    } catch (error: any) {
      return {
        success: false,
        results: [],
        error: `搜索失败: ${error.message}`,
        provider: 'tavily',
        query,
      };
    }
  }

  async researchCompany(companyName: string): Promise<CompanyResearchResult> {
    // 并行执行多个搜索查询
    const [newsResponse, industryResponse] = await Promise.all([
      this.search({ query: `${companyName} 最新动态 新闻`, numResults: 5, searchType: 'news' }),
      this.search({ query: `${companyName} 所处行业 最新动态`, numResults: 5 }),
    ]);

    return {
      companyName,
      news: newsResponse.success ? newsResponse.results : [],
      industryNews: industryResponse.success ? industryResponse.results : [],
    };
  }
}

export default TavilySearchProvider;
