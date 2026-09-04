import { Sparkles } from 'lucide-react';
import { useThemeColors } from '@/store/themeStore';

interface DraftSubmissionToolbarProps {
  total: number;
  selectedCount: number;
  isSubmitting: boolean;
  error?: string | null;
  onToggleAll: (selected: boolean) => void;
  onSubmit: () => void;
}

export function DraftSubmissionToolbar({
  total,
  selectedCount,
  isSubmitting,
  error,
  onToggleAll,
  onSubmit,
}: DraftSubmissionToolbarProps) {
  const themeColors = useThemeColors();
  const allSelected = total > 0 && selectedCount === total;

  return (
    <div
      className="px-3.5 py-2.5 flex-shrink-0"
      style={{ borderBottom: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}
    >
      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex min-w-0 items-center gap-2 text-xs cursor-pointer" style={{ color: themeColors?.textSecondary }}>
          <input
            type="checkbox"
            className="w-4 h-4 flex-shrink-0"
            checked={allSelected}
            disabled={isSubmitting}
            onChange={(event) => onToggleAll(event.target.checked)}
            style={{ accentColor: themeColors?.primary }}
            aria-label="全选草稿"
          />
          <span>全选当前草稿</span>
          <span className="tabular-nums" style={{ color: themeColors?.textHint }}>已选 {selectedCount} 项</span>
        </label>
        <button
          type="button"
          disabled={selectedCount === 0 || isSubmitting}
          onClick={onSubmit}
          className="workspace-form-action is-primary !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles size={14} aria-hidden="true" />
          {isSubmitting ? '提交分析中' : '一键提交分析'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs" style={{ color: themeColors?.error }}>{error}</p>}
    </div>
  );
}
