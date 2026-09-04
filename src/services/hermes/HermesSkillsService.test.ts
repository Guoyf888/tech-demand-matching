import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from './HermesSkillsService';

describe('Hermes v0.19 skill frontmatter', () => {
  it('parses a BOM-prefixed document with nested Hermes metadata', () => {
    const source = `\uFEFF---\r
name: llm-wiki\r
description: "Search a local knowledge base: safely"\r
version: 1.2.0\r
platforms: [linux, windows]\r
environments: [docker, kanban]\r
metadata:\r
  hermes:\r
    tags: [research, knowledge-base]\r
    related_skills: [research-paper-writing]\r
    config:\r
      - key: wiki.path\r
        description: Local wiki directory\r
        default: "~/wiki"\r
        prompt: Wiki path\r
---\r
\r
# LLM Wiki\r
\r
Use the configured knowledge base.\r
`;

    const parsed = parseFrontmatter(source);

    expect(parsed.metadata).toMatchObject({
      name: 'llm-wiki',
      description: 'Search a local knowledge base: safely',
      version: '1.2.0',
      platforms: ['linux', 'windows'],
      environments: ['docker', 'kanban'],
      metadata: {
        hermes: {
          tags: ['research', 'knowledge-base'],
          related_skills: ['research-paper-writing'],
          config: [
            {
              key: 'wiki.path',
              description: 'Local wiki directory',
              default: '~/wiki',
              prompt: 'Wiki path',
            },
          ],
        },
      },
    });
    expect(parsed.content).toBe('# LLM Wiki\r\n\r\nUse the configured knowledge base.');
  });

  it('leaves markdown without frontmatter untouched', () => {
    const source = '# Plain skill\n\nNo metadata here.';

    expect(parseFrontmatter(source)).toEqual({
      metadata: { name: '', description: '' },
      content: source,
    });
  });
});
