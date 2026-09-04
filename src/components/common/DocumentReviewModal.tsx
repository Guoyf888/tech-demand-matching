import { useEffect, useMemo, useState } from 'react';
import { Check, FileText, Image as ImageIcon, ListChecks, X } from 'lucide-react';
import {
  splitDocumentEntries,
  type DocumentEntry,
  type ParsedDocument,
} from '@/services/documentParser';
import { useThemeColors } from '@/store/themeStore';

export interface DocumentReviewValue {
  document: ParsedDocument;
  entries: DocumentEntry[];
}

interface DocumentReviewModalProps {
  document: ParsedDocument;
  onCancel: () => void;
  onConfirm: (value: DocumentReviewValue) => void;
}

const FILE_LABELS: Record<ParsedDocument['fileType'], string> = {
  docx: 'Word 文档',
  pdf: 'PDF 文档',
  xlsx: 'Excel 工作簿',
  pptx: 'PowerPoint 演示文稿',
};

function createEntries(document: ParsedDocument): DocumentEntry[] {
  return splitDocumentEntries(document)
    .filter((entry) => entry.title.trim() && entry.content.trim())
    .map((entry) => ({ ...entry, title: entry.title.slice(0, 100), content: entry.content.slice(0, 50000) }));
}

export function DocumentReviewModal({ document, onCancel, onConfirm }: DocumentReviewModalProps) {
  const themeColors = useThemeColors();
  const initialEntries = useMemo(() => createEntries(document), [document]);
  const [entries, setEntries] = useState<DocumentEntry[]>(initialEntries);
  const [selectedId, setSelectedId] = useState(initialEntries[0]?.id || '');

  useEffect(() => {
    setEntries(initialEntries);
    setSelectedId(initialEntries[0]?.id || '');
  }, [document, initialEntries]);

  const selectedEntry = entries.find((entry) => entry.id === selectedId) || entries[0];
  const isBatch = entries.length > 1;

  const updateSelectedEntry = (patch: Partial<Pick<DocumentEntry, 'title' | 'content'>>) => {
    setEntries((current) => current.map((entry) => entry.id === selectedEntry?.id ? { ...entry, ...patch } : entry));
  };

  const handleConfirm = () => {
    const validEntries = entries
      .map((entry) => ({ ...entry, title: entry.title.trim(), content: entry.content.trim() }))
      .filter((entry) => entry.title && entry.content);
    if (validEntries.length > 0) onConfirm({ document, entries: validEntries });
  };

  return (
    <div className="fixed inset-0 z-[1250] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }} role="dialog" aria-modal="true" aria-labelledby="document-review-title">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-lg shadow-2xl" style={{ backgroundColor: themeColors?.surface, border: `1px solid ${themeColors?.border}` }}>
        <div className="flex items-start justify-between gap-4 px-6 py-4" style={{ borderBottom: `1px solid ${themeColors?.border}` }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText size={18} style={{ color: themeColors?.primary }} />
              <h2 id="document-review-title" className="text-base font-semibold" style={{ color: themeColors?.text }}>确认文档识别结果</h2>
            </div>
            <p className="mt-1 text-xs truncate" style={{ color: themeColors?.textHint }}>{document.fileName} · {FILE_LABELS[document.fileType]}{document.pageCount ? ` · ${document.pageCount} 页/工作表` : ''}</p>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-md" style={{ color: themeColors?.textHint }} aria-label="关闭确认窗口" title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-3 text-sm flex items-center gap-2" style={{ backgroundColor: themeColors?.primaryLight, color: themeColors?.textSecondary }}>
          <ListChecks size={16} style={{ color: themeColors?.primary }} />
          {isBatch ? `已识别出 ${entries.length} 项独立内容。请逐项核对后批量创建为草稿，不会自动发起多次 AI 分析。` : '已完成文字、表格和图片提取。请检查标题与正文后回填。'}
        </div>

        <div className="flex-1 min-h-0 flex overflow-hidden">
          {isBatch && (
            <aside className="w-56 flex-shrink-0 overflow-y-auto p-3" style={{ borderRight: `1px solid ${themeColors?.border}`, backgroundColor: themeColors?.backgroundAlt }}>
              <p className="px-2 pb-2 text-xs font-medium" style={{ color: themeColors?.textHint }}>识别条目（{entries.length}）</p>
              <div className="space-y-1">
                {entries.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className="w-full text-left px-2.5 py-2 rounded-md text-xs leading-relaxed transition-colors"
                    style={{ backgroundColor: selectedEntry?.id === entry.id ? themeColors?.surface : 'transparent', color: selectedEntry?.id === entry.id ? themeColors?.primary : themeColors?.textSecondary }}
                    title={entry.title}
                  >
                    <span className="mr-1.5" style={{ color: themeColors?.textHint }}>{index + 1}.</span>{entry.title}
                  </button>
                ))}
              </div>
            </aside>
          )}

          <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
            {document.warnings?.map((warning) => <p key={warning} className="text-xs" style={{ color: themeColors?.warning }}>{warning}</p>)}
            {document.images && document.images.length > 0 && !isBatch && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: themeColors?.text }}><ImageIcon size={15} /> 已提取图片（{document.images.length}）</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {document.images.map((image) => <img key={image.name} src={image.dataUrl} alt={image.name} className="w-full aspect-video object-cover rounded-md" style={{ border: `1px solid ${themeColors?.border}` }} />)}
                </div>
              </div>
            )}
            {selectedEntry && (
              <>
                <label className="block text-sm font-medium" style={{ color: themeColors?.text }}>
                  标题
                  <input value={selectedEntry.title} onChange={(event) => updateSelectedEntry({ title: event.target.value })} maxLength={100} className="input mt-1.5 w-full" style={{ backgroundColor: themeColors?.surface, borderColor: themeColors?.border, color: themeColors?.text }} />
                </label>
                <label className="block text-sm font-medium" style={{ color: themeColors?.text }}>
                  提取内容
                  <textarea value={selectedEntry.content} onChange={(event) => updateSelectedEntry({ content: event.target.value })} maxLength={50000} rows={isBatch ? 16 : 12} className="input mt-1.5 w-full resize-y" style={{ backgroundColor: themeColors?.surface, borderColor: themeColors?.border, color: themeColors?.text }} />
                </label>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: `1px solid ${themeColors?.border}` }}>
          <button type="button" onClick={onCancel} className="workspace-form-action is-secondary">取消</button>
          <button type="button" onClick={handleConfirm} disabled={!entries.some((entry) => entry.title.trim() && entry.content.trim())} className="workspace-form-action is-primary"><Check size={16} aria-hidden="true" />{isBatch ? `创建 ${entries.length} 项独立草稿` : '确认并回填'}</button>
        </div>
      </div>
    </div>
  );
}
