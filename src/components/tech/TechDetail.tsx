import { TechResult } from '@/types';
import { TeamCard } from './TeamCard';
import { themes, useThemeStore } from '@/store/themeStore';

interface TechDetailProps {
  result: TechResult;
}

// 从内容中提取数值指标
function extractMetric(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val >= 0 && val <= 100) return val;
    }
  }
  return null;
}

// 环形进度条组件
function RingProgress({ value, size = 64, strokeWidth = 5, color }: { value: number; size?: number; strokeWidth?: number; color: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-gray-200 dark:text-gray-700"
        style={{ stroke: 'var(--color-border, #e5e7eb)' }}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}

// TRL阶梯指示器
function TRLIndicator({ level }: { level: number }) {
  const currentTheme = useThemeStore(s => s.getEffectiveTheme());
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="w-3 h-6 rounded-sm transition-colors"
          style={{
            backgroundColor: i < level ? themeColors?.primary : themeColors?.border,
            opacity: i < level ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function TechDetail({ result }: TechDetailProps) {
  const currentTheme = useThemeStore(s => s.getEffectiveTheme());
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  // 从内容中提取指标
  const fullText = `${result.content || ''} ${result.summary || ''}`;
  const innovationScore = extractMetric(fullText, [/创新[性度]?[评得]?[分]?[：:为]?\s*(\d+)/i, /innovation[:\s]*(\d+)/i]);
  const marketScore = extractMetric(fullText, [/市场[价]?[值]?[评得]?[分]?[：:为]?\s*(\d+)/i, /market[:\s]*(\d+)/i]);
  const trlMatch = fullText.match(/TRL[\s-]*(\d)/i) || fullText.match(/成熟度[：:为]?\s*(\d)/i);
  const trlLevel = trlMatch ? parseInt(trlMatch[1], 10) : null;

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

      {/* 分析概览卡片 */}
      {result.status === 'completed' && (
        <div className="grid grid-cols-3 gap-3">
          {/* 创新性评分 */}
          <div
            className="rounded-xl p-4 flex flex-col items-center gap-2"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            <span className="text-xs font-medium" style={{ color: themeColors?.textSecondary }}>创新性</span>
            {innovationScore !== null ? (
              <div className="relative flex items-center justify-center">
                <RingProgress value={innovationScore} color={themeColors?.primary || '#1677FF'} />
                <span className="absolute text-sm font-bold" style={{ color: themeColors?.primary }}>{innovationScore}</span>
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColors?.border + '40' }}
              >
                <span className="text-xs" style={{ color: themeColors?.textHint }}>待分析</span>
              </div>
            )}
            <span className="text-[10px]" style={{ color: themeColors?.textHint }}>0-100分</span>
          </div>

          {/* 技术成熟度 */}
          <div
            className="rounded-xl p-4 flex flex-col items-center gap-2"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            <span className="text-xs font-medium" style={{ color: themeColors?.textSecondary }}>技术成熟度</span>
            {trlLevel !== null ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold" style={{ color: themeColors?.primary }}>TRL {trlLevel}</span>
                </div>
                <TRLIndicator level={trlLevel} />
              </>
            ) : (
              <>
                <span className="text-xl font-bold" style={{ color: themeColors?.textHint }}>--</span>
                <TRLIndicator level={0} />
              </>
            )}
            <span className="text-[10px]" style={{ color: themeColors?.textHint }}>1-9级</span>
          </div>

          {/* 市场价值 */}
          <div
            className="rounded-xl p-4 flex flex-col items-center gap-2"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            <span className="text-xs font-medium" style={{ color: themeColors?.textSecondary }}>市场价值</span>
            {marketScore !== null ? (
              <div className="relative flex items-center justify-center">
                <RingProgress value={marketScore} color={themeColors?.success || '#4ADE80'} />
                <span className="absolute text-sm font-bold" style={{ color: themeColors?.success }}>{marketScore}</span>
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColors?.border + '40' }}
              >
                <span className="text-xs" style={{ color: themeColors?.textHint }}>待分析</span>
              </div>
            )}
            <span className="text-[10px]" style={{ color: themeColors?.textHint }}>0-100分</span>
          </div>
        </div>
      )}

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

      {/* 建议转化路径 */}
      {result.status === 'completed' && (
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
            <span>🔄</span>
            <span>建议转化路径</span>
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '技术转让', icon: '📋', desc: '一次性技术成果转让' },
              { label: '许可授权', icon: '📜', desc: '许可使用获取持续收益' },
              { label: '合作研发', icon: '🤝', desc: '联合开发深度合作' },
            ].map(path => (
              <div
                key={path.label}
                className="p-3 rounded-lg text-center cursor-pointer transition-all hover:scale-[0.98]"
                style={{
                  backgroundColor: themeColors?.surfaceHover,
                }}
                onClick={() => alert(`建议路径：${path.label}\n${path.desc}\n\n请联系成果方进一步沟通合作事宜。`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') alert(`建议路径：${path.label}\n${path.desc}`); }}
              >
                <span className="text-xl block mb-1">{path.icon}</span>
                <span className="text-xs font-medium block" style={{ color: themeColors?.text }}>{path.label}</span>
                <span className="text-[10px] block mt-0.5" style={{ color: themeColors?.textHint }}>{path.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
