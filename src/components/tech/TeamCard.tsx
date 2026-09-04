import { TeamMember } from '@/types';
import { useThemeColors } from '@/store/themeStore';

interface TeamCardProps {
  members: TeamMember[];
}

export function TeamCard({ members }: TeamCardProps) {
  const themeColors = useThemeColors();

  if (members.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      <h4
        className="font-semibold mb-4 flex items-center gap-2"
        style={{ color: themeColors?.text }}
      >
        <span>👥</span>
        <span>团队成员</span>
      </h4>
      <div className="grid grid-cols-2 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex gap-3 p-3 rounded-lg transition-colors"
            style={{
              backgroundColor: themeColors?.surfaceHover,
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg flex-shrink-0 font-medium"
              style={{
                backgroundColor: themeColors?.primaryLight,
                color: themeColors?.primary,
              }}
            >
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                member.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-medium truncate"
                style={{ color: themeColors?.text }}
              >
                {member.name}
              </div>
              <div
                className="text-sm truncate"
                style={{ color: themeColors?.textSecondary }}
              >
                {member.role}
              </div>
              {member.bio && (
                <div
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: themeColors?.textHint }}
                >
                  {member.bio}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
