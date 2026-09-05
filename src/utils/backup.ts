/**
 * 数据导入/导出 - 把 localStorage 中的业务数据打包为 JSON 备份
 *
 * 不导出独立密钥存储，并清洗模型配置中的密钥字段；业务文档原文保留。
 * 不导出 theme（外观偏好跟随系统/账号）。
 * 不导出 systemVersion（由 version_log.json 决定）。
 *
 * 支持跨设备迁移、版本回滚、调试数据复现。
 */

import { logger } from './logger';
import { isMatchProject } from '@/services/storage/matchProjectStorage';

const log = logger;

const SCHEMA_VERSION = 1;
const BUSINESS_LIST_KEYS = ['demands', 'tech_results', 'skills', 'hermes-skills', 'match_runs', 'match_reviews', 'match_projects'];

const EXPORTED_KEYS = [
  'demands',            // 需求列表
  'tech_results',       // 成果列表
  'chat-storage',       // 草稿/聊天记录
  'modelConfigs',       // 模型配置（baseUrl/modelId，不含 apiKey）
  'api-config-storage', // Provider 元数据（不含 apiKey）
  'techResult_draft',   // 成果草稿
  'skills',             // 当前技能列表
  'hermes-skills',      // 历史导入技能兼容键
  'hermes-session-memory-v1', // Hermes 会话记忆
  'match_runs',         // 匹配运行审计记录
  'match_reviews',      // 匹配人工复核记录
  'match_projects',     // 已认可匹配的对接项目
] as const;

export interface ExportBundle {
  schema: number;
  exportedAt: string;
  app: 'tech-demand-matching';
  data: Record<string, unknown>;
}

export interface ImportResult {
  success: boolean;
  restoredKeys: string[];
  skippedKeys: string[];
  errors: string[];
  added?: number;
  updated?: number;
  retained?: number;
}

// 仅清洗配置记录中的密钥字段，业务文档内容保持原样。
function withoutConfigSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutConfigSecrets);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/^(api[_-]?key|access[_-]?token|secret)$/i.test(key))
    .map(([key, nested]) => [key, withoutConfigSecrets(nested)]));
}

function cleanValue(key: string, value: unknown): unknown {
  return key === 'modelConfigs' || key === 'api-config-storage' ? withoutConfigSecrets(value) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function updateTime(value: unknown): number {
  if (!isRecord(value) || typeof value.updatedAt !== 'string') return 0;
  const time = Date.parse(value.updatedAt);
  return Number.isFinite(time) ? time : 0;
}

function safeRead(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw);
  } catch (err) {
    log.warn('backup', `parse ${key} failed`, err);
    return undefined;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    log.error('backup', `write ${key} failed`, err);
    throw err;
  }
}

export const backup = {
  /**
   * 导出当前数据快照
   */
  export(): ExportBundle {
    const data: Record<string, unknown> = {};
    for (const key of EXPORTED_KEYS) {
      const value = safeRead(key);
      if (value !== undefined) data[key] = cleanValue(key, value);
    }
    return {
      schema: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      app: 'tech-demand-matching',
      data,
    };
  },

  /**
   * 导出到 JSON 字符串（用于下载文件或粘贴）
   */
  toJSON(): string {
    return JSON.stringify(this.export(), null, 2);
  },

  /**
   * 通过下载链接导出（Web / 桌面 WebView）
   */
  download(filename = `tech-demand-backup-${new Date().toISOString().slice(0, 10)}.json`): void {
    const blob = new Blob([this.toJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * 从 JSON 字符串恢复数据
   */
  importFromJSON(json: string, options: { merge?: boolean; dryRun?: boolean } = {}): ImportResult {
    const result: ImportResult = { success: true, restoredKeys: [], skippedKeys: [], errors: [], added: 0, updated: 0, retained: 0 };
    let bundle: ExportBundle;
    try {
      bundle = JSON.parse(json) as ExportBundle;
    } catch (err) {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: [`JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`] };
    }

    if (!isRecord(bundle) || bundle.app !== 'tech-demand-matching') {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: ['备份文件不匹配（app 字段错误）'] };
    }
    if (!Number.isInteger(bundle.schema) || bundle.schema < 1 || bundle.schema > SCHEMA_VERSION) {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: [`不支持的备份版本: ${bundle.schema}`] };
    }
    if (!isRecord(bundle.data)) {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: ['备份文件缺少 data 字段'] };
    }

    const merge = options.merge ?? true;
    const writes: Array<[string, unknown]> = [];
    for (const [key, value] of Object.entries(bundle.data)) {
      if (!(EXPORTED_KEYS as readonly string[]).includes(key)) {
        result.skippedKeys.push(key);
        continue;
      }
      try {
        if (BUSINESS_LIST_KEYS.includes(key)) {
          if (!Array.isArray(value) || !value.every((item) => isRecord(item) && typeof item.id === 'string' && item.id.length > 0)) {
            throw new Error('列表记录必须包含有效 id');
          }
          if (key === 'match_projects' && !value.every(isMatchProject)) throw new Error('对接项目字段不完整');
        }
        if (merge) {
          // 数组类型合并去重
          const existing = safeRead(key);
          if (BUSINESS_LIST_KEYS.includes(key) && Array.isArray(value) && Array.isArray(existing)) {
            const positions = new Map(existing.map((item: { id?: string }, index) => [item?.id, index]));
            const merged = [...existing];
            for (const item of value) {
              const id = (item as { id?: string })?.id;
              if (id && !positions.has(id)) {
                positions.set(id, merged.length);
                merged.push(item);
                result.added! += 1;
              } else if (id) {
                const position = positions.get(id)!;
                if (updateTime(item) > updateTime(merged[position])) {
                  merged[position] = item;
                  result.updated! += 1;
                } else {
                  result.retained! += 1;
                }
              }
            }
            writes.push([key, cleanValue(key, merged)]);
          } else {
            writes.push([key, cleanValue(key, value)]);
            if (Array.isArray(value)) result.added! += value.length;
          }
        } else {
          writes.push([key, cleanValue(key, value)]);
        }
      } catch (err) {
        result.errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 先验证整个文件；预览和真实导入共用同一合并规则。
    if (result.errors.length === 0) {
      for (const [key, value] of writes) {
        try {
          if (!options.dryRun) safeWrite(key, value);
          result.restoredKeys.push(key);
        } catch {
          result.errors.push(`${key}: 写入失败（可能存储空间不足），部分数据可能已恢复`);
          break;
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
  },

  /**
   * 触发文件选择对话框（Tauri / Web 通用走 <input type="file">）
   */
  async pickFile(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.oncancel = () => resolve(null);
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const text = await file.text();
          resolve(text);
        } catch (err) {
          reject(new Error(`读取文件失败: ${err instanceof Error ? err.message : String(err)}`));
        }
      };
      input.click();
    });
  },
};
