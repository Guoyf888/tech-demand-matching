import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { themes, useThemeStore, Theme } from '@/store/themeStore';

interface MenuItem {
  label: string;
  items: { label: string; action?: () => void; divider?: boolean }[];
}

export function TopMenu() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setShowThemePicker(false);
  };

  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const menus: MenuItem[] = [
    {
      label: '文件',
      items: [
        { label: '新建需求', action: () => {} },
        { label: '新建成果', action: () => {} },
        { divider: true, label: '' },
        { label: '导入文件', action: () => {} },
        { label: '导出数据', action: () => {} },
        { divider: true, label: '' },
        { label: '退出', action: () => window.close() },
      ],
    },
    {
      label: '编辑',
      items: [
        { label: '撤销', action: () => document.execCommand('undo') },
        { label: '重做', action: () => document.execCommand('redo') },
        { divider: true, label: '' },
        { label: '剪切', action: () => document.execCommand('cut') },
        { label: '复制', action: () => document.execCommand('copy') },
        { label: '粘贴', action: () => document.execCommand('paste') },
      ],
    },
    {
      label: '选择',
      items: [
        { label: '全选', action: () => document.execCommand('selectAll') },
      ],
    },
    {
      label: '查看',
      items: [
        { label: '重新加载', action: () => window.location.reload() },
        { label: '切换全屏', action: () => {} },
        { divider: true, label: '' },
        { label: '放大', action: () => {} },
        { label: '缩小', action: () => {} },
        { label: '重置缩放', action: () => {} },
      ],
    },
    {
      label: '设置',
      items: [
        { label: '偏好设置', action: () => {} },
        { divider: true, label: '' },
        { label: '主题颜色', action: () => setShowThemePicker(!showThemePicker) },
        { label: '关于', action: () => {} },
      ],
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <div
        className="flex items-center h-8 text-sm border-b"
        style={{
          backgroundColor: themeColors?.surface,
          borderColor: themeColors?.border,
          color: themeColors?.text,
        }}
      >
        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              className="px-3 h-8 hover:bg-opacity-50 transition-colors"
              style={{ backgroundColor: openMenu === menu.label ? themeColors?.surfaceHover : 'transparent' }}
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div
                className="absolute top-full left-0 min-w-48 py-1 rounded shadow-lg z-50"
                style={{
                  backgroundColor: themeColors?.surface,
                  border: `1px solid ${themeColors?.border}`,
                }}
              >
                {menu.items.map((item, idx) =>
                  item.divider ? (
                    <div
                      key={idx}
                      className="my-1 border-t"
                      style={{ borderColor: themeColors?.border }}
                    />
                  ) : (
                    <button
                      key={item.label}
                      className="w-full px-4 py-1.5 text-left hover:bg-opacity-50 transition-colors text-sm"
                      style={{
                        backgroundColor: 'transparent',
                        color: themeColors?.text,
                      }}
                      onClick={() => {
                        item.action?.();
                        setOpenMenu(null);
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = themeColors?.surfaceHover || '';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      {item.label}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}

        {/* 右侧 - 页面标题 */}
        <div className="flex-1 text-center text-xs" style={{ color: themeColors?.textSecondary }}>
          {location.pathname === '/' && '首页 - AI 对话'}
          {location.pathname === '/settings' && '设置'}
          {location.pathname === '/skills' && '技能市场'}
        </div>

        {/* 主题选择器 */}
        {showThemePicker && (
          <div className="absolute right-4 top-full mt-1 p-3 rounded-lg shadow-lg z-50 w-64"
            style={{
              backgroundColor: themeColors?.surface,
              border: `1px solid ${themeColors?.border}`,
            }}
          >
            <div className="text-xs font-medium mb-2" style={{ color: themeColors?.textSecondary }}>选择主题</div>
            <div className="grid grid-cols-2 gap-2">
              {(['volcano-white', 'star-black', 'tech-blue', 'berry-pink'] as const).map((t) => (
                <button
                  key={t}
                  className="flex items-center gap-2 p-2 rounded-lg transition-all"
                  style={{
                    backgroundColor: theme === t ? themeColors?.primaryHover : themeColors?.surfaceHover,
                    border: `2px solid ${theme === t ? themeColors?.primary : themeColors?.border}`,
                  }}
                  onClick={() => handleThemeChange(t)}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: themes[t].colors.primary }}
                  />
                  <span className="text-xs">{themes[t].name}</span>
                </button>
              ))}
            </div>
            <button
              className="w-full mt-2 p-2 rounded-lg text-xs transition-all"
              style={{
                backgroundColor: themeColors?.surfaceHover,
                border: `1px solid ${themeColors?.border}`,
              }}
              onClick={() => handleThemeChange('system')}
            >
              跟随系统
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
