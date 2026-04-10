import { TechResult } from '@/types';
import { TeamCard } from './TeamCard';

interface TechDetailProps {
  result: TechResult;
}

export function TechDetail({ result }: TechDetailProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">{result.title}</h3>

      {result.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h4 className="font-semibold mb-3">📋 成果概要</h4>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {result.summary}
          </p>
        </div>
      )}

      <TeamCard members={result.teamMembers} />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h4 className="font-semibold mb-3">📄 详细内容</h4>
        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {result.content}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h4 className="font-semibold mb-3">🏷️ 技术标签</h4>
        <div className="flex flex-wrap gap-2">
          {result.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
