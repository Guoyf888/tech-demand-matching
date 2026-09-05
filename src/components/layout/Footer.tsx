import { useEffect, useState } from 'react';
import { useApiStore } from '@/store/apiStore';
import { useThemeColors } from '@/store/themeStore';
import { secretStore } from '@/utils/secretStore';

export function Footer() {
  const { activeProvider, configs } = useApiStore();
  const currentConfig = configs[activeProvider];
  const themeColors = useThemeColors();

  // API Key 已迁移到 Keychain，需异步探测
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void secretStore.get(activeProvider).then((v) => {
      if (!cancelled) setHasKey(v !== null && v.length > 0);
    }).catch(() => { if (!cancelled) setHasKey(false); });
    return () => { cancelled = true; };
  }, [activeProvider, currentConfig]);

  return (
    <footer
      className="px-4 py-2 text-xs"
      style={{
        backgroundColor: themeColors?.surface,
        borderTop: `1px solid ${themeColors?.border}`,
        color: themeColors?.textSecondary,
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {hasKey ? '✅' : '⚠️'} 已连接 {activeProvider.toUpperCase()}
          </span>
          <span className="flex items-center gap-1">
            🔑 {hasKey ? 'API已配置' : 'API未配置'}
          </span>
          <span>{secretStore.getStatus(activeProvider) === 'keychain' ? '🔐 系统钥匙串' : '密钥存储状态请查看设置'}</span>
        </div>
        <div>
          <span>v2.1.7 | AI技术经理人</span>
        </div>
      </div>
    </footer>
  );
}
