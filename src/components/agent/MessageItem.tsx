import { memo } from 'react';

interface UnifiedMessage {
  id: string;
  type: 'user' | 'ai' | 'hermes-plan' | 'hermes-result' | 'terminal' | 'system' | 'tech-result';
  content: string;
  timestamp: string;
}

interface MessageItemProps {
  message: UnifiedMessage;
  themeColors?: Record<string, string | undefined>;
}

export const MessageItem = memo(function MessageItem({ message, themeColors }: MessageItemProps) {
  const messageClass =
    message.type === 'user' ? 'user-message' :
    message.type === 'ai' ? 'ai-message' :
    message.type === 'hermes-plan' || message.type === 'hermes-result' ? 'hermes-message' :
    message.type === 'tech-result' ? 'tech-message' :
    message.type === 'system' ? 'system-message' :
    message.type === 'terminal' ? 'terminal-message' : 'ai-message';

  return (
    <div className={`message ${messageClass} animate-fade-in`}>
      <div className="text-sm whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
        {message.content}
      </div>
      <div
        className="text-xs mt-2"
        style={{ color: message.type === 'user' ? 'rgba(255,255,255,0.7)' : themeColors?.textSecondary }}
      >
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
});
