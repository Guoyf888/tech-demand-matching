import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApiStore } from '@/store/apiStore';
import { secretStore } from '@/utils/secretStore';
import { ApiConfigPanel } from './ApiConfigPanel';

vi.mock('@/store/themeStore', () => ({ useThemeColors: () => ({}) }));
vi.mock('@/services/api/gateway', () => ({ apiGateway: { chat: vi.fn() } }));
vi.mock('@/utils/secretStore', () => ({ secretStore: { get: vi.fn(), save: vi.fn(), getStatus: () => 'keychain' } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('API configuration save feedback', () => {
  let container: HTMLDivElement;
  let root: Root;
  const previous = { baseUrl: 'https://example.test/v1', modelId: 'previous-model' };
  beforeEach(async () => {
    vi.mocked(secretStore.get).mockResolvedValue('fixture-key');
    vi.mocked(secretStore.save).mockReset();
    useApiStore.setState({ activeProvider: 'openai', configs: { ...useApiStore.getState().configs, openai: previous } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<ApiConfigPanel />));
    const input = container.querySelector<HTMLInputElement>('#provider-model-id')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'edited-model');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });
  const save = async () => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === '保存配置');
    expect(button).toBeDefined();
    await act(async () => { button!.click(); });
  };

  it('does not change provider metadata or show saved when credential storage fails', async () => {
    vi.mocked(secretStore.save).mockRejectedValue(new Error('系统密钥库保存失败'));
    await save();
    expect(container.textContent).toContain('系统密钥库保存失败');
    expect(useApiStore.getState().configs.openai).toEqual(previous);
    expect(container.textContent).not.toContain('✓ 已保存');
  });

  it('commits metadata and retains saved feedback after successful credential storage', async () => {
    vi.mocked(secretStore.save).mockResolvedValue(undefined);
    await save();
    expect(secretStore.save).toHaveBeenCalledWith('openai', 'fixture-key');
    expect(useApiStore.getState().configs.openai?.modelId).toBe('edited-model');
    expect(container.textContent).toContain('✓ 已保存');
  });
});
