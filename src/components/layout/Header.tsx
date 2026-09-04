import { Link } from 'react-router-dom';
import { RoleSwitcher } from '@/components/common/RoleSwitcher';
import { useRoleStore } from '@/store/roleStore';
import { useThemeColors } from '@/store/themeStore';

export function Header() {
  const { currentRole, setRole } = useRoleStore();

  const themeColors = useThemeColors();

  return (
    <header
      className="shadow-sm"
      style={{
        backgroundColor: themeColors?.surface,
        borderBottom: `1px solid ${themeColors?.border}`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-xl font-bold flex items-center gap-2 transition-all hover:scale-105"
            style={{ color: themeColors?.primary, textDecoration: 'none' }}
          >
            <span>🏠</span>
            <span style={{ color: themeColors?.text }}>技术需求对接</span>
          </Link>
          <RoleSwitcher currentRole={currentRole} onRoleChange={setRole} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="header-nav-item"
            style={{ textDecoration: 'none' }}
            title="设置"
          >
            <span style={{ fontSize: '18px' }}>⚙️</span>
            <span className="ml-1">设置</span>
          </Link>
          <Link
            to="/skills"
            className="header-nav-item"
            style={{ textDecoration: 'none' }}
            title="技能市场"
          >
            <span style={{ fontSize: '18px' }}>🔌</span>
            <span className="ml-1">技能</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
