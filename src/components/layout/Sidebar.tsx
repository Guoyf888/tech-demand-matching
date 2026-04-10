import { Role } from '@/store/roleStore';

const menuItems: Record<Role, { label: string; icon: string; path: string }[]> = {
  demand: [
    { label: '技术需求输入', icon: '📝', path: '/' },
    { label: '我的需求', icon: '📋', path: '/demands' },
    { label: '分析报告', icon: '📊', path: '/reports' },
  ],
  tech: [
    { label: '上传成果', icon: '📤', path: '/' },
    { label: '我的成果', icon: '📚', path: '/results' },
    { label: '团队展示', icon: '👥', path: '/team' },
  ],
  platform: [
    { label: '需求广场', icon: '🏢', path: '/demand-square' },
    { label: '技术广场', icon: '🎓', path: '/tech-square' },
    { label: '智能匹配', icon: '🔗', path: '/matching' },
    { label: '合作管理', icon: '🤝', path: '/cooperations' },
  ],
};

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

export function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  const currentRole = useRoleStore((s) => s.currentRole);
  const items = menuItems[currentRole];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700">
      <nav className="p-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label}>
              <button
                onClick={() => onMenuChange(item.label)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                  activeMenu === item.label
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
