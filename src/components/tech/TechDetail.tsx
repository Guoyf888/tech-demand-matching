import { TechResult } from '@/types';
import { TeamCard } from './TeamCard';
import { themes, useThemeStore } from '@/store/themeStore';

interface TechDetailProps {
  result: TechResult;
}

export function TechDetail({ result }: TechDetailProps) {
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '100%' }}>
      {/* 标题区域 */}
      <div className="pb-4" style={{ borderBottom: `1px solid ${themeColors?.border}` }}>
        <h2
          className="text-xl font-bold break-words"
          style={{ color: themeColors?.text }}
        >
          {result.title}
        </h2>
        <div className="flex items-center gap-3 mt-2">
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: result.status === 'completed'
                ? themeColors?.success + '20'
                : themeColors?.primary + '20',
              color: result.status === 'completed'
                ? themeColors?.success
                : themeColors?.primary,
            }}
          >
            {result.status === 'completed' ? '✓ 已分析' : '⏳ 分析中'}
          </span>
          <span
            className="text-sm"
            style={{ color: themeColors?.textHint }}
          >
            {new Date(result.createdAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      {/* 成果概要 */}
      {result.summary && (
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
            <span>📋</span>
            <span>成果概要</span>
          </h4>
          <p
            className="whitespace-pre-wrap leading-relaxed"
            style={{ color: themeColors?.textSecondary }}
          >
            {result.summary}
          </p>
        </div>
      )}

      {/* 团队成员 */}
      {result.teamMembers.length > 0 && (
        <TeamCard members={result.teamMembers} />
      )}

      {/* 详细内容 */}
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
          <span>📄</span>
          <span>详细内容</span>
        </h4>
        <p
          className="whitespace-pre-wrap leading-relaxed"
          style={{ color: themeColors?.textSecondary }}
        >
          {result.content}
        </p>
      </div>

      {/* 技术标签 */}
      {result.tags.length > 0 && (
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
            <span>🏷️</span>
            <span>技术标签</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: themeColors?.primaryLight,
                  color: themeColors?.primary,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 附件列表 */}
      {result.documents.length > 0 && (
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
            <span>📎</span>
            <span>相关文档</span>
          </h4>
          <div className="space-y-2">
            {result.documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer"
                style={{
                  backgroundColor: themeColors?.surfaceHover,
                }}
              >
                <span style={{ color: themeColors?.textSecondary }}>📄</span>
                <span
                  className="text-sm flex-1 truncate"
                  style={{ color: themeColors?.text }}
                >
                  {doc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
