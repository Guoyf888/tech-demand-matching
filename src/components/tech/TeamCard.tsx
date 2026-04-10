import { TeamMember } from '@/types';

interface TeamCardProps {
  members: TeamMember[];
}

export function TeamCard({ members }: TeamCardProps) {
  if (members.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h4 className="font-semibold mb-4">👥 团队成员</h4>
      <div className="grid grid-cols-2 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-lg">
              {member.avatar ? (
                <img src={member.avatar} alt={member.name} />
              ) : (
                member.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{member.name}</div>
              <div className="text-sm text-gray-500">{member.role}</div>
              <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                {member.bio}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
