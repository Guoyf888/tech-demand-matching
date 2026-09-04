import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MessageItem } from './MessageItem';

describe('MessageItem', () => {
  it('escapes HTML from AI output before rendering markdown', () => {
    const markup = renderToStaticMarkup(
      <MessageItem
        message={{
          id: 'message-1',
          type: 'ai',
          content: '<img src=x onerror="alert(1)"> **安全内容**',
          timestamp: '2026-07-22T12:00:00.000Z',
        }}
      />
    );

    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;img');
    expect(markup).toContain('<strong>安全内容</strong>');
  });
});
