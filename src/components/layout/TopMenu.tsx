import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useThemeColors, useThemeIsDark, useThemeStore } from '@/store/themeStore';

// 顶部导航
export function TopMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const location = useLocation();

  const themeColors = useThemeColors();
  const isDark = useThemeIsDark();

  // 核心功能标签
  const coreTabs = [
    { key: '/', label: '首页', icon: '🏠' },
    { key: '/demands', label: '需求', icon: '📋' },
    { key: '/results', label: '成果', icon: '💡' },
    { key: '/matching', label: '匹配', icon: '🤝' },
    { key: '/skills', label: '技能', icon: '🛠️' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* 顶部导航栏 */}
      <header
        className="h-12 flex items-center px-4 flex-shrink-0"
        style={{
          backgroundColor: themeColors?.surface,
          borderBottom: `1px solid ${themeColors?.border}`,
        }}
      >
        {/* Logo区域 */}
        <div className="flex items-center gap-2 mr-6">
          <span className="text-xl">🤖</span>
          <span
            className="font-semibold text-base"
            style={{ color: themeColors?.text }}
          >
            技术对接
          </span>
        </div>

        {/* 核心标签 - 居中显示 */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {coreTabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.key}
              className="relative px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: 'transparent',
                color: isActive(tab.key)
                  ? themeColors?.primary
                  : themeColors?.textSecondary,
              }}
            >
              <span>{tab.label}</span>

              {/* 选中下划线指示器 */}
              {isActive(tab.key) && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: themeColors?.primary }}
                />
              )}

              {/* Hover效果 */}
              {!isActive(tab.key) && (
                <div
                  className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: themeColors?.surfaceHover }}
                />
              )}
            </Link>
          ))}
        </nav>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 刷新按钮 */}
          <button
            onClick={() => window.location.reload()}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{
              backgroundColor: themeColors?.surfaceHover,
              color: themeColors?.textSecondary,
            }}
            title="刷新页面"
          >
            🔄
          </button>

          {/* 主题切换 */}
          <button
            onClick={() => {
              const newTheme = isDark ? 'volcano-white' : 'star-black';
              useThemeStore.getState().setTheme(newTheme);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105"
            style={{
              backgroundColor: themeColors?.surfaceHover,
              color: themeColors?.textSecondary,
            }}
            title={isDark ? '切换浅色模式' : '切换深色模式'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* 更多菜单 */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-105"
              style={{
                backgroundColor: isMenuOpen
                  ? themeColors?.primaryLight
                  : themeColors?.surfaceHover,
                color: isMenuOpen
                  ? themeColors?.primary
                  : themeColors?.textSecondary,
              }}
              title="更多功能"
            >
              ☰
            </button>

            {/* 下拉菜单 */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-40 py-1 animate-scale-in"
                  style={{
                    backgroundColor: themeColors?.surface,
                    border: `1px solid ${themeColors?.border}`,
                  }}
                >
                  <Link
                    to="/ai"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor:
                        location.pathname === '/ai'
                          ? themeColors?.primaryLight
                          : 'transparent',
                      color:
                        location.pathname === '/ai'
                          ? themeColors?.primary
                          : themeColors?.text,
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>💬</span>
                    <span>AI对话</span>
                  </Link>

                  <Link
                    to="/terminal"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor:
                        location.pathname === '/terminal'
                          ? themeColors?.primaryLight
                          : 'transparent',
                      color:
                        location.pathname === '/terminal'
                          ? themeColors?.primary
                          : themeColors?.text,
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>⬛</span>
                    <span>终端</span>
                  </Link>

                  <Link
                    to="/drafts"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor:
                        location.pathname === '/drafts'
                          ? themeColors?.primaryLight
                          : 'transparent',
                      color:
                        location.pathname === '/drafts'
                          ? themeColors?.primary
                          : themeColors?.text,
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>📝</span>
                    <span>草稿箱</span>
                  </Link>

                  <div
                    style={{ borderTop: `1px solid ${themeColors?.border}` }}
                    className="my-1"
                  />

                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor:
                        location.pathname === '/settings'
                          ? themeColors?.primaryLight
                          : 'transparent',
                      color:
                        location.pathname === '/settings'
                          ? themeColors?.primary
                          : themeColors?.text,
                    }}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>⚙️</span>
                    <span>系统设置</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
