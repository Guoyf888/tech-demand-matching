import { useState, useEffect } from 'react';
import { SkillCard } from '@/components/skills/SkillCard';
import { getBuiltInSkills } from '@/services/skills/builtInSkills';
import { Skill } from '@/types';

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    setSkills(getBuiltInSkills());
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">技能市场</h2>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
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
