import { useEffect, useMemo, useState } from 'react';
import type { Demand } from '@/types';
import { demandStorage } from '@/services/storage/demandStorage';
import { useThemeColors } from '@/store/themeStore';
import { ResourceActions, type ResourceActionPatch } from '@/components/common/ResourceActions';
import { DraftSubmissionToolbar } from '@/components/common/DraftSubmissionToolbar';
import { ResourceListToolbar } from '@/components/common/ResourceListToolbar';
import { analyzeDemandDraft, validateDraftAnalysisConfiguration } from '@/services/draftAnalysis';
import {
  collectResourceGroups,
  sortManagedResources,
  UNGROUPED_VALUE,
} from '@/utils/resourceManagement';

interface DemandListProps {
  demands: Demand[];
  statusFilter?: 'all' | 'completed' | 'processing' | 'draft';
  onSelect: (demand: Demand | null) => void;
  selectedId?: string;
  onResumeDraft?: (demand: Demand) => void;
  onDemandUpdated?: (demand: Demand) => void;
  onDemandDeleted?: (id: string) => void;
  onDemandsReplaced?: (demands: Demand[]) => void;
}

export function DemandList({
  demands,
  statusFilter = 'all',
  onSelect,
  selectedId,
  onResumeDraft,
  onDemandUpdated,
  onDemandDeleted,
  onDemandsReplaced,
}: DemandListProps) {
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [isSubmittingDrafts, setIsSubmittingDrafts] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const themeColors = useThemeColors();
  const groups = useMemo(() => collectResourceGroups(demands), [demands]);
  useEffect(() => {
    if (selectedGroup !== 'all' && selectedGroup !== UNGROUPED_VALUE && !groups.includes(selectedGroup)) {
      setSelectedGroup('all');
    }
  }, [groups, selectedGroup]);
  const orderedDemands = useMemo(() => sortManagedResources(demands), [demands]);
  const visibleDemands = orderedDemands.filter((demand) => {
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'completed' && demand.status === 'completed')
      || (statusFilter === 'processing' && demand.status === 'analyzing')
      || (statusFilter === 'draft' && demand.status === 'draft');
    if (!matchesStatus) return false;
    if (selectedGroup === 'all') return true;
    if (selectedGroup === UNGROUPED_VALUE) return !demand.group?.trim();
    return demand.group?.trim() === selectedGroup;
  });
  const drafts = visibleDemands.filter((demand) => demand.status === 'draft');
  const analyzed = visibleDemands.filter((demand) => demand.status !== 'draft');
  const selectedDrafts = drafts.filter((demand) => selectedDraftIds.includes(demand.id));

  useEffect(() => {
    setSelectedDraftIds([]);
    setSubmissionError(null);
  }, [selectedGroup, statusFilter]);

  const renameGroup = (currentName: string, nextName: string) => {
    if (!nextName.trim()) return false;
    const updated = demandStorage.renameGroup(currentName, nextName);
    onDemandsReplaced?.(updated);
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
      const analyzingDemand: Demand = {
        ...draft,
        status: 'analyzing',
        analysis: undefined,
        updatedAt: new Date().toISOString(),
      };
      demandStorage.save(analyzingDemand);
      onDemandUpdated?.(analyzingDemand);

      try {
        const completedDemand = await analyzeDemandDraft(analyzingDemand);
        demandStorage.save(completedDemand);
        onDemandUpdated?.(completedDemand);
      } catch (error) {
        failureCount += 1;
        const message = error instanceof Error ? error.message : '分析失败，请稍后重试';
        const failedDemand: Demand = {
          ...analyzingDemand,
          status: 'failed',
          analysis: {
            enterpriseInfo: '分析过程中出现问题',
            industryAnalysis: message,
            techRoadmap: '',
            suggestions: '请检查 API 配置或网络连接后重试',
          },
          updatedAt: new Date().toISOString(),
        };
        demandStorage.save(failedDemand);
        onDemandUpdated?.(failedDemand);
      }
    }

    setIsSubmittingDrafts(false);
    if (failureCount > 0) {
      setSubmissionError(`${failureCount} 项草稿分析失败，可在“全部”中查看失败原因后重试。`);
    }
  };

  return (
    <div
      className="h-full min-h-0 rounded-lg flex flex-col overflow-hidden"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
      >
      <ResourceListToolbar label="需求列表" total={demands.length} visible={visibleDemands.length} groups={groups} selectedGroup={selectedGroup} onSelectedGroupChange={setSelectedGroup} onRenameGroup={renameGroup} />
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
        {visibleDemands.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: themeColors?.textHint }}>
              {demands.length === 0 ? '暂无需求' : '当前筛选条件下暂无需求'}
            </p>
          </div>
        ) : (
          <div>
            {drafts.length > 0 && (
              <DemandSection
                label="草稿"
                demands={drafts}
                selectedId={selectedId}
                groups={groups}
                onSelect={onSelect}
                onResumeDraft={onResumeDraft}
                onDemandUpdated={onDemandUpdated}
                onDemandDeleted={onDemandDeleted}
                tone="warning"
                selectable={statusFilter === 'draft'}
                selectedDraftIds={selectedDraftIds}
                isSubmitting={isSubmittingDrafts}
                onDraftSelectionChange={toggleDraftSelection}
              />
            )}
            {analyzed.length > 0 && (
              analyzed.map((demand) => (
                <DemandItem
                  key={demand.id}
                  demand={demand}
                  isSelected={selectedId === demand.id}
                  groups={groups}
                  onSelect={onSelect}
                  onResume={onResumeDraft}
                  onUpdated={onDemandUpdated}
                  onDeleted={onDemandDeleted}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DemandSectionProps extends Pick<
  DemandListProps,
  'selectedId' | 'onSelect' | 'onResumeDraft' | 'onDemandUpdated' | 'onDemandDeleted'
> {
  label: string;
  demands: Demand[];
  groups: string[];
  tone: 'warning' | 'primary';
  selectable?: boolean;
  selectedDraftIds?: string[];
  isSubmitting?: boolean;
  onDraftSelectionChange?: (id: string, selected: boolean) => void;
}

function DemandSection({
  label,
  demands,
  selectedId,
  groups,
  onSelect,
  onResumeDraft,
  onDemandUpdated,
  onDemandDeleted,
  tone,
  selectable = false,
  selectedDraftIds = [],
  isSubmitting = false,
  onDraftSelectionChange,
}: DemandSectionProps) {
  const themeColors = useThemeColors();
  const toneColor = tone === 'warning' ? themeColors?.warning : themeColors?.primary;

  return (
    <section>
      <div
        className="px-4 py-2.5 text-xs font-medium flex items-center justify-between sticky top-0 z-10"
        style={{
          backgroundColor: `${toneColor}18`,
          color: toneColor,
          borderBottom: `1px solid ${themeColors?.border}`,
        }}
      >
        <span>{label}</span>
        <span>{demands.length}</span>
      </div>
      {demands.map((demand) => (
        <DemandItem
          key={demand.id}
          demand={demand}
          isSelected={selectedId === demand.id}
          groups={groups}
          onSelect={onSelect}
          onResume={onResumeDraft}
          onUpdated={onDemandUpdated}
          onDeleted={onDemandDeleted}
          selectable={selectable}
          isDraftSelected={selectedDraftIds.includes(demand.id)}
          isSubmitting={isSubmitting}
          onDraftSelectionChange={onDraftSelectionChange}
        />
      ))}
    </section>
  );
}

interface DemandItemProps {
  demand: Demand;
  isSelected: boolean;
  groups: string[];
  onSelect: (demand: Demand | null) => void;
  onResume?: (demand: Demand) => void;
  onUpdated?: (demand: Demand) => void;
  onDeleted?: (id: string) => void;
  selectable?: boolean;
  isDraftSelected?: boolean;
  isSubmitting?: boolean;
  onDraftSelectionChange?: (id: string, selected: boolean) => void;
}

function DemandItem({
  demand,
  isSelected,
  groups,
  onSelect,
  onResume,
  onUpdated,
  onDeleted,
  selectable = false,
  isDraftSelected = false,
  isSubmitting = false,
  onDraftSelectionChange,
}: DemandItemProps) {
  const themeColors = useThemeColors();
  const isDraft = demand.status === 'draft';
  const accentColor = isDraft ? themeColors?.warning : themeColors?.primary;
  const selectedBackground = `${accentColor}12`;

  const updateDemand = (patch: ResourceActionPatch) => {
    const updated: Demand = {
      ...demand,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    demandStorage.save(updated);
    onUpdated?.(updated);
  };

  const deleteDemand = () => {
    demandStorage.delete(demand.id);
    onDeleted?.(demand.id);
  };

  return (
    <article
      className="relative"
      style={{
        borderBottom: `1px solid ${themeColors?.border}`,
        backgroundColor: isSelected ? selectedBackground : 'transparent',
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(demand)}
        className="w-full text-left p-4 transition-all relative"
        style={{ paddingRight: 108, paddingLeft: selectable ? 48 : undefined }}
      >
        {isSelected && (
          <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
        )}
        <div className="min-w-0">
          <h4 className="font-medium text-sm truncate" style={{ color: themeColors?.text }}>
            {demand.title || '未命名需求'}
          </h4>
          {demand.content && (
            <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: themeColors?.textHint }}>
              {demand.content}
            </p>
          )}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {demand.group && (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: themeColors?.backgroundAlt, color: themeColors?.textSecondary }}
              >
                {demand.group}
              </span>
            )}
            {demand.tags.slice(0, demand.group ? 2 : 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ backgroundColor: themeColors?.primaryLight, color: themeColors?.primary }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: themeColors?.textHint }}>
            {new Date(demand.updatedAt).toLocaleString('zh-CN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
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
            onChange={(event) => onDraftSelectionChange?.(demand.id, event.target.checked)}
            style={{ accentColor: themeColors?.primary }}
            aria-label={`选择草稿：${demand.title || '未命名需求'}`}
          />
        </label>
      )}

      <div className="absolute top-3 right-3">
        <ResourceActions
          kind="demand"
          item={demand}
          groups={groups}
          onUpdate={updateDemand}
          onDelete={deleteDemand}
          compact
        />
      </div>

      {isDraft && onResume && (
        <div className="px-4 pb-4 pt-0">
          <button
            type="button"
            onClick={() => onResume(demand)}
            className="w-full px-3 py-2 rounded-md text-xs font-medium"
            style={{ backgroundColor: themeColors?.primary, color: '#fff' }}
          >
            继续编辑
          </button>
        </div>
      )}
    </article>
  );
}
