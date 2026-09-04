import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { decodeSkillText, importSkillsFromZip } from './skillManager';

const ascii = (value: string) => Array.from(new TextEncoder().encode(value));

describe('skill package encoding', () => {
  it('decodes GB18030 content without corrupting Chinese text', () => {
    const bytes = Uint8Array.from([
      ...ascii('name: '),
      0xb2, 0xe2, 0xca, 0xd4,
    ]);

    expect(decodeSkillText(bytes)).toBe('name: 测试');
  });

  it('imports a GB18030 encoded SKILL.md from a zip package', async () => {
    const bytes = Uint8Array.from([
      ...ascii('---\nname: '),
      0xb2, 0xe2, 0xca, 0xd4,
      ...ascii('\ndescription: '),
      0xbc, 0xbc, 0xc4, 0xdc,
      ...ascii('\nversion: 1.0.0\n---\n\nRun this skill.'),
    ]);
    const zip = new JSZip();
    zip.file('SKILL.md', bytes);

    const packageBytes = await zip.generateAsync({ type: 'arraybuffer' });
    const result = await importSkillsFromZip(packageBytes);

    expect(result.failed).toEqual([]);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].name).toBe('测试');
    expect(result.imported[0].description).toBe('技能');
  });
});
