/**
 * 密钥安全存储 - 优先走系统 Keychain，浏览器环境降级到 XOR 混淆
 *
 * Tauri 桌面环境：
 *   - Windows: DPAPI（Credential Manager）
 *   - macOS:   Keychain
 *   - Linux:   Secret Service
 *
 * 浏览器开发环境（npm run dev 而非 tauri dev）：
 *   - 降级到 localStorage + XOR 混淆（仅作开发体验用，仍非密码学安全）
 *
 * API Key 不再明文/不通过自定义算法保存，而是由操作系统加密落盘。
 */

import { invoke } from '@tauri-apps/api/core';
import { encodeData, decodeData } from './encryptedStorage';

const SERVICE = 'tech-demand-matching';
const FALLBACK_PREFIX = 'ENC:';

function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function tauriSave(provider: string, apiKey: string): Promise<void> {
  if (apiKey === '') {
    await invoke('delete_secret', { provider });
    return;
  }
  await invoke('save_secret', { provider, apiKey });
}

async function tauriGet(provider: string): Promise<string | null> {
  const value = await invoke<string | null>('get_secret', { provider });
  return value ?? null;
}

function localSave(provider: string, apiKey: string): void {
  if (apiKey === '') {
    localStorage.removeItem(`${SERVICE}:${provider}`);
    return;
  }
  localStorage.setItem(`${SERVICE}:${provider}`, encodeData(apiKey));
}

function localGet(provider: string): string | null {
  const raw = localStorage.getItem(`${SERVICE}:${provider}`);
  if (!raw) return null;
  if (raw.startsWith(FALLBACK_PREFIX)) return decodeData(raw) || null;
  // 兼容明文旧数据
  return raw;
}

export const secretStore = {
  async save(provider: string, apiKey: string): Promise<void> {
    if (isTauriEnv()) {
      try {
        await tauriSave(provider, apiKey);
        return;
      } catch (err) {
        // Keychain 不可用时降级到 localStorage，避免阻塞用户
        console.warn('[secretStore] keychain 写入失败，降级到 localStorage:', err);
      }
    }
    localSave(provider, apiKey);
  },

  async get(provider: string): Promise<string | null> {
    if (isTauriEnv()) {
      try {
        const v = await tauriGet(provider);
        if (v !== null) return v;
      } catch (err) {
        console.warn('[secretStore] keychain 读取失败，降级到 localStorage:', err);
      }
    }
    return localGet(provider);
  },

  async delete(provider: string): Promise<void> {
    if (isTauriEnv()) {
      try {
        await invoke('delete_secret', { provider });
        return;
      } catch { /* ignore */ }
    }
    localStorage.removeItem(`${SERVICE}:${provider}`);
  },

  isUsingKeychain(): boolean {
    return isTauriEnv();
  },
};
