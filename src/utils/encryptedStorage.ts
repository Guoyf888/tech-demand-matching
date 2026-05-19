/**
 * 同步加密存储工具 - 使用 XOR + Base64 对敏感数据进行混淆后存入 localStorage
 * 注意：这是混淆而非密码学安全加密，但对于桌面应用环境已足够防护明文泄露
 */

const APP_KEY = 'com.techdemand.app-v1';

function xorEncode(input: string): string {
  const keyBytes = new TextEncoder().encode(APP_KEY);
  const inputBytes = new TextEncoder().encode(input);
  const output = new Uint8Array(inputBytes.length);

  for (let i = 0; i < inputBytes.length; i++) {
    output[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  // Encode as Base64 with a marker prefix to distinguish from plaintext
  return 'ENC:' + btoa(String.fromCharCode(...output));
}

function xorDecode(encoded: string): string {
  if (!encoded.startsWith('ENC:')) return ''; // Not encoded

  try {
    const raw = atob(encoded.slice(4));
    const keyBytes = new TextEncoder().encode(APP_KEY);
    const inputBytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    const output = new Uint8Array(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i++) {
      output[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(output);
  } catch {
    return '';
  }
}

export function encodeData(data: string): string {
  return xorEncode(data);
}

export function decodeData(encoded: string): string {
  return xorDecode(encoded);
}
