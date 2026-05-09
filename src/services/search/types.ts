/**
 * 搜索服务类型定义
 * 支持多种搜索提供商：Tavily, DuckDuckGo, Brave Search 等
 */

// 搜索结果类型
export interface SearchResult {
  title: string;           // 搜索结果标题
  url: string;             // 链接地址
  snippet: string;         // 摘要内容
  publishedAt?: string;    // 发布时间（可选）
  source?: string;         // 来源网站
}

// 搜索请求参数
export interface SearchRequest {
  query: string;           // 搜索关键词
  numResults?: number;     // 返回结果数量，默认10
  searchType?: 'general' | 'news' | 'companies' | 'patents';  // 搜索类型
}

// 搜索响应
export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  error?: string;
  provider: string;        // 使用的搜索提供商
  totalResults?: number;    // 总结果数
  query: string;           // 原始查询
}

// 企业信息搜索结果
export interface CompanyResearchResult {
  companyName: string;
  basicInfo?: {
    registrationNumber?: string;
    legalRepresentative?: string;
    registeredCapital?: string;
    establishmentDate?: string;
    businessStatus?: string;
    mainBusiness?: string;
  };
  news: SearchResult[];           // 最新新闻
  patents?: SearchResult[];       // 相关专利
  competitors?: SearchResult[];    // 竞争对手
  industryNews: SearchResult[];    // 行业动态
}

// 搜索提供商配置
export interface SearchProviderConfig {
  provider: 'tavily' | 'duckduckgo' | 'brave' | 'exasearch' | 'mock';
  apiKey?: string;
  baseUrl?: string;
}

// 抽象搜索提供者接口
export interface ISearchProvider {
  readonly name: string;
  readonly supportsAdvancedSearch: boolean;

  // 执行搜索
  search(request: SearchRequest): Promise<SearchResponse>;

  // 执行企业研究（综合搜索）
  researchCompany(companyName: string): Promise<CompanyResearchResult>;

  // 检查配置是否有效
  isConfigured(): boolean;
}
