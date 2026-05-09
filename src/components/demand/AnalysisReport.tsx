import { useEffect, useRef } from 'react';
import { Demand } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

interface AnalysisReportProps {
  demand: Demand;
}

export function AnalysisReport({ demand }: AnalysisReportProps) {
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;
  const contentRef = useRef<HTMLDivElement>(null);

  // 确保内容区域可以滚动
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [demand]);

  if (!demand.analysis) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: themeColors?.surface,
          border: `1px solid ${themeColors?.border}`,
        }}
      >
        <span className="text-4xl mb-4 block">📋</span>
        <p
          className="text-sm"
          style={{ color: themeColors?.textSecondary }}
        >
          暂无分析报告，请先配置API并提交需求
        </p>
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      className="space-y-4 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 300px)' }}
    >
      {/* 状态提示 */}
      {demand.status === 'analyzing' && (
        <div
          className="rounded-xl p-4 flex items-center gap-3 animate-pulse"
          style={{
            backgroundColor: themeColors?.primary + '15',
            border: `1px solid ${themeColors?.primary}40`,
          }}
        >
          <span className="text-xl">⏳</span>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: themeColors?.primary }}
            >
              分析中...
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: themeColors?.textHint }}
            >
              正在调用AI分析您的需求，请稍候
            </p>
          </div>
        </div>
      )}

      {/* 行业分析 */}
      {demand.analysis.industryAnalysis && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>📊</span>
            <span>行业分析</span>
          </h4>
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: themeColors?.textSecondary }}
          >
            {demand.analysis.industryAnalysis}
          </p>
        </div>
      )}

      {/* 技术研发路线 */}
      {demand.analysis.techRoadmap && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>🛤️</span>
            <span>技术研发路线</span>
          </h4>
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: themeColors?.textSecondary }}
          >
            {demand.analysis.techRoadmap}
          </p>
        </div>
      )}

      {/* 创新建议 */}
      {demand.analysis.suggestions && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h4
            className="font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>💡</span>
            <span>创新建议</span>
          </h4>
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: themeColors?.textSecondary }}
          >
            {demand.analysis.suggestions}
          </p>
        </div>
      )}

      {/* 企业信息 */}
      {demand.analysis.enterpriseInfo && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: themeColors?.primaryLight,
            border: `1px solid ${themeColors?.primary}30`,
          }}
        >
          <h4
            className="font-semibold mb-3 flex items-center gap-2"
            style={{ color: themeColors?.text }}
          >
            <span>🏢</span>
            <span>企业信息</span>
          </h4>
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: themeColors?.textSecondary }}
          >
            {demand.analysis.enterpriseInfo}
          </p>
        </div>
      )}

      {/* 底部留白，确保内容可滚动到最底部 */}
      <div className="h-4" />
    </div>
  );
}
