import { useEffect, useMemo, useState } from 'react';
import type { TechResult } from '@/types';
import { techStorage } from '@/services/storage/techStorage';
import { useThemeColors } from '@/store/themeStore';
import { ResourceActions, type ResourceActionPatch } from '@/components/common/ResourceActions';
import { DraftSubmissionToolbar } from '@/components/common/DraftSubmissionToolbar';
import { ResourceListToolbar } from '@/components/common/ResourceListToolbar';
import { analyzeTechDraft, validateDraftAnalysisConfiguration } from '@/services/draftAnalysis';
import {
  collectResourceGroups,
  sortManagedResources,
  UNGROUPED_VALUE,
} from '@/utils/resourceManagement';

interface TechResultListProps {
  results: TechResult[];
  statusFilter?: 'all' | 'completed' | 'processing' | 'draft';
  onSelect: (result: TechResult | null) => void;
  selectedId?: string;
  onResultUpdated?: (result: TechResult) => void;
  onResultDeleted?: (id: string) => void;
  onResultsReplaced?: (results: TechResult[]) => void;
}

export function TechResultList({
  results,
  statusFilter = 'all',
  onSelect,
  selectedId,
  onResultUpdated,
  onResultDeleted,
  onResultsReplaced,
}: TechResultListProps) {
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [isSubmittingDrafts, setIsSubmittingDrafts] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const themeColors = useThemeColors();
  const groups = useMemo(() => collectResourceGroups(results), [results]);
  useEffect(() => {
    if (selectedGroup !== 'all' && selectedGroup !== UNGROUPED_VALUE && !groups.includes(selectedGroup)) {
      setSelectedGroup('all');
    }
  }, [groups, selectedGroup]);
  const visibleResults = useMemo(() => {
    return sortManagedResources(results).filter((result) => {
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'completed' && result.status === 'completed')
        || (statusFilter === 'processing' && result.status === 'processing')
        || (statusFilter === 'draft' && result.status === 'draft');
      if (!matchesStatus) return false;
      if (selectedGroup === 'all') return true;
      if (selectedGroup === UNGROUPED_VALUE) return !result.group?.trim();
      return result.group?.trim() === selectedGroup;
    });
  }, [results, selectedGroup, statusFilter]);
  const drafts = visibleResults.filter((result) => result.status === 'draft');
  const selectedDrafts = drafts.filter((result) => selectedDraftIds.includes(result.id));

  useEffect(() => {
    setSelectedDraftIds([]);
    setSubmissionError(null);
  }, [selectedGroup, statusFilter]);

  const renameGroup = (currentName: string, nextName: string) => {
    if (!nextName.trim()) return false;
    const updated = techStorage.renameGroup(currentName, nextName);
    onResultsReplaced?.(updated);
    return true;
  };

  const toggleDraftSelection = (id: string, selected: boolean) => {
    setSelectedDraftIds((ids) => selected
      ? [...ids, id]
      : ids.filter((draftId) => draftId !== id));
  };

  const submitSelectedDrafts = async () => {
    if (selectedDrafts.length === 0) return;

    setSubmissionError(null);
    try {
      await validateDraftAnalysisConfiguration();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'AI 分析服务暂不可用');
      return;
    }

    const draftsToSubmit = [...selectedDrafts];
    let failureCount = 0;
    setIsSubmittingDrafts(true);
    setSelectedDraftIds([]);

    for (const draft of draftsToSubmit) {
      const processingResult: TechResult = {
        ...draft,
        status: 'processing',
        error: undefined,
        analysis: undefined,
        updatedAt: new Date().toISOString(),
      };
      techStorage.save(processingResult);
      onResultUpdated?.(processingResult);

      try {
        const completedResult = await analyzeTechDraft(processingResult);
        techStorage.save(completedResult);
        onResultUpdated?.(completedResult);
      } catch (error) {
        failureCount += 1;
        const message = error instanceof Error ? error.message : '分析失败，请稍后重试';
        const failedResult: TechResult = {
          ...processingResult,
          status: 'failed',
          error: message,
          updatedAt: new Date().toISOString(),
        };
        techStorage.save(failedResult);
        onResultUpdated?.(failedResult);
      }
    }

    setIsSubmittingDrafts(false);
    if (failureCount > 0) {
      setSubmissionError(`${failureCount} 项草稿分析失败，可在“全部”中查看失败原因后重试。`);
    }
  };

  return (
    <div
      className="h-full min-h-0 rounded-lg shadow-sm flex flex-col overflow-hidden"
      style={{ backgroundColor: themeColors?.surface, border: `1px solid ${themeColors?.border}` }}
    >
      <ResourceListToolbar label="成果列表" total={results.length} visible={visibleResults.length} groups={groups} selectedGroup={selectedGroup} onSelectedGroupChange={setSelectedGroup} onRenameGroup={renameGroup} />
      {statusFilter === 'draft' && (drafts.length > 0 || isSubmittingDrafts || Boolean(submissionError)) && (
        <DraftSubmissionToolbar
          total={drafts.length}
          selectedCount={selectedDrafts.length}
          isSubmitting={isSubmittingDrafts}
          error={submissionError}
          onToggleAll={(selected) => setSelectedDraftIds(selected ? drafts.map((draft) => draft.id) : [])}
          onSubmit={() => { void submitSelectedDrafts(); }}
        />
      )}

      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {visibleResults.length === 0 ? (
          <div className="p-8 text-center" style={{ color: themeColors?.textHint }}>
            {results.length === 0 ? '暂无成果，尝试上传第一个技术成果吧' : '当前筛选条件下暂无成果'}
          </div>
        ) : (
          visibleResults.map((result) => (
            <TechResultItem
              key={result.id}
              result={result}
              groups={groups}
              isSelected={selectedId === result.id}
              onSelect={onSelect}
              onUpdated={onResultUpdated}
              onDeleted={onResultDeleted}
              selectable={statusFilter === 'draft' && result.status === 'draft'}
              isDraftSelected={selectedDraftIds.includes(result.id)}
              isSubmitting={isSubmittingDrafts}
              onDraftSelectionChange={toggleDraftSelection}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface TechResultItemProps {
  result: TechResult;
  groups: string[];
  isSelected: boolean;
  onSelect: (result: TechResult | null) => void;
  onUpdated?: (result: TechResult) => void;
  onDeleted?: (id: string) => void;
  selectable?: boolean;
  isDraftSelected?: boolean;
  isSubmitting?: boolean;
  onDraftSelectionChange?: (id: string, selected: boolean) => void;
}

function TechResultItem({
  result,
  groups,
  isSelected,
  onSelect,
  onUpdated,
  onDeleted,
  selectable = false,
  isDraftSelected = false,
  isSubmitting = false,
  onDraftSelectionChange,
}: TechResultItemProps) {
  const themeColors = useThemeColors();

  const updateResult = (patch: ResourceActionPatch) => {
    const updated: TechResult = {
      ...result,
      ...patch,
      summary: patch.content !== undefined && patch.content !== result.content ? '' : result.summary,
      updatedAt: new Date().toISOString(),
    };
    techStorage.save(updated);
    onUpdated?.(updated);
  };

  const deleteResult = () => {
    techStorage.delete(result.id);
    onDeleted?.(result.id);
  };

  return (
    <article
      className="relative"
      style={{
        borderBottom: `1px solid ${themeColors?.border}`,
        backgroundColor: isSelected ? themeColors?.primaryLight : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(result)}
        className="w-full text-left p-4 transition-all relative"
        style={{ paddingRight: 108, paddingLeft: selectable ? 48 : undefined }}
      >
        {isSelected && (
          <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: themeColors?.primary }} />
        )}
        <div className="min-w-0">
          <h4
            className="font-medium text-sm truncate"
            style={{ color: isSelected ? themeColors?.primary : themeColors?.text }}
          >
            {result.title || '未命名成果'}
          </h4>
          {(result.summary || result.content) && (
            <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: themeColors?.textSecondary }}>
              {result.summary || result.content}
            </p>
          )}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {result.group && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: themeColors?.backgroundAlt, color: themeColors?.textSecondary }}
              >
                {result.group}
              </span>
            )}
            {result.tags.slice(0, result.group ? 2 : 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: themeColors?.primaryLight, color: themeColors?.primary }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="text-xs mt-2" style={{ color: themeColors?.textHint }}>
            {new Date(result.updatedAt || result.createdAt).toLocaleDateString('zh-CN', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </div>
        </div>
      </button>

      {selectable && (
        <label
          className="absolute left-4 top-4 inline-flex items-center justify-center cursor-pointer"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={isDraftSelected}
            disabled={isSubmitting}
            onChange={(event) => onDraftSelectionChange?.(result.id, event.target.checked)}
            style={{ accentColor: themeColors?.primary }}
            aria-label={`选择草稿：${result.title || '未命名成果'}`}
          />
        </label>
      )}

      <div className="absolute top-3 right-3">
        <ResourceActions
          kind="tech"
          item={result}
          groups={groups}
          onUpdate={updateResult}
          onDelete={deleteResult}
          compact
        />
      </div>
    </article>
  );
}
