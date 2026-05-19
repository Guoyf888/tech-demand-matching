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
  version: 'v1.9.0',
  updateTime: '2026-05-19',
  description: '全面查漏补缺：22项Bug修复与代码质量提升，新增ErrorBoundary、Markdown渲染、AbortSignal超时机制'
};

// 全局版本配置Hook
export const useVersionConfig = () => {
  // 从本地存储加载版本信息（持久化）
  const [versionInfo, setVersionInfo] = useState<VersionInfo>(() => {
    try {
      const saved = localStorage.getItem('systemVersion');
      return saved ? JSON.parse(saved) : INIT_VERSION;
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
