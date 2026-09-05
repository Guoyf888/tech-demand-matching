/**
 * 版本号配置模块：统一管理系统版本，支持自动同步
 */
import { createContext, useContext, useState, ReactNode } from 'react';

// 版本信息类型
export interface VersionInfo {
  version: string; // 版本号（如v1.0.0）
  updateTime: string; // 更新时间
  description: string; // 更新说明
}

// 初始版本信息
const INIT_VERSION: VersionInfo = {
  version: 'v2.3.2',
  updateTime: '2026-09-05',
  description: '修复桌面密钥存储、备份冲突恢复并清理未使用命令权限'
};

// 全局版本配置Hook
export const useVersionConfig = () => {
  // 从本地存储加载版本信息（持久化）
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(() => {
    try {
      const saved = localStorage.getItem('systemVersion');
      if (!saved) return INIT_VERSION;

      const parsed = JSON.parse(saved) as VersionInfo;
      return parsed.version === INIT_VERSION.version
        ? { ...INIT_VERSION, ...parsed }
        : INIT_VERSION;
    } catch {
      return INIT_VERSION;
    }
  });

  // 更新版本信息（供设置页调用）
  const updateVersion = (newVersion: Partial<VersionInfo>) => {
    const updated = { ...versionInfo, ...newVersion };
    setVersionInfo(updated);
    localStorage.setItem('systemVersion', JSON.stringify(updated));
  };

  return {
    versionInfo,
    updateVersion
  };
};

// 版本配置上下文
export const VersionContext = createContext<{
  versionInfo: VersionInfo;
  updateVersion: (newVersion: Partial<VersionInfo>) => void;
}>({
  versionInfo: INIT_VERSION,
  updateVersion: () => {}
});

// 版本配置提供者
export const VersionProvider = ({ children }: { children: ReactNode }) => {
  const config = useVersionConfig();
  return (
    <VersionContext.Provider value={config}>
      {children}
    </VersionContext.Provider>
  );
};

// 便捷Hook：获取版本信息
export const useVersion = () => useContext(VersionContext);
