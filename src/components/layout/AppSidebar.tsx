/**
 * 统一侧边栏导航组件 - 企业级腾讯/阿里风格
 * 特性：
 * - 专业SVG图标导航（Lucide React）
 * - 可折叠展开（64px ↔ 220px）
 * - 子菜单支持
 * - 当前页面高亮指示
 * - 主题切换
 */
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  FileText,
  Lightbulb,
  Handshake,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Bot,
  Cog,
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import './AppSidebar.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: '首页',
    icon: <Home size={20} strokeWidth={1.75} />,
    path: '/',
  },
  {
    id: 'demand',
    label: '需求管理',
    icon: <FileText size={20} strokeWidth={1.75} />,
    path: '/demands',
    children: [
      {
        id: 'demands-list',
        label: '我的需求',
        icon: <FileText size={16} strokeWidth={1.75} />,
        path: '/demands',
      },
      {
        id: 'reports',
        label: '分析报告',
        icon: <FileText size={16} strokeWidth={1.75} />,
        path: '/reports',
      },
    ],
  },
  {
    id: 'tech',
    label: '技术成果',
    icon: <Lightbulb size={20} strokeWidth={1.75} />,
    path: '/results',
    children: [
      {
        id: 'results-list',
        label: '我的成果',
        icon: <Lightbulb size={16} strokeWidth={1.75} />,
        path: '/results',
      },
      {
        id: 'team',
        label: '团队展示',
        icon: <Lightbulb size={16} strokeWidth={1.75} />,
        path: '/team',
      },
    ],
  },
  {
    id: 'match',
    label: '智能匹配',
    icon: <Handshake size={20} strokeWidth={1.75} />,
    path: '/matching',
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: <Cog size={20} strokeWidth={1.75} />,
    path: '/settings',
  },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['demand', 'tech']);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();

  const isDark = theme === 'star-black' || theme === 'tech-blue';

  // Sync sidebar width with CSS variable for main content
  useEffect(() => {
    const width = collapsed ? 64 : 220;
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, [collapsed]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.path);

    return (
      <div key={item.id} className="nav-item-wrapper">
        <button
          className={`nav-item ${active ? 'active' : ''} ${level > 0 ? 'nav-item-sub' : ''}`}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else {
              navigate(item.path);
            }
          }}
          style={level > 0 ? { paddingLeft: `${16 + level * 12}px` } : undefined}
          title={collapsed ? item.label : undefined}
        >
          <span className="nav-item-icon">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="nav-item-label">{item.label}</span>
              {hasChildren && (
                <ChevronDown
                  size={14}
                  className={`nav-item-arrow ${isExpanded ? 'expanded' : ''}`}
                />
              )}
            </>
          )}
          {active && !collapsed && <div className="active-indicator" />}
          {active && collapsed && <div className="active-indicator-collapsed" />}
        </button>

        {!collapsed && hasChildren && isExpanded && (
          <div className="nav-children">
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'volcano-white' : 'star-black');
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo区域 */}
      <div className="sidebar-logo">
        <div className="logo-icon-wrapper">
          <Bot size={22} className="logo-icon" />
        </div>
        {!collapsed && <span className="logo-text">技术对接平台</span>}
      </div>

      {/* 导航列表 */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </nav>

      {/* 底部工具栏 */}
      <div className="sidebar-footer">
        {/* 主题切换 */}
        <button
          className="nav-item"
          onClick={toggleTheme}
          title={collapsed ? (isDark ? '浅色模式' : '深色模式') : undefined}
        >
          <span className="nav-item-icon">
            {isDark ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
          </span>
          {!collapsed && (
            <span className="nav-item-label">{isDark ? '浅色模式' : '深色模式'}</span>
          )}
        </button>

        {/* 折叠按钮 */}
        <button
          className="nav-item collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <span className="nav-item-icon">
            {collapsed ? (
              <ChevronRight size={20} strokeWidth={1.75} />
            ) : (
              <ChevronLeft size={20} strokeWidth={1.75} />
            )}
          </span>
          {!collapsed && <span className="nav-item-label">收起</span>}
        </button>
      </div>
    </aside>
  );
}