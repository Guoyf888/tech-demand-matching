import { useState } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { backup } from '@/utils/backup';
import { Download, Upload } from 'lucide-react';

export function DataBackupPanel() {
  const themeColors = useThemeColors();
  const [importing, setImporting] = useState(false);
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
    try {
      const result = await backup.pickAndImport();
      if (!result) {
        setImporting(false);
        return;
      }
      if (result.success) {
        setMessage({
          type: 'success',
          text: `✓ 导入成功：恢复了 ${result.restoredKeys.length} 项数据${result.skippedKeys.length ? `，跳过 ${result.skippedKeys.length} 项未知键` : ''}。请刷新页面使部分 store 生效。`,
        });
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

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: themeColors?.textSecondary }}>
        备份或恢复需求、成果、草稿、技能等业务数据。API Key 始终保存在系统钥匙串中，不会被导出。
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

      {message && (
        <div
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
