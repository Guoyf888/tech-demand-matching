import { useEffect, useState, type FormEvent } from 'react';
import { Check, Folder, Pencil, X } from 'lucide-react';
import { useThemeColors } from '@/store/themeStore';
import { UNGROUPED_VALUE } from '@/utils/resourceManagement';

interface ResourceListToolbarProps {
  label: string;
  total: number;
  visible: number;
  groups: string[];
  selectedGroup: string;
  onSelectedGroupChange: (group: string) => void;
  onRenameGroup: (oldName: string, newName: string) => boolean;
}

export function ResourceListToolbar({
  label,
  total,
  visible,
  groups,
  selectedGroup,
  onSelectedGroupChange,
  onRenameGroup,
}: ResourceListToolbarProps) {
  const themeColors = useThemeColors();
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(selectedGroup);
  const [error, setError] = useState('');
  const canRename = selectedGroup !== 'all' && selectedGroup !== UNGROUPED_VALUE;

  useEffect(() => {
    setName(canRename ? selectedGroup : '');
    setIsRenaming(false);
    setError('');
  }, [canRename, selectedGroup]);

  const submitRename = (event: FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setError('请输入分组名称');
      return;
    }
    if (nextName !== selectedGroup && groups.includes(nextName)) {
      setError('该分组已存在');
      return;
    }
    if (onRenameGroup(selectedGroup, nextName)) {
      onSelectedGroupChange(nextName);
      setIsRenaming(false);
      setError('');
    }
  };

  return (
    <div className="p-3.5 flex-shrink-0" style={{ borderBottom: `1px solid ${themeColors?.border}` }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: themeColors?.text }}>{label}</h3>
        <span className="text-xs tabular-nums" style={{ color: themeColors?.textHint }}>{visible}/{total}</span>
      </div>
      {isRenaming ? (
        <form onSubmit={submitRename} className="mt-3">
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              className="min-w-0 flex-1 h-9 px-2.5 rounded-md text-xs outline-none"
              style={{ backgroundColor: themeColors?.surface, border: `1px solid ${error ? themeColors?.error : themeColors?.primary}`, color: themeColors?.text }}
              aria-label="新的分组名称"
            />
            <button type="submit" className="w-9 h-9 inline-flex items-center justify-center rounded-md" style={{ backgroundColor: themeColors?.primary, color: '#fff' }} title="保存分组名称" aria-label="保存分组名称"><Check size={15} /></button>
            <button type="button" onClick={() => setIsRenaming(false)} className="w-9 h-9 inline-flex items-center justify-center rounded-md" style={{ backgroundColor: themeColors?.surfaceHover, color: themeColors?.textSecondary }} title="取消重命名" aria-label="取消重命名"><X size={15} /></button>
          </div>
          {error && <p className="mt-1.5 text-xs" style={{ color: themeColors?.error }}>{error}</p>}
        </form>
      ) : (
        <div className="mt-3 flex items-center gap-1.5">
          <label className="flex flex-1 min-w-0 items-center gap-2 px-2.5 rounded-md" style={{ height: 36, color: themeColors?.textHint, backgroundColor: themeColors?.background, border: `1px solid ${themeColors?.border}` }}>
            <Folder size={14} aria-hidden="true" />
            <span className="sr-only">按分组筛选</span>
            <select className="flex-1 min-w-0 h-full bg-transparent outline-none text-xs" style={{ color: themeColors?.textSecondary }} value={selectedGroup} onChange={(event) => onSelectedGroupChange(event.target.value)}>
              <option value="all">全部分组</option>
              {groups.map((group) => <option key={group} value={group}>{group}</option>)}
              <option value={UNGROUPED_VALUE}>未分组</option>
            </select>
          </label>
          {canRename && (
            <button type="button" onClick={() => setIsRenaming(true)} className="w-9 h-9 inline-flex items-center justify-center rounded-md" style={{ backgroundColor: themeColors?.surfaceHover, color: themeColors?.textSecondary, border: `1px solid ${themeColors?.border}` }} title="重命名当前分组" aria-label="重命名当前分组"><Pencil size={14} /></button>
          )}
        </div>
      )}
    </div>
  );
}
