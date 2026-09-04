/**
 * 安全日期工具 - 处理 undefined / null / 无效字符串
 *
 * 用于从 localStorage 等不可信源恢复的字段，
 * 避免 `new Date(undefined).getTime()` 返回 NaN 引发排序未定义行为。
 */

const FALLBACK = 0;

export function safeDate(value: string | number | Date | null | undefined): number {
  if (value == null) return FALLBACK;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : FALLBACK;
}

/**
 * 按时间倒序比较器（最新在前）
 */
export function byCreatedAtDesc<T extends { createdAt?: string | number | Date }>(a: T, b: T): number {
  return safeDate(b.createdAt) - safeDate(a.createdAt);
}

export function byUpdatedAtDesc<T extends { updatedAt?: string | number | Date }>(a: T, b: T): number {
  return safeDate(b.updatedAt) - safeDate(a.updatedAt);
}
