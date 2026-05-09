/**
 * 合并后的顶部导航组件：整合两行导航，去重+分类
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HeaderNav.css';

interface NavItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  isRole?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首页', icon: '🏠', path: '/' },
  { id: 'ai', label: 'AI对话', icon: '💬', path: '/ai' },
  { id: 'demand', label: '需求管理', icon: '📋', path: '/demands' },
  { id: 'achievement', label: '技术成果', icon: '💡', path: '/results' },
  { id: 'match', label: '智能匹配', icon: '🔗', path: '/matching' },
  { id: 'skill', label: '技能市场', icon: '🔧', path: '/skills' },
  { id: 'terminal', label: '终端', icon: '💻', path: '/terminal' },
];

const HeaderNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeNav, setActiveNav] = useState<string>(
    NAV_ITEMS.find(item => location.pathname.startsWith(item.path))?.id || 'home'
  );

  const handleNavClick = (item: NavItem) => {
    setActiveNav(item.id);
    navigate(item.path);
  };

  return (
    <div className="merged-header-nav">
      <div className="nav-group core-nav">
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="nav-divider"></div>

      <div className="nav-group right-nav">
        <div
          className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
          onClick={() => { setActiveNav('settings'); navigate('/settings'); }}
        >
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">设置</span>
        </div>
      </div>
    </div>
  );
};

export default HeaderNav;
