import { Role } from '@/store/roleStore';

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
  return (
    <div className="flex gap-2">
      {(Object.keys(roleConfig) as Role[]).map((role) => (
        <button
          key={role}
          onClick={() => onRoleChange(role)}
          className={`px-4 py-2 rounded-lg transition-all ${
            currentRole === role
              ? 'bg-primary-600 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          <span className="mr-2">{roleConfig[role].icon}</span>
          {roleConfig[role].label}
        </button>
      ))}
    </div>
  );
}
