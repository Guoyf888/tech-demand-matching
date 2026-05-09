import { useState } from 'react';
import { Demand } from '@/types';
import { demandStorage } from '@/services/storage/demandStorage';
import { themes, useThemeStore } from '@/store/themeStore';

interface DemandListProps {
  demands: Demand[];
  onSelect: (demand: Demand) => void;
  selectedId?: string;
  onResumeDraft?: (demand: Demand) => void;
  onDemandsChange?: () => void;
}

export function DemandList({
  demands,
  onSelect,
  selectedId,
  onResumeDraft,
  onDemandsChange
}: DemandListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const handleDelete = (demand: Demand) => {
    if (deleteConfirm === demand.id) {
      demandStorage.delete(demand.id);
      setDeleteConfirm(null);
      if (onDemandsChange) {
        onDemandsChange();
      }
      // Select first remaining item or null
      const remaining = demands.filter(d => d.id !== demand.id);
      if (remaining.length > 0) {
        onSelect(remaining[0]);
      } else {
        onSelect(null as any);
      }
    } else {
      setDeleteConfirm(demand.id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleResume = (demand: Demand) => {
    if (onResumeDraft) {
      onResumeDraft(demand);
    }
  };

  // 分离草稿和已完成的需求
  const drafts = demands.filter(d => d.status === 'draft');
  const completed = demands.filter(d => d.status === 'completed' || d.status === 'analyzing');

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${themeColors?.border}` }}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: themeColors?.text }}
        >
          我的需求 ({demands.length})
        </h3>
        {drafts.length > 0 && (
          <p
            className="text-xs mt-1"
            style={{ color: themeColors?.textHint }}
          >
            {drafts.length} 个草稿 · {completed.length} 个已完成
          </p>
        )}
      </div>

      {/* List with scrollbar */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: '400px', minHeight: 0 }}
      >
        {demands.length === 0 ? (
          <div className="p-8 text-center">
            <span className="text-4xl mb-3 block">📋</span>
            <p
              className="text-sm"
              style={{ color: themeColors?.textHint }}
            >
              暂无需求
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: themeColors?.textHint }}
            >
              点击上方输入框添加技术需求
            </p>
          </div>
        ) : (
          <div>
            {/* Drafts Section */}
            {drafts.length > 0 && (
              <div>
                <div
                  className="px-4 py-2.5 text-xs font-medium flex items-center gap-2 sticky top-0 z-10"
                  style={{
                    backgroundColor: themeColors?.warning + '20',
                    color: themeColors?.warning,
                    borderBottom: `1px solid ${themeColors?.border}`,
                  }}
                >
                  <span>📝</span>
                  <span>草稿</span>
                  <span
                    className="ml-auto px-1.5 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: themeColors?.warning + '30',
                      color: themeColors?.warning,
                    }}
                  >
                    {drafts.length}
                  </span>
                </div>
                {drafts.map((demand) => (
                  <DemandItem
                    key={demand.id}
                    demand={demand}
                    isSelected={selectedId === demand.id}
                    onSelect={onSelect}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    deleteConfirm={deleteConfirm === demand.id}
                    themeColors={themeColors}
                    isDraft={true}
                  />
                ))}
              </div>
            )}

            {/* Completed Section */}
            {completed.length > 0 && (
              <div>
                {drafts.length > 0 && (
                  <div
                    className="px-4 py-2.5 text-xs font-medium flex items-center gap-2 sticky top-0 z-10"
                    style={{
                      backgroundColor: themeColors?.primary + '15',
                      color: themeColors?.primary,
                      borderBottom: `1px solid ${themeColors?.border}`,
                    }}
                  >
                    <span>✅</span>
                    <span>已完成</span>
                    <span
                      className="ml-auto px-1.5 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor: themeColors?.primary + '25',
                        color: themeColors?.primary,
                      }}
                    >
                      {completed.length}
                    </span>
                  </div>
                )}
                {completed.map((demand) => (
                  <DemandItem
                    key={demand.id}
                    demand={demand}
                    isSelected={selectedId === demand.id}
                    onSelect={onSelect}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    deleteConfirm={deleteConfirm === demand.id}
                    themeColors={themeColors}
                    isDraft={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DemandItemProps {
  demand: Demand;
  isSelected: boolean;
  onSelect: (demand: Demand) => void;
  onResume: (demand: Demand) => void;
  onDelete: (demand: Demand) => void;
  deleteConfirm: boolean;
  themeColors: {
    primary?: string;
    primaryLight?: string;
    primaryHover?: string;
    text?: string;
    textSecondary?: string;
    textHint?: string;
    border?: string;
    surface?: string;
    surfaceHover?: string;
    success?: string;
    warning?: string;
    error?: string;
    background?: string;
    backgroundAlt?: string;
  } | undefined;
  isDraft: boolean;
}

function DemandItem({
  demand,
  isSelected,
  onSelect,
  onResume,
  onDelete,
  deleteConfirm,
  themeColors,
  isDraft
}: DemandItemProps) {
  const selectedBg = isDraft
    ? (themeColors?.warning + '15')
    : (themeColors?.primary + '15');

  return (
    <div
      className="relative"
      style={{
        borderBottom: `1px solid ${themeColors?.border}`,
      }}
    >
      <button
        onClick={() => onSelect(demand)}
        className="w-full text-left p-4 transition-all relative"
        style={{
          backgroundColor: isSelected ? selectedBg : 'transparent',
        }}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{
              backgroundColor: isDraft ? themeColors?.warning : themeColors?.primary,
            }}
          />
        )}

        {/* Hover effect */}
        {!isSelected && (
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
            style={{ backgroundColor: themeColors?.surfaceHover }}
          />
        )}

        <div className="relative">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4
                  className="font-medium text-sm truncate"
                  style={{ color: themeColors?.text }}
                >
                  {demand.title || '未命名需求'}
                </h4>
                {isDraft && (
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                    style={{
                      backgroundColor: themeColors?.warning + '25',
                      color: themeColors?.warning,
                    }}
                  >
                    草稿
                  </span>
                )}
              </div>

              {demand.content && (
                <p
                  className="text-xs mt-1.5 line-clamp-2 leading-relaxed"
                  style={{ color: themeColors?.textHint }}
                >
                  {demand.content}
                </p>
              )}

              {/* Tags */}
              {demand.tags && demand.tags.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {demand.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: themeColors?.primaryLight,
                        color: themeColors?.primary,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {demand.tags.length > 3 && (
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ color: themeColors?.textHint }}
                    >
                      +{demand.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Time */}
              <p
                className="text-xs mt-2"
                style={{ color: themeColors?.textHint }}
              >
                {new Date(demand.updatedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Status Badge */}
            {!isDraft && (
              <span
                className="px-2 py-0.5 rounded text-xs flex-shrink-0 font-medium"
                style={{
                  backgroundColor: demand.status === 'completed'
                    ? themeColors?.success + '20'
                    : themeColors?.primary + '20',
                  color: demand.status === 'completed'
                    ? themeColors?.success
                    : themeColors?.primary,
                }}
              >
                {demand.status === 'completed' ? '✓' : '⏳'}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Draft Action Buttons */}
      {isDraft && (
        <div
          className="px-4 pb-4 pt-1 flex gap-2"
          style={{
            backgroundColor: isSelected ? selectedBg : 'transparent',
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResume(demand);
            }}
            className="flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[0.98]"
            style={{
              backgroundColor: themeColors?.primary,
              color: '#FFFFFF',
            }}
          >
            ✏️ 继续编辑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(demand);
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:scale-[0.98]"
            style={{
              backgroundColor: deleteConfirm
                ? themeColors?.error
                : themeColors?.error + '15',
              color: deleteConfirm ? '#FFFFFF' : themeColors?.error,
            }}
          >
            {deleteConfirm ? '⚠️ 确认删除' : '🗑️ 删除'}
          </button>
        </div>
      )}
    </div>
  );
}
