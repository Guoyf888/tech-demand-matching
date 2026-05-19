import { useEffect, useRef } from 'react';
import { Demand } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

interface AnalysisReportProps {
  demand: Demand;
}

export function AnalysisReport({ demand }: AnalysisReportProps) {
  const currentTheme = useThemeStore(s => s.getEffectiveTheme());
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
          {/* 行业热度指示条 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: themeColors?.textHint }}>行业关注度</span>
              <span className="text-xs font-medium" style={{ color: themeColors?.primary }}>高</span>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: themeColors?.border }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: '78%',
                  background: `linear-gradient(90deg, ${themeColors?.primary}80, ${themeColors?.primary})`,
                }}
              />
            </div>
          </div>
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
          {/* 里程碑步骤 */}
          <div className="mb-3 flex items-center gap-1">
            {['需求确认', '方案设计', '原型开发', '测试验证', '落地部署'].map((step, i) => (
              <div key={step} className="flex items-center gap-1">
                <div
                  className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: i < 3 ? themeColors?.primary : themeColors?.border,
                    color: i < 3 ? '#fff' : themeColors?.textHint,
                  }}
                >
                  {i + 1}
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: i < 3 ? themeColors?.primary : themeColors?.textHint }}
                >
                  {step}
                </span>
                {i < 4 && (
                  <div
                    className="w-3 h-px"
                    style={{ backgroundColor: i < 2 ? themeColors?.primary : themeColors?.border }}
                  />
                )}
              </div>
            ))}
          </div>
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
          {/* 优先级标签 */}
          <div className="flex gap-2 mb-3">
            {[
              { label: '技术可行性', color: themeColors?.success },
              { label: '市场前景', color: themeColors?.primary },
              { label: '创新度', color: themeColors?.warning },
            ].map(item => (
              <span
                key={item.label}
                className="px-2 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: item.color + '18',
                  color: item.color,
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: themeColors?.textSecondary }}
          >
            {typeof demand.analysis.suggestions === 'string'
              ? demand.analysis.suggestions
              : Array.isArray(demand.analysis.suggestions)
                ? demand.analysis.suggestions.join('\n')
                : String(demand.analysis.suggestions)}
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
