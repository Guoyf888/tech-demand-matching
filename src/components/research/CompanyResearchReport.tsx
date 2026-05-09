/**
 * 企业背景调查报告组件
 * 用于展示联网检索到的企业信息
 */

import { SearchResult } from '@/services/search/types';
import { themes, useThemeStore } from '@/store/themeStore';

interface CompanyResearchResult {
  companyName: string;
  basicInfo?: {
    registrationNumber?: string;
    legalRepresentative?: string;
    registeredCapital?: string;
    establishmentDate?: string;
    businessStatus?: string;
    mainBusiness?: string;
  };
  news: SearchResult[];
  patents?: SearchResult[];
  competitors?: SearchResult[];
  industryNews: SearchResult[];
}

interface CompanyResearchReportProps {
  research: CompanyResearchResult;
  isLoading?: boolean;
}

export function CompanyResearchReport({ research, isLoading }: CompanyResearchReportProps) {
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8 text-center animate-pulse"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <span className="text-4xl mb-4 block">🔍</span>
        <p style={{ color: themeColors?.textSecondary }}>
          正在联网检索企业信息...
        </p>
      </div>
    );
  }

  if (!research) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 报告标题 */}
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: themeColors?.primary + '15',
          border: `1px solid ${themeColors?.primary}30`,
        }}
      >
        <h3
          className="text-lg font-bold flex items-center gap-2"
          style={{ color: themeColors?.primary }}
        >
          <span>🏢</span>
          <span>企业背景调查报告</span>
        </h3>
        <p
          className="text-sm mt-1"
          style={{ color: themeColors?.textSecondary }}
        >
          {research.companyName}
        </p>
      </div>

      {/* 基本信息 */}
      {research.basicInfo && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>📋</span>
            <span>基本信息</span>
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {research.basicInfo.legalRepresentative && (
              <div>
                <span style={{ color: themeColors?.textHint }}>法定代表人</span>
                <p style={{ color: themeColors?.text }}>
                  {research.basicInfo.legalRepresentative}
                </p>
              </div>
            )}
            {research.basicInfo.registeredCapital && (
              <div>
                <span style={{ color: themeColors?.textHint }}>注册资本</span>
                <p style={{ color: themeColors?.text }}>
                  {research.basicInfo.registeredCapital}
                </p>
              </div>
            )}
            {research.basicInfo.establishmentDate && (
              <div>
                <span style={{ color: themeColors?.textHint }}>成立日期</span>
                <p style={{ color: themeColors?.text }}>
                  {research.basicInfo.establishmentDate}
                </p>
              </div>
            )}
            {research.basicInfo.businessStatus && (
              <div>
                <span style={{ color: themeColors?.textHint }}>经营状态</span>
                <p style={{ color: themeColors?.text }}>
                  {research.basicInfo.businessStatus}
                </p>
              </div>
            )}
            {research.basicInfo.mainBusiness && (
              <div className="col-span-2">
                <span style={{ color: themeColors?.textHint }}>主营业务</span>
                <p style={{ color: themeColors?.text }}>
                  {research.basicInfo.mainBusiness}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 最新动态 */}
      {research.news && research.news.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>📰</span>
            <span>最新动态 ({research.news.length}条)</span>
          </h4>
          <div className="space-y-3">
            {research.news.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg transition-colors hover:scale-[0.99]"
                style={{
                  backgroundColor: themeColors?.backgroundAlt,
                  border: `1px solid ${themeColors?.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5
                      className="text-sm font-medium truncate"
                      style={{ color: themeColors?.text }}
                    >
                      {item.title}
                    </h5>
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: themeColors?.textSecondary }}
                    >
                      {item.snippet}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {item.source && (
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: themeColors?.primaryLight,
                            color: themeColors?.primary,
                          }}
                        >
                          {item.source}
                        </span>
                      )}
                      {item.publishedAt && (
                        <span
                          className="text-xs"
                          style={{ color: themeColors?.textHint }}
                        >
                          {item.publishedAt}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-lg flex-shrink-0"
                    style={{ color: themeColors?.textHint }}
                  >
                    ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 行业动态 */}
      {research.industryNews && research.industryNews.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>📈</span>
            <span>行业动态 ({research.industryNews.length}条)</span>
          </h4>
          <div className="space-y-3">
            {research.industryNews.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg transition-colors hover:scale-[0.99]"
                style={{
                  backgroundColor: themeColors?.backgroundAlt,
                  border: `1px solid ${themeColors?.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5
                      className="text-sm font-medium truncate"
                      style={{ color: themeColors?.text }}
                    >
                      {item.title}
                    </h5>
                    <p
                      className="text-xs mt-1 line-clamp-2"
                      style={{ color: themeColors?.textSecondary }}
                    >
                      {item.snippet}
                    </p>
                    {item.source && (
                      <span
                        className="text-xs mt-2 inline-block px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: themeColors?.accent + '20',
                          color: themeColors?.accent,
                        }}
                      >
                        {item.source}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-lg flex-shrink-0"
                    style={{ color: themeColors?.textHint }}
                  >
                    ↗
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 专利信息 */}
      {research.patents && research.patents.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="text-sm font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>📜</span>
            <span>相关专利 ({research.patents.length}条)</span>
          </h4>
          <div className="space-y-3">
            {research.patents.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: themeColors?.backgroundAlt,
                  border: `1px solid ${themeColors?.border}`,
                }}
              >
                <h5
                  className="text-sm font-medium"
                  style={{ color: themeColors?.text }}
                >
                  {item.title}
                </h5>
                <p
                  className="text-xs mt-1"
                  style={{ color: themeColors?.textSecondary }}
                >
                  {item.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyResearchReport;
