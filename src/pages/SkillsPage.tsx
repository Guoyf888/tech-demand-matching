import { useState, useEffect } from 'react';
import { SkillCard } from '@/components/skills/SkillCard';
import { getBuiltInSkills } from '@/services/skills/builtInSkills';
import { Skill } from '@/types';
import { themes, useThemeStore } from '@/store/themeStore';

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const { theme } = useThemeStore();
  const currentTheme = theme === 'system' ? 'volcano-white' : theme;
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  useEffect(() => {
    setSkills(getBuiltInSkills());
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold" style={{ color: themeColors?.text }}>技能市场</h2>
        <button
          className="px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: themeColors?.primary, color: '#fff' }}
        >
          浏览更多
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onUpdate={() => setSkills([...skills])}
          />
        ))}
      </div>
    </div>
  );
}
