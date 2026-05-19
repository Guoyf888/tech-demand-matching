import { memo, useMemo } from 'react';

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

/** 轻量 Markdown 渲染：粗体、行内代码、标题、列表、分割线、换行 */
function renderMarkdown(text: string): string {
  let html = text
    // 分割线
    .replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid var(--color-border,#d1d5db);margin:8px 0" />')
    // 标题 ### / ## / #
    .replace(/^### (.+)$/gm, '<h4 style="font-weight:600;margin:8px 0 4px;font-size:14px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-weight:600;margin:10px 0 4px;font-size:15px">$1</h3>')
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code style="background:var(--color-surface,#f3f4f6);padding:1px 4px;border-radius:3px;font-size:13px">$1</code>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<div style="padding-left:16px;position:relative"><span style="position:absolute;left:4px">•</span>$1</div>')
    // 有序列表
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:20px"><strong>$1.</strong> $2</div>')
    // 换行
    .replace(/\n/g, '<br/>');

  return html;
}

export const MessageItem = memo(function MessageItem({ message, themeColors }: MessageItemProps) {
  const messageClass =
    message.type === 'user' ? 'user-message' :
    message.type === 'ai' ? 'ai-message' :
    message.type === 'hermes-plan' || message.type === 'hermes-result' ? 'hermes-message' :
    message.type === 'tech-result' ? 'tech-message' :
    message.type === 'system' ? 'system-message' :
    message.type === 'terminal' ? 'terminal-message' : 'ai-message';

  const isMarkdown = message.type !== 'user' && message.type !== 'terminal';

  const htmlContent = useMemo(
    () => isMarkdown ? renderMarkdown(message.content) : null,
    [message.content, isMarkdown]
  );

  return (
    <div className={`message ${messageClass} animate-fade-in`}>
      {isMarkdown ? (
        <div
          className="text-sm"
          style={{ wordBreak: 'break-word', lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: htmlContent! }}
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
          {message.content}
        </div>
      )}
      <div
        className="text-xs mt-2"
        style={{ color: message.type === 'user' ? 'rgba(255,255,255,0.7)' : themeColors?.textSecondary }}
      >
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
});
