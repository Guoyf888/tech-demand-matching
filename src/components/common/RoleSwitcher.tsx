import { Role } from '@/store/roleStore';
import { themes, useThemeStore } from '@/store/themeStore';

const roleConfig = {
  demand: { label: '需求方', icon: '🏢', description: '企业技术需求' },
  tech: { label: '技术方', icon: '🎓', description: '高校/科研院所' },
  platform: { label: '平台方', icon: '🔧', description: '服务机构' },
};

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
}

export function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  return (
    <div className="flex gap-2">
      {(Object.keys(roleConfig) as Role[]).map((role) => (
        <button
          key={role}
          onClick={() => onRoleChange(role)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-95"
          style={{
            backgroundColor: currentRole === role ? themeColors?.primary : themeColors?.surfaceHover,
            color: currentRole === role ? '#fff' : themeColors?.textSecondary,
            boxShadow: currentRole === role ? '0 2px 8px rgba(22, 93, 255, 0.25)' : 'none',
          }}
        >
          <span className="mr-1">{roleConfig[role].icon}</span>
          {roleConfig[role].label}
        </button>
      ))}
    </div>
  );
}
