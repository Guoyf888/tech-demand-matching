import { useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { themes, useThemeStore } from '@/store/themeStore';

export function DraftBoxPage() {
  const { drafts, deleteDraft } = useChatStore();

  const [selectedType, setSelectedType] = useState<'all' | 'demand' | 'tech' | 'platform'>('all');

  const currentTheme = useThemeStore.getState().getEffectiveTheme();
  const themeColors = themes[currentTheme as keyof typeof themes]?.colors;

  const filteredDrafts = selectedType === 'all'
    ? drafts
    : drafts.filter((d) => d.type === selectedType);

  const getTypeLabel = (type: 'demand' | 'tech' | 'platform') => {
    switch (type) {
      case 'demand': return '需求方';
      case 'tech': return '技术方';
      case 'platform': return '平台方';
    }
  };

  const getTypeColor = (type: 'demand' | 'tech' | 'platform') => {
    switch (type) {
      case 'demand': return themeColors?.primary || '#00B42A';
      case 'tech': return themeColors?.success || '#52C41A';
      case 'platform': return themeColors?.accent || '#FF7D00';
    }
  };

  return (
    <div
      className="max-w-4xl mx-auto animate-scale-in overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-xl font-bold"
          style={{ color: themeColors?.text }}
        >
          草稿箱
        </h2>
        <div className="flex gap-2">
          {(['all', 'demand', 'tech', 'platform'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className="skill-tag text-xs"
              style={{
                backgroundColor: selectedType === type
                  ? themeColors?.primary
                  : themeColors?.primaryLight,
                color: selectedType === type
                  ? '#fff'
                  : themeColors?.primary,
              }}
            >
              {type === 'all' ? '全部' : getTypeLabel(type as any)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredDrafts.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            backgroundColor: themeColors?.surface,
            border: `1px solid ${themeColors?.border}`,
          }}
        >
          <div className="text-5xl mb-4">📝</div>
          <div
            className="text-lg font-medium mb-2"
            style={{ color: themeColors?.text }}
          >
            暂无草稿
          </div>
          <div
            className="text-sm"
            style={{ color: themeColors?.textHint }}
          >
            在AI对话中点击"存草稿"可以将对话保存到此处
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredDrafts.map((draft) => (
            <div
              key={draft.id}
              className="card flex flex-col gap-3 transition-all hover-card"
            >
              <div className="flex items-start justify-between">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: getTypeColor(draft.type),
                    color: '#fff',
                  }}
                >
                  {getTypeLabel(draft.type)}
                </span>
                <button
                  onClick={() => deleteDraft(draft.id)}
                  className="px-2 py-1 rounded text-xs transition-all hover:scale-95"
                  style={{
                    backgroundColor: themeColors?.error + '15',
                    color: themeColors?.error,
                  }}
                >
                  删除
                </button>
              </div>
              <h3
                className="font-medium"
                style={{ color: themeColors?.text }}
              >
                {draft.title}
              </h3>
              <p
                className="text-sm line-clamp-3"
                style={{ color: themeColors?.textSecondary }}
              >
                {draft.content.slice(0, 150)}...
              </p>
              <div
                className="flex items-center gap-2 text-xs mt-auto pt-2"
                style={{
                  color: themeColors?.textHint,
                  borderTop: `1px solid ${themeColors?.border}`,
                }}
              >
                <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>{draft.messages.length} 条消息</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
