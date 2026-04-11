import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MatchPanel } from '@/components/platform/MatchPanel';
import { themes, useThemeStore } from '@/store/themeStore';

export function PlatformPage() {
  const [activeMenu, setActiveMenu] = useState('智能匹配');
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="flex flex-col h-full gap-4">
      <Breadcrumb />
      <div className="flex flex-1 overflow-hidden gap-4">
        <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />
        <div
          className="flex-1 rounded-xl p-6 overflow-y-auto"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <MatchPanel />
        </div>
      </div>
    </div>
  );
}
