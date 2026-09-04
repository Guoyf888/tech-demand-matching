/**
 * 数据导入/导出 - 把 localStorage 中的业务数据打包为 JSON 备份
 *
 * 不导出 API Key（存于系统钥匙串，应在新设备上重新输入）。
 * 不导出 theme（外观偏好跟随系统/账号）。
 * 不导出 systemVersion（由 version_log.json 决定）。
 *
 * 支持跨设备迁移、版本回滚、调试数据复现。
 */

import { logger } from './logger';

const log = logger;

const SCHEMA_VERSION = 1;

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
      if (value !== undefined) data[key] = value;
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
   * 触发浏览器下载（Web 模式）；Tauri 桌面端走文件对话框
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
  importFromJSON(json: string, options: { merge?: boolean } = {}): ImportResult {
    const result: ImportResult = { success: true, restoredKeys: [], skippedKeys: [], errors: [] };
    let bundle: ExportBundle;
    try {
      bundle = JSON.parse(json) as ExportBundle;
    } catch (err) {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: [`JSON 解析失败: ${err instanceof Error ? err.message : String(err)}`] };
    }

    if (bundle.app !== 'tech-demand-matching') {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: ['备份文件不匹配（app 字段错误）'] };
    }
    if (typeof bundle.schema !== 'number' || bundle.schema > SCHEMA_VERSION) {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: [`不支持的备份版本: ${bundle.schema}`] };
    }
    if (!bundle.data || typeof bundle.data !== 'object') {
      return { success: false, restoredKeys: [], skippedKeys: [], errors: ['备份文件缺少 data 字段'] };
    }

    const merge = options.merge ?? true;
    for (const [key, value] of Object.entries(bundle.data)) {
      if (!(EXPORTED_KEYS as readonly string[]).includes(key)) {
        result.skippedKeys.push(key);
        continue;
      }
      try {
        if (merge) {
          // 数组类型合并去重
          const existing = safeRead(key);
          if (Array.isArray(value) && Array.isArray(existing)) {
            const seen = new Set(existing.map((item: { id?: string }) => item?.id).filter(Boolean));
            const merged = [...existing];
            for (const item of value) {
              const id = (item as { id?: string })?.id;
              if (id && !seen.has(id)) {
                merged.push(item);
                seen.add(id);
              }
            }
            safeWrite(key, merged);
          } else {
            safeWrite(key, value);
          }
        } else {
          safeWrite(key, value);
        }
        result.restoredKeys.push(key);
      } catch (err) {
        result.errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  },

  /**
   * 触发文件选择对话框（Tauri / Web 通用走 <input type="file">）
   */
  async pickAndImport(): Promise<ImportResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const text = await file.text();
          resolve(this.importFromJSON(text));
        } catch (err) {
          resolve({
            success: false,
            restoredKeys: [],
            skippedKeys: [],
            errors: [`读取文件失败: ${err instanceof Error ? err.message : String(err)}`],
          });
        }
      };
      input.click();
    });
  },
};
