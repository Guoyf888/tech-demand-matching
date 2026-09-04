import { ApiConfigPanel } from '@/components/settings/ApiConfigPanel';
import { ThemeSwitchPanel, ResetSettingsButton } from '@/components/settings/ThemeSwitchPanel';
import { DataBackupPanel } from '@/components/settings/DataBackupPanel';
import AboutSettings from '@/components/settings/AboutSettings';
import { useThemeColors } from '@/store/themeStore';
import {
  DatabaseBackup,
  KeyRound,
  Palette,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import type { ReactNode } from 'react';
import './SettingsPage.css';

interface SettingsSectionProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

function SettingsSection({ icon, title, children }: SettingsSectionProps) {
  const themeColors = useThemeColors();

  return (
    <section
      className="settings-section"
      style={{
        backgroundColor: themeColors.surface,
        border: `1px solid ${themeColors.border}`,
      }}
    >
      <h3 className="settings-section-title" style={{ color: themeColors.text }}>
        <span
          className="settings-section-icon"
          style={{ color: themeColors.primary, backgroundColor: themeColors.primaryLight }}
        >
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const themeColors = useThemeColors();

  return (
    <div
      className="settings-page max-w-4xl mx-auto animate-scale-in overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      <header className="settings-page-header">
        <span
          className="settings-page-icon"
          style={{ color: themeColors.primary, backgroundColor: themeColors.primaryLight }}
        >
          <Settings2 size={20} aria-hidden="true" />
        </span>
        <h2 style={{ color: themeColors.text }}>系统设置</h2>
      </header>

      <SettingsSection icon={<Palette size={18} aria-hidden="true" />} title="主题外观">
        <ThemeSwitchPanel />
      </SettingsSection>

      <SettingsSection icon={<KeyRound size={18} aria-hidden="true" />} title="大模型 API 配置">
        <ApiConfigPanel />
      </SettingsSection>

      <SettingsSection icon={<SlidersHorizontal size={18} aria-hidden="true" />} title="高级设置">
        <ResetSettingsButton />
      </SettingsSection>

      <SettingsSection icon={<DatabaseBackup size={18} aria-hidden="true" />} title="数据备份与恢复">
        <DataBackupPanel />
      </SettingsSection>

      <AboutSettings />
    </div>
  );
}
