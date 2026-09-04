/**
 * logger 工具 - 统一日志入口
 *
 * 生产环境 (import.meta.env.PROD) 默认不输出任何日志，
 * 仅在显式通过 VITE_ENABLE_LOG=true 开启时输出。
 * 开发环境输出全部日志。
 */

const isProd = import.meta.env.PROD;
const logEnabled = isProd && import.meta.env.VITE_ENABLE_LOG === 'true';

function fmt(tag: string, args: unknown[]): unknown[] {
  return [`[${tag}]`, ...args];
}

export const logger = {
  log(tag: string, ...args: unknown[]) {
    if (!isProd || logEnabled) console.log(...fmt(tag, args));
  },
  info(tag: string, ...args: unknown[]) {
    if (!isProd || logEnabled) console.info(...fmt(tag, args));
  },
  warn(tag: string, ...args: unknown[]) {
    if (!isProd || logEnabled) console.warn(...fmt(tag, args));
  },
  error(tag: string, ...args: unknown[]) {
    // error 始终输出，便于线上排障；可在此接入 sentry / logrocket
    console.error(...fmt(tag, args));
  },
};
