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
 * 桌面写入失败明确报错，不静默降级；旧本地副本可读取，成功保存后清理。
 */

import { invoke } from '@tauri-apps/api/core';
import { encodeData, decodeData } from './encryptedStorage';

const SERVICE = 'tech-demand-matching';
const FALLBACK_PREFIX = 'ENC:';
export type SecretStorageStatus = 'unchecked' | 'keychain' | 'local' | 'unavailable';
const statuses = new Map<string, SecretStorageStatus>();

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
        localStorage.removeItem(`${SERVICE}:${provider}`);
        statuses.set(provider, 'keychain');
        return;
      } catch {
        statuses.set(provider, 'unavailable');
        throw new Error('系统密钥库保存失败，密钥未写入本地兼容存储。请检查系统凭据服务后重试。');
      }
    }
    localSave(provider, apiKey);
    statuses.set(provider, 'local');
  },

  async get(provider: string): Promise<string | null> {
    if (isTauriEnv()) {
      try {
        const v = await tauriGet(provider);
        if (v !== null) {
          statuses.set(provider, 'keychain');
          return v;
        }
        const legacy = localGet(provider);
        statuses.set(provider, legacy ? 'local' : 'keychain');
        return legacy;
      } catch {
        const legacy = localGet(provider);
        statuses.set(provider, legacy ? 'local' : 'unavailable');
        if (legacy) return legacy;
        throw new Error('系统密钥库读取失败，请检查系统凭据服务后重试。');
      }
    }
    statuses.set(provider, 'local');
    return localGet(provider);
  },

  async delete(provider: string): Promise<void> {
    if (isTauriEnv()) {
      try {
        await invoke('delete_secret', { provider });
      } catch {
        statuses.set(provider, 'unavailable');
        throw new Error('系统密钥库删除失败，原密钥仍保留，请重试。');
      }
    }
    localStorage.removeItem(`${SERVICE}:${provider}`);
    statuses.set(provider, isTauriEnv() ? 'keychain' : 'local');
  },

  getStatus(provider: string): SecretStorageStatus {
    return statuses.get(provider) || (isTauriEnv() ? 'unchecked' : 'local');
  },
};
