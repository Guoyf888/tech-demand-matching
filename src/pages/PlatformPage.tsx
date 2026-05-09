import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { MatchPanel } from '@/components/platform/MatchPanel';
import { themes, useThemeStore } from '@/store/themeStore';

export function PlatformPage() {
  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="flex flex-col h-full gap-4">
      <Breadcrumb />
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
  );
}
