import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderInput,
  MoreHorizontal,
  Pencil,
  Pin,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { ResourceManagementFields } from '@/types';
import { normalizeResourceGroup } from '@/utils/resourceManagement';
import './ResourceActions.css';

export type ResourceActionPatch = Partial<ResourceManagementFields & {
  title: string;
  content: string;
}>;

type ResourceActionItem = ResourceManagementFields & {
  id: string;
  title: string;
  content: string;
};

interface ResourceActionsProps {
  kind: 'demand' | 'tech';
  item: ResourceActionItem;
  groups: string[];
  onUpdate: (patch: ResourceActionPatch) => void;
  onDelete: () => void;
  compact?: boolean;
}

type DialogMode = 'edit' | 'group' | 'delete' | null;

export function ResourceActions({
  kind,
  item,
  groups,
  onUpdate,
  onDelete,
  compact = false,
}: ResourceActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [group, setGroup] = useState(normalizeResourceGroup(item.group));
  const [validationError, setValidationError] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeMenu = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !menuButtonRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const closeOnViewportChange = () => setMenuOpen(false);

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!dialogMode) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialogMode(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [dialogMode]);

  const stopPropagation = (event: MouseEvent) => event.stopPropagation();

  const toggleMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!menuOpen) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(window.innerWidth - 184, rect.right - 176)),
      });
    }
    setMenuOpen((open) => !open);
  };

  const openDialog = (mode: Exclude<DialogMode, null>) => {
    setTitle(item.title);
    setContent(item.content);
    setGroup(normalizeResourceGroup(item.group));
    setValidationError('');
    setDialogMode(mode);
    setMenuOpen(false);
  };

  const submitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      setValidationError('标题和详细内容不能为空');
      return;
    }
    onUpdate({ title: title.trim(), content: content.trim() });
    setDialogMode(null);
  };

  const submitGroup = (event: FormEvent) => {
    event.preventDefault();
    onUpdate({ group: normalizeResourceGroup(group) || undefined });
    setDialogMode(null);
  };

  const confirmDelete = () => {
    onDelete();
    setDialogMode(null);
  };

  const itemLabel = kind === 'demand' ? '需求' : '成果';
  const titleMaxLength = kind === 'demand' ? 50 : 100;
  const contentMaxLength = kind === 'demand' ? 2000 : 50000;

  return (
    <div
      className={`resource-actions ${compact ? 'is-compact' : ''}`}
      onClick={stopPropagation}
    >
      <button
        type="button"
        className={`resource-action-icon ${item.starred ? 'is-active is-starred' : ''}`}
        onClick={() => onUpdate({ starred: !item.starred })}
        title={item.starred ? '取消星标' : '添加星标'}
        aria-label={item.starred ? '取消星标' : '添加星标'}
        aria-pressed={Boolean(item.starred)}
      >
        <Star size={15} fill={item.starred ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`resource-action-icon ${item.pinned ? 'is-active' : ''}`}
        onClick={() => onUpdate({ pinned: !item.pinned })}
        title={item.pinned ? '取消置顶' : '置顶'}
        aria-label={item.pinned ? '取消置顶' : '置顶'}
        aria-pressed={Boolean(item.pinned)}
      >
        <Pin size={15} fill={item.pinned ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <button
        ref={menuButtonRef}
        type="button"
        className={`resource-action-icon ${menuOpen ? 'is-active' : ''}`}
        onClick={toggleMenu}
        title="更多操作"
        aria-label="更多操作"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {menuOpen && createPortal(
        <div
          ref={menuRef}
          className="resource-action-menu"
          role="menu"
          style={menuPosition}
        >
          <button type="button" role="menuitem" onClick={() => openDialog('edit')}>
            <Pencil size={15} aria-hidden="true" />编辑{itemLabel}
          </button>
          <button type="button" role="menuitem" onClick={() => openDialog('group')}>
            <FolderInput size={15} aria-hidden="true" />设置分组
          </button>
          <div className="resource-action-menu-divider" />
          <button type="button" role="menuitem" className="is-danger" onClick={() => openDialog('delete')}>
            <Trash2 size={15} aria-hidden="true" />删除{itemLabel}
          </button>
        </div>,
        document.body,
      )}

      {dialogMode && createPortal(
        <div className="resource-dialog-backdrop" onMouseDown={() => setDialogMode(null)}>
          <section
            className="resource-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`resource-dialog-title-${item.id}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <h2 id={`resource-dialog-title-${item.id}`}>
                {dialogMode === 'edit' && `编辑${itemLabel}`}
                {dialogMode === 'group' && '设置分组'}
                {dialogMode === 'delete' && `删除${itemLabel}`}
              </h2>
              <button type="button" onClick={() => setDialogMode(null)} title="关闭" aria-label="关闭">
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            {dialogMode === 'edit' && (
              <form onSubmit={submitEdit}>
                <label>
                  <span>{itemLabel}标题</span>
                  <input
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={titleMaxLength}
                  />
                </label>
                <label>
                  <span>详细内容</span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    maxLength={contentMaxLength}
                    rows={8}
                  />
                </label>
                {validationError && <p className="resource-dialog-error">{validationError}</p>}
                <div className="resource-dialog-actions">
                  <button type="button" className="is-secondary" onClick={() => setDialogMode(null)}>取消</button>
                  <button type="submit" className="is-primary">保存修改</button>
                </div>
              </form>
            )}

            {dialogMode === 'group' && (
              <form onSubmit={submitGroup}>
                <label>
                  <span>分组名称</span>
                  <input
                    autoFocus
                    value={group}
                    onChange={(event) => setGroup(event.target.value)}
                    placeholder="例如：重点跟进"
                    maxLength={30}
                    list={`resource-groups-${item.id}`}
                  />
                  <datalist id={`resource-groups-${item.id}`}>
                    {groups.map((name) => <option key={name} value={name} />)}
                  </datalist>
                </label>
                <div className="resource-dialog-actions">
                  <button
                    type="button"
                    className="is-secondary"
                    onClick={() => {
                      onUpdate({ group: undefined });
                      setDialogMode(null);
                    }}
                  >
                    移出分组
                  </button>
                  <button type="submit" className="is-primary">保存分组</button>
                </div>
              </form>
            )}

            {dialogMode === 'delete' && (
              <div className="resource-delete-confirm">
                <p>确定删除“{item.title || `未命名${itemLabel}`}”吗？此操作无法撤销。</p>
                <div className="resource-dialog-actions">
                  <button type="button" className="is-secondary" onClick={() => setDialogMode(null)}>取消</button>
                  <button type="button" className="is-danger" onClick={confirmDelete}>确认删除</button>
                </div>
              </div>
            )}
          </section>
        </div>,
        document.body,
      )}
    </div>
  );
}
