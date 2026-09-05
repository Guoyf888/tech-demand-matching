import { useState } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { backup, type ImportResult } from '@/utils/backup';
import { Download, Upload } from 'lucide-react';

export function DataBackupPanel() {
  const themeColors = useThemeColors();
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<{ json: string; preview: ImportResult } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleExport = () => {
    try {
      backup.download();
      setMessage({ type: 'success', text: '✓ 已下载备份文件。请妥善保存，API Key 不会包含在备份中。' });
    } catch (e) {
      setMessage({ type: 'error', text: `导出失败: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setMessage(null);
    setPending(null);
    try {
      const json = await backup.pickFile();
      if (json === null) return;
      const result = backup.importFromJSON(json, { dryRun: true });
      if (result.success) {
        setPending({ json, preview: result });
      } else {
        setMessage({
          type: 'error',
          text: `导入失败：${result.errors.join('；')}`,
        });
      }
    } catch (e) {
      setMessage({ type: 'error', text: `导入失败: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    if (!pending) return;
    const result = backup.importFromJSON(pending.json);
    setPending(null);
    setMessage(result.success
      ? { type: 'success', text: `✓ 恢复了 ${result.restoredKeys.length} 项数据：新增 ${result.added} 条，更新 ${result.updated} 条，保留本机 ${result.retained} 条。请刷新页面使部分 store 生效。` }
      : { type: 'error', text: `导入未完成，已恢复 ${result.restoredKeys.length} 项：${result.errors.join('；')}` });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: themeColors?.textSecondary }}>
        备份或恢复需求、成果、项目、草稿、技能等业务数据。模型配置中的密钥字段不导出；业务文档原文保留，请妥善保管备份。
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:scale-[1.01]"
          style={{
            backgroundColor: themeColors?.primary,
            color: '#fff',
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Download size={16} aria-hidden="true" />
            导出备份
          </span>
        </button>
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-50"
          style={{
            backgroundColor: themeColors?.success,
            color: '#fff',
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Upload size={16} aria-hidden="true" />
            {importing ? '导入中...' : '导入备份'}
          </span>
        </button>
      </div>

      {pending && (
        <div className="p-4 rounded-lg space-y-3 text-sm" style={{ backgroundColor: themeColors?.primaryLight, color: themeColors?.text }}>
          <h4 className="font-medium">导入预览（尚未写入）</h4>
          <p>涉及 {pending.preview.restoredKeys.length} 项数据：新增 {pending.preview.added} 条，更新 {pending.preview.updated} 条，保留本机 {pending.preview.retained} 条；跳过 {pending.preview.skippedKeys.length} 项未知数据。</p>
          <p>同 ID 业务列表记录采用较新的更新时间；时间相同或无有效时间时保留本机。模型配置、草稿和会话记忆将覆盖。建议先导出本机备份。</p>
          <div className="flex gap-3">
            <button className="btn-primary px-4" onClick={confirmImport}>确认合并恢复</button>
            <button className="px-4 py-2 rounded border" onClick={() => setPending(null)}>取消导入</button>
          </div>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="p-3 rounded-lg text-sm"
          style={{
            backgroundColor:
              message.type === 'success' ? themeColors?.success + '15'
              : message.type === 'error' ? themeColors?.error + '15'
              : themeColors?.primaryLight,
            border: `1px solid ${
              message.type === 'success' ? themeColors?.success
              : message.type === 'error' ? themeColors?.error
              : themeColors?.primary
            }`,
            color:
              message.type === 'success' ? themeColors?.success
              : message.type === 'error' ? themeColors?.error
              : themeColors?.primary,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
