import { Skill } from '@/types';
import { skillStore } from '@/services/skills/skillStore';

interface SkillCardProps {
  skill: Skill;
  onUpdate: () => void;
}

export function SkillCard({ skill, onUpdate }: SkillCardProps) {
  const handleToggle = () => {
    skillStore.toggleEnabled(skill.id);
    onUpdate();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{skill.icon}</span>
          <div>
            <h4 className="font-medium">{skill.name}</h4>
            <p className="text-sm text-gray-500">{skill.description}</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`px-3 py-1 rounded-full text-sm ${
            skill.enabled
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {skill.enabled ? '已启用' : '已禁用'}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>v{skill.version}</span>
        <span>使用 {skill.metadata.usageCount} 次</span>
        <span>成功率 {skill.metadata.successRate}%</span>
      </div>
    </div>
  );
}
