import { Link } from 'react-router-dom';
import { Role, useRoleStore } from '@/store/roleStore';
import { useThemeColors } from '@/store/themeStore';

const menuItems: Record<Role, { label: string; icon: string; path: string }[]> = {
  demand: [
    { label: 'AI对话', icon: '💬', path: '/' },
    { label: '输入需求', icon: '📝', path: '/' },
    { label: '我的需求', icon: '📋', path: '/demands' },
    { label: '分析报告', icon: '📊', path: '/reports' },
  ],
  tech: [
    { label: 'AI对话', icon: '💬', path: '/' },
    { label: '上传成果', icon: '📤', path: '/' },
    { label: '我的成果', icon: '📚', path: '/results' },
    { label: '团队展示', icon: '👥', path: '/team' },
  ],
  platform: [
    { label: 'AI对话', icon: '💬', path: '/' },
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

  const themeColors = useThemeColors();

  return (
    <aside
      className="w-56 rounded-xl overflow-hidden"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      <nav className="p-3">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.label}>
              <Link
                to={item.path}
                onClick={() => onMenuChange(item.label)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                style={{
                  backgroundColor: activeMenu === item.label ? themeColors?.primary + '20' : 'transparent',
                  color: activeMenu === item.label ? themeColors?.primary : themeColors?.text,
                }}
              >
                <span>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
