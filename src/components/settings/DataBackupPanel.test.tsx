import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backup } from '@/utils/backup';
import { DataBackupPanel } from './DataBackupPanel';

vi.mock('@/store/themeStore', () => ({ useThemeColors: () => ({}) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('backup confirmation workflow', () => {
  let container: HTMLDivElement;
  let root: Root;
  const click = async (label: string) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
    expect(button).toBeDefined();
    await act(async () => { button!.click(); });
  };
  beforeEach(async () => {
    localStorage.clear();
    container = document.createElement('div');
    root = createRoot(container);
    vi.spyOn(backup, 'pickFile').mockResolvedValue(JSON.stringify({ schema: 1, app: 'tech-demand-matching', data: { demands: [{ id: 'fixture' }] } }));
    await act(async () => root.render(<DataBackupPanel />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    vi.restoreAllMocks();
  });

  it('does not write until explicit confirmation', async () => {
    await click('导入备份');
    expect(container.textContent).toContain('导入预览（尚未写入）');
    expect(localStorage.getItem('demands')).toBeNull();
    await click('确认合并恢复');
    expect(JSON.parse(localStorage.getItem('demands')!)).toEqual([{ id: 'fixture' }]);
    expect(container.textContent).toContain('恢复了 1 项数据');
  });

  it('cancels without changing business data', async () => {
    await click('导入备份');
    await click('取消导入');
    expect(container.textContent).not.toContain('导入预览');
    expect(localStorage.getItem('demands')).toBeNull();
  });

  it('releases the loading state when file selection is cancelled', async () => {
    vi.mocked(backup.pickFile).mockResolvedValue(null);
    await click('导入备份');
    expect(container.textContent).not.toContain('导入中');
    expect(container.textContent).not.toContain('导入预览');
  });
});
