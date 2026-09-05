import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { secretStore } from './secretStore';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
const call = vi.mocked(invoke);
const localKey = 'tech-demand-matching:openai';

describe('secret storage boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    call.mockReset();
    Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} });
  });
  afterEach(() => { Reflect.deleteProperty(window, '__TAURI_INTERNALS__'); });

  it('rejects desktop save failure without silently writing a local secret', async () => {
    call.mockRejectedValue(new Error('sensitive backend detail'));
    await expect(secretStore.save('openai', 'test-secret')).rejects.toThrow('系统密钥库保存失败');
    expect(localStorage.getItem(localKey)).toBeNull();
    expect(secretStore.getStatus('openai')).toBe('unavailable');
  });

  it('removes the legacy copy after a successful desktop save', async () => {
    localStorage.setItem(localKey, 'old-secret');
    call.mockResolvedValue(undefined);
    await secretStore.save('openai', 'new-secret');
    expect(call).toHaveBeenCalledWith('save_secret', { provider: 'openai', apiKey: 'new-secret' });
    expect(localStorage.getItem(localKey)).toBeNull();
    expect(secretStore.getStatus('openai')).toBe('keychain');
  });

  it('deletes both copies so an old local secret cannot reappear', async () => {
    localStorage.setItem(localKey, 'old-secret');
    call.mockResolvedValue(null);
    await secretStore.delete('openai');
    expect(call).toHaveBeenCalledWith('delete_secret', { provider: 'openai' });
    expect(await secretStore.get('openai')).toBeNull();
    expect(localStorage.getItem(localKey)).toBeNull();
  });

  it('preserves the local copy if the OS delete fails', async () => {
    localStorage.setItem(localKey, 'old-secret');
    call.mockRejectedValue(new Error('locked'));
    await expect(secretStore.delete('openai')).rejects.toThrow('系统密钥库删除失败');
    expect(localStorage.getItem(localKey)).toBe('old-secret');
  });

  it('reports local compatibility when reading a legacy secret', async () => {
    localStorage.setItem(localKey, 'old-secret');
    call.mockRejectedValue(new Error('locked'));
    expect(await secretStore.get('openai')).toBe('old-secret');
    expect(secretStore.getStatus('openai')).toBe('local');
  });

  it('distinguishes unreadable keychain from an unconfigured keychain', async () => {
    call.mockRejectedValueOnce(new Error('locked')).mockResolvedValueOnce(null);
    await expect(secretStore.get('openai')).rejects.toThrow('系统密钥库读取失败');
    expect(secretStore.getStatus('openai')).toBe('unavailable');
    expect(await secretStore.get('openai')).toBeNull();
    expect(secretStore.getStatus('openai')).toBe('keychain');
  });

  it('keeps the explicitly labelled browser compatibility mode', async () => {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
    await secretStore.save('openai', 'browser-test');
    expect(localStorage.getItem(localKey)).not.toBe('browser-test');
    expect(await secretStore.get('openai')).toBe('browser-test');
    expect(secretStore.getStatus('openai')).toBe('local');
    await secretStore.delete('openai');
    expect(await secretStore.get('openai')).toBeNull();
    expect(call).not.toHaveBeenCalled();
  });
});
