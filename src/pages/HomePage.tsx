import { useState } from 'react';
import { useRoleStore } from '@/store/roleStore';
import { AIAgentChat } from '@/components/agent/AIAgentChat';
import { themes, useThemeStore } from '@/store/themeStore';

export function HomePage() {
  const { currentRole } = useRoleStore();
  const { theme } = useThemeStore();
  const [showChat, setShowChat] = useState(true);

  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const getRoleDescription = () => {
    switch (currentRole) {
      case 'demand':
        return {
          title: '需求方工作台',
          icon: '🏢',
          description: '输入技术需求，获得AI分析、创新建议和技术研发路线',
          actions: [
            { label: '输入技术需求', path: '/', icon: '📝' },
            { label: '查看我的需求', path: '/demands', icon: '📋' },
            { label: '查看分析报告', path: '/reports', icon: '📊' },
          ],
        };
      case 'tech':
        return {
          title: '技术方工作台',
          icon: '🎓',
          description: '上传技术成果，AI提炼通俗易懂的成果展示',
          actions: [
            { label: '上传技术成果', path: '/', icon: '📤' },
            { label: '查看我的成果', path: '/results', icon: '📚' },
            { label: '团队展示', path: '/team', icon: '👥' },
          ],
        };
      case 'platform':
        return {
          title: '平台方工作台',
          icon: '🔧',
          description: '促成需求方与技术方合作，智能匹配对接',
          actions: [
            { label: '需求广场', path: '/demand-square', icon: '🏢' },
            { label: '技术广场', path: '/tech-square', icon: '🎓' },
            { label: '智能匹配', path: '/matching', icon: '🔗' },
            { label: '合作管理', path: '/cooperations', icon: '🤝' },
          ],
        };
    }
  };

  const roleInfo = getRoleDescription();

  return (
    <div className="flex h-full gap-6">
      {/* 左侧 - 工作台入口 */}
      <div className="w-80 flex flex-col gap-4">
        {/* 角色卡片 */}
        <div
          className="p-6 rounded-xl"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{roleInfo.icon}</span>
            <div>
              <h2 className="text-lg font-bold" style={{ color: themeColors?.text }}>
                {roleInfo.title}
              </h2>
              <p className="text-sm" style={{ color: themeColors?.textSecondary }}>
                {roleInfo.description}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {roleInfo.actions.map((action) => (
              <a
                key={action.label}
                href={action.path}
                className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                style={{ backgroundColor: themeColors?.surfaceHover }}
              >
                <span>{action.icon}</span>
                <span style={{ color: themeColors?.text }}>{action.label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* 快捷功能 */}
        <div
          className="p-4 rounded-xl flex-1"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <h3 className="font-medium mb-3" style={{ color: themeColors?.text }}>
            快捷功能
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <a href="/settings" className="flex flex-col items-center p-3 rounded-lg" style={{ backgroundColor: themeColors?.surfaceHover }}>
              <span className="text-xl mb-1">⚙️</span>
              <span className="text-xs" style={{ color: themeColors?.text }}>设置</span>
            </a>
            <a href="/skills" className="flex flex-col items-center p-3 rounded-lg" style={{ backgroundColor: themeColors?.surfaceHover }}>
              <span className="text-xl mb-1">🔌</span>
              <span className="text-xs" style={{ color: themeColors?.text }}>技能</span>
            </a>
          </div>
        </div>
      </div>

      {/* 右侧 - AI 对话 */}
      <div className="flex-1">
        <AIAgentChat />
      </div>
    </div>
  );
}
