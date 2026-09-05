import { useMemo, useState } from 'react';
import {
  matchProjectStorage,
  type MatchProject,
  type MatchProjectStage,
} from '@/services/storage/matchProjectStorage';
import { useThemeColors } from '@/store/themeStore';
import { AlertTriangle, CalendarClock, CheckCircle2, FolderKanban, Save, Search } from 'lucide-react';

const STAGES: Array<{ value: MatchProjectStage; label: string }> = [
  { value: 'contacting', label: '初步对接' },
  { value: 'clarifying', label: '需求澄清' },
  { value: 'validating', label: '技术验证' },
  { value: 'negotiating', label: '商务协商' },
  { value: 'signed', label: '已签约' },
  { value: 'closed', label: '已关闭' },
];

const STAGE_LABELS = Object.fromEntries(STAGES.map((stage) => [stage.value, stage.label])) as Record<MatchProjectStage, string>;

function isClosed(project: MatchProject): boolean {
  return project.stage === 'signed' || project.stage === 'closed';
}
function isOverdue(project: MatchProject, today: string): boolean {
  return Boolean(project.dueDate && project.dueDate < today && !isClosed(project));
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MatchProjectBoard() {
  const [projects, setProjects] = useState(() => matchProjectStorage.getAll());
  const [drafts, setDrafts] = useState<Record<string, MatchProject>>(() => Object.fromEntries(projects.map((project) => [project.id, project])));
  const [stageFilter, setStageFilter] = useState<'all' | MatchProjectStage>('all');
  const [keyword, setKeyword] = useState('');
  const [savedId, setSavedId] = useState('');
  const themeColors = useThemeColors();
  const today = new Date().toISOString().slice(0, 10);

  const visibleProjects = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return projects.filter((project) => {
      if (stageFilter !== 'all' && project.stage !== stageFilter) return false;
      if (!normalizedKeyword) return true;
      return [project.demandTitle, project.techTitle, project.owner, project.nextAction]
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [keyword, projects, stageFilter]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((project) => !isClosed(project)).length,
    overdue: projects.filter((project) => isOverdue(project, today)).length,
    signed: projects.filter((project) => project.stage === 'signed').length,
  }), [projects, today]);

  const updateDraft = (id: string, changes: Partial<MatchProject>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } }));
    setSavedId('');
  };

  const saveProject = (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const saved = matchProjectStorage.update(id, {
      stage: draft.stage,
      owner: draft.owner.trim(),
      nextAction: draft.nextAction.trim(),
      dueDate: draft.dueDate,
      note: draft.note.trim(),
    });
    if (!saved) return;
    setProjects(matchProjectStorage.getAll());
    setDrafts((current) => ({ ...current, [id]: saved }));
    setSavedId(id);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: '全部项目', value: stats.total, icon: FolderKanban, color: themeColors.primary },
          { label: '推进中', value: stats.active, icon: CalendarClock, color: themeColors.info },
          { label: '已逾期', value: stats.overdue, icon: AlertTriangle, color: themeColors.warning },
          { label: '已签约', value: stats.signed, icon: CheckCircle2, color: themeColors.success },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}><Icon size={20} aria-hidden="true" /></div>
            <div><span className="text-2xl font-bold block" style={{ color: themeColors.text }}>{value}</span><span className="text-xs" style={{ color: themeColors.textHint }}>{label}</span></div>
          </div>
        ))}
      </div>

      <section className="rounded-xl p-4 flex flex-col xl:flex-row gap-3 xl:items-center" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: themeColors.textHint }} aria-hidden="true" />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索需求、成果、负责人或下一步" className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }} />
        </label>
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as 'all' | MatchProjectStage)} className="rounded-lg px-3 py-2.5 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }}>
          <option value="all">全部阶段</option>
          {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </select>
      </section>

      {projects.length === 0 ? (
        <div className="text-center p-12 rounded-xl" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}>
          <FolderKanban size={42} className="mx-auto mb-4" style={{ color: themeColors.primary }} aria-hidden="true" />
          <p className="font-medium" style={{ color: themeColors.text }}>尚无对接项目</p>
          <p className="text-sm mt-2" style={{ color: themeColors.textHint }}>先在「匹配评估」中认可候选，再创建对接项目。</p>
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="text-center p-10 rounded-xl" style={{ backgroundColor: themeColors.surface, border: `1px solid ${themeColors.border}` }}><p className="font-medium" style={{ color: themeColors.text }}>没有符合筛选条件的项目</p></div>
      ) : (
        <div className="space-y-4">
          {visibleProjects.map((project) => {
            const draft = drafts[project.id] || project;
            const overdue = isOverdue(project, today);
            return (
              <article key={project.id} className="rounded-xl p-5" style={{ backgroundColor: themeColors.surface, border: `1px solid ${overdue ? themeColors.warning : themeColors.border}` }}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div className="min-w-0"><h3 className="font-semibold truncate" style={{ color: themeColors.text }}>{project.demandTitle}</h3><p className="text-sm mt-1 truncate" style={{ color: themeColors.textSecondary }}>对接成果：{project.techTitle}</p></div>
                  <div className="flex items-center gap-2"><span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: themeColors.primaryLight, color: themeColors.primary }}>{STAGE_LABELS[project.stage]}</span><span className="text-xs font-semibold" style={{ color: themeColors.success }}>匹配 {project.score} 分</span>{overdue && <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: themeColors.warningLight, color: themeColors.warning }}>已逾期</span>}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label><span className="text-xs font-medium block mb-1.5" style={{ color: themeColors.textSecondary }}>当前阶段</span><select value={draft.stage} onChange={(event) => updateDraft(project.id, { stage: event.target.value as MatchProjectStage })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }}>{STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}</select></label>
                  <label><span className="text-xs font-medium block mb-1.5" style={{ color: themeColors.textSecondary }}>负责人</span><input value={draft.owner} onChange={(event) => updateDraft(project.id, { owner: event.target.value })} placeholder="填写负责人" className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }} /></label>
                  <label><span className="text-xs font-medium block mb-1.5" style={{ color: themeColors.textSecondary }}>行动截止日</span><input type="date" value={draft.dueDate} onChange={(event) => updateDraft(project.id, { dueDate: event.target.value })} className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }} /></label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                  <label><span className="text-xs font-medium block mb-1.5" style={{ color: themeColors.textSecondary }}>下一步行动</span><textarea rows={2} value={draft.nextAction} onChange={(event) => updateDraft(project.id, { nextAction: event.target.value })} placeholder="例如：安排技术澄清会并确认样机条件" className="w-full rounded-lg px-3 py-2 text-sm resize-y outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }} /></label>
                  <label><span className="text-xs font-medium block mb-1.5" style={{ color: themeColors.textSecondary }}>推进备注</span><textarea rows={2} value={draft.note} onChange={(event) => updateDraft(project.id, { note: event.target.value })} placeholder="记录沟通结论、待补材料和风险" className="w-full rounded-lg px-3 py-2 text-sm resize-y outline-none" style={{ backgroundColor: themeColors.background, border: `1px solid ${themeColors.border}`, color: themeColors.text }} /></label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px]" style={{ color: themeColors.textHint }}>最近更新：{formatUpdatedAt(project.updatedAt)}</span><button onClick={() => saveProject(project.id)} className="btn-primary px-4 py-2 text-xs inline-flex items-center gap-1.5"><Save size={14} />{savedId === project.id ? '已保存' : '保存进展'}</button></div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
