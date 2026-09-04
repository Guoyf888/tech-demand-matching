/**
 * 文档解析服务：支持 DOCX、PDF、XLSX、PPTX。
 * 解析结果会保留段落/表格结构，并尽量提取页面或文档中的图片，供确认界面预览。
 */

import { NATIONAL_ECONOMIC_INDUSTRIES } from '@/config/industries';
import type { ChatContentPart } from '@/services/api/types';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGES = 6;

const MAGIC_BYTES = {
  zip: [0x50, 0x4b, 0x03, 0x04],
  pdf: [0x25, 0x50, 0x44, 0x46],
} as const;

export type DocumentFileType = 'docx' | 'pdf' | 'xlsx' | 'pptx';

export interface ParsedDocumentImage {
  name: string;
  mimeType: string;
  dataUrl: string;
}

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: DocumentFileType;
  pageCount?: number;
  images?: ParsedDocumentImage[];
  warnings?: string[];
  entries?: DocumentEntry[];
}

/** A single demand or technical result identified inside an uploaded file. */
export interface DocumentEntry {
  id: string;
  title: string;
  content: string;
}

function validateFileSize(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），最大允许 20MB`);
  }
  if (file.size === 0) throw new Error('文件为空');
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsArrayBuffer(blob);
  });
}

async function readHeader(file: File): Promise<Uint8Array> {
  return new Uint8Array(await readBlobAsArrayBuffer(file.slice(0, 4)));
}

async function validateMagicBytes(file: File, type: 'zip' | 'pdf'): Promise<void> {
  const bytes = await readHeader(file);
  const expected = MAGIC_BYTES[type];
  if (expected.some((value, index) => bytes[index] !== value)) {
    throw new Error(type === 'pdf' ? '文件格式无效：不是有效的 .pdf 文件' : '文件格式无效：不是有效的 Office 文件');
  }
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim() || '未命名条目';
}

function normalizeEntryTitle(value: string, fallback: string): string {
  const title = value
    .replace(/^\s*(?:第?\d{1,3}\s*[、.．)）]|[一二三四五六七八九十]+\s*[、.．])\s*/, '')
    .replace(/^(?:成果|需求|项目|技术成果|技术需求)\s*(?:名称|标题)?\s*[：:]/, '')
    .trim();
  return (title || fallback).slice(0, 100);
}

function createDocumentEntry(index: number, title: string, content: string, fallback: string): DocumentEntry {
  return {
    id: `entry_${index + 1}`,
    title: normalizeEntryTitle(title, fallback),
    content: normalizeText(content).slice(0, 50000),
  };
}

function entriesFromTableRows(rows: string[][], fallbackTitle: string): DocumentEntry[] {
  const nonEmptyRows = rows
    .map((row) => row.map((cell) => normalizeText(cell)).filter(Boolean))
    .filter((row) => row.length >= 2);
  const headerIndex = nonEmptyRows.findIndex((row) => row.some((cell) => /序号|编号|序列/.test(cell)));
  if (headerIndex === -1) return [];

  const header = nonEmptyRows[headerIndex];
  const titleIndex = header.findIndex((cell) => /成果|需求|项目|名称|标题/.test(cell));
  const entries = nonEmptyRows.slice(headerIndex + 1)
    .filter((row) => /^\d{1,3}$/.test(row[0].replace(/[.、]/g, '')))
    .map((row, index) => {
      const titleCell = row[titleIndex >= 0 ? titleIndex : 1] || row[1] || fallbackTitle;
      const detailCells = row.filter((_, cellIndex) => cellIndex !== 0 && cellIndex !== (titleIndex >= 0 ? titleIndex : 1));
      return createDocumentEntry(index, titleCell, [titleCell, ...detailCells].join('\n'), fallbackTitle);
    })
    .filter((entry) => entry.content.length >= 2);
  return entries.length >= 2 ? entries : [];
}

function entriesFromNumberedHeadings(text: string, fallbackTitle: string): DocumentEntry[] {
  const lines = normalizeText(text).split('\n');
  const headingPattern = /^\s*(?:第?\d{1,3}\s*[、.．]|[一二三四五六七八九十]+\s*[、.．])\s*(.{2,100})$/;
  const entries: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(headingPattern);
    if (match) {
      if (current) entries.push(current);
      current = { title: match[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) entries.push(current);

  const normalized = entries
    .map((entry, index) => createDocumentEntry(index, entry.title, entry.lines.join('\n'), fallbackTitle))
    .filter((entry) => entry.content.length >= 8);
  return normalized.length >= 2 ? normalized : [];
}

function entriesFromSpreadsheetText(text: string, fallbackTitle: string): DocumentEntry[] {
  const rows = normalizeText(text)
    .split('\n')
    .filter((line) => line.includes('|'))
    .map((line) => line.split('|').map((cell) => cell.trim()));
  return entriesFromTableRows(rows, fallbackTitle);
}

async function extractDocxTableEntries(
  arrayBuffer: ArrayBuffer,
  mammoth: { convertToHtml: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> },
  fallbackTitle: string,
): Promise<DocumentEntry[]> {
  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const document = new DOMParser().parseFromString(htmlResult.value, 'text/html');
    const tableEntries = Array.from(document.querySelectorAll('table'))
      .flatMap((table) => Array.from(table.querySelectorAll('tr')).map((row) =>
        Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent || ''),
      ));
    return entriesFromTableRows(tableEntries, fallbackTitle);
  } catch {
    return [];
  }
}

/**
 * Split an uploaded document into independent, user-reviewable records. Structured
 * table rows take precedence over text patterns so nested numbered descriptions
 * such as "(1)" and "(2)" are kept within their parent record.
 */
export function splitDocumentEntries(document: ParsedDocument): DocumentEntry[] {
  const fallbackTitle = titleFromFileName(document.fileName);
  if (document.entries && document.entries.length >= 2) return document.entries;

  const spreadsheetEntries = entriesFromSpreadsheetText(document.text, fallbackTitle);
  if (spreadsheetEntries.length >= 2) return spreadsheetEntries;

  const numberedEntries = entriesFromNumberedHeadings(document.text, fallbackTitle);
  if (numberedEntries.length >= 2) return numberedEntries;

  return [createDocumentEntry(0, fallbackTitle, document.text, fallbackTitle)];
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function imageMimeType(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension === 'jpg' || extension === 'jpeg'
    ? 'image/jpeg'
    : extension === 'gif'
      ? 'image/gif'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/png';
}

async function extractZipImages(zip: any, prefix = ''): Promise<ParsedDocumentImage[]> {
  const images: ParsedDocumentImage[] = [];
  const entries = Object.keys(zip.files)
    .filter((name) => name.startsWith(prefix) && /\.(png|jpe?g|gif|webp)$/i.test(name))
    .slice(0, MAX_IMAGES);
  for (const name of entries) {
    const bytes = await zip.files[name].async('uint8array');
    images.push({ name: name.split('/').pop() || name, mimeType: imageMimeType(name), dataUrl: bytesToDataUrl(bytes, imageMimeType(name)) });
  }
  return images;
}

async function parseDocx(file: File): Promise<ParsedDocument> {
  await validateMagicBytes(file, 'zip');
  const arrayBuffer = await readBlobAsArrayBuffer(file);
  const mammoth = (await import('mammoth')).default;
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const result = await mammoth.extractRawText({ arrayBuffer });
  const images = await extractZipImages(zip, 'word/media/');
  const text = normalizeText(result.value);
  const entries = await extractDocxTableEntries(arrayBuffer, mammoth, titleFromFileName(file.name));
  return { text, fileName: file.name, fileType: 'docx', images, entries };
}

async function parsePdf(file: File): Promise<ParsedDocument> {
  await validateMagicBytes(file, 'pdf');
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: await readBlobAsArrayBuffer(file) });
  try {
    const textResult = await parser.getText();
    let images: ParsedDocumentImage[] = [];
    try {
      const screenshotResult = await parser.getScreenshot({ first: 4, desiredWidth: 1024, imageDataUrl: true, imageBuffer: false } as any);
      images = (screenshotResult.pages || []).slice(0, MAX_IMAGES).map((page: any, index: number) => ({
        name: `第${index + 1}页预览`,
        mimeType: 'image/png',
        dataUrl: page.dataUrl || page.imageDataUrl || '',
      })).filter((image: ParsedDocumentImage) => image.dataUrl);
    } catch {
      // PDF 渲染依赖在部分桌面环境不可用时，文字解析仍可继续。
    }
    return {
      text: normalizeText(textResult.text),
      fileName: file.name,
      fileType: 'pdf',
      pageCount: textResult.total,
      images,
      warnings: images.length === 0 ? ['PDF未生成页面预览，已保留文字提取结果。'] : undefined,
    };
  } finally {
    await parser.destroy();
  }
}

async function parseXlsx(file: File): Promise<ParsedDocument> {
  await validateMagicBytes(file, 'zip');
  const arrayBuffer = await readBlobAsArrayBuffer(file);
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();
  const sharedStringsXml = zip.file('xl/sharedStrings.xml') ? await zip.file('xl/sharedStrings.xml')!.async('text') : '';
  const sharedStrings = sharedStringsXml
    ? Array.from(parser.parseFromString(sharedStringsXml, 'application/xml').getElementsByTagName('si')).map((item) => Array.from(item.getElementsByTagName('t')).map((node) => node.textContent || '').join(''))
    : [];
  const workbookXml = zip.file('xl/workbook.xml') ? await zip.file('xl/workbook.xml')!.async('text') : '';
  const sheetNames = workbookXml
    ? Array.from(parser.parseFromString(workbookXml, 'application/xml').getElementsByTagName('sheet')).map((sheet) => sheet.getAttribute('name') || '未命名工作表')
    : [];
  const sheetPaths = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sections: string[] = [];
  for (const [index, path] of sheetPaths.entries()) {
    const xml = await zip.files[path].async('text');
    const sheet = parser.parseFromString(xml, 'application/xml');
    const lines = Array.from(sheet.getElementsByTagName('row')).map((row) => {
      const cells = Array.from(row.getElementsByTagName('c')).map((cell) => {
        const type = cell.getAttribute('t');
        const raw = cell.getElementsByTagName('v')[0]?.textContent || '';
        if (type === 's') return sharedStrings[Number(raw)] || '';
        if (type === 'inlineStr') return Array.from(cell.getElementsByTagName('t')).map((node) => node.textContent || '').join('');
        return raw;
      }).filter(Boolean);
      return cells.join(' | ');
    }).filter(Boolean);
    if (lines.length) sections.push(`【工作表：${sheetNames[index] || `工作表${index + 1}`}】\n${lines.join('\n')}`);
  }
  const text = normalizeText(sections.join('\n\n'));
  return {
    text,
    fileName: file.name,
    fileType: 'xlsx',
    pageCount: sheetPaths.length,
    images: await extractZipImages(zip, 'xl/media/'),
    entries: entriesFromSpreadsheetText(text, titleFromFileName(file.name)),
  };
}

async function parsePptx(file: File): Promise<ParsedDocument> {
  await validateMagicBytes(file, 'zip');
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(file));
  const parser = new DOMParser();
  const slideNames = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const sections = [] as string[];
  for (const [index, name] of slideNames.entries()) {
    const xml = await zip.files[name].async('text');
    const document = parser.parseFromString(xml, 'application/xml');
    const text = Array.from(document.getElementsByTagName('a:t')).map((node) => node.textContent || '').join(' ');
    if (text.trim()) sections.push(`【第${index + 1}页】\n${text}`);
  }
  return {
    text: normalizeText(sections.join('\n\n')),
    fileName: file.name,
    fileType: 'pptx',
    pageCount: slideNames.length,
    images: await extractZipImages(zip, 'ppt/media/'),
  };
}

export async function parseDocument(file: File): Promise<ParsedDocument> {
  validateFileSize(file);
  const fileName = file.name.toLowerCase();
  const fileType: DocumentFileType | undefined = fileName.endsWith('.docx')
    ? 'docx'
    : fileName.endsWith('.pdf')
      ? 'pdf'
      : fileName.endsWith('.xlsx')
        ? 'xlsx'
        : fileName.endsWith('.pptx')
          ? 'pptx'
          : undefined;
  if (!fileType) throw new Error('不支持的文件格式，请上传 DOCX、PDF、XLSX 或 PPTX 文件');

  const parsed = fileType === 'docx'
    ? await parseDocx(file)
    : fileType === 'pdf'
      ? await parsePdf(file)
      : fileType === 'xlsx'
        ? await parseXlsx(file)
        : await parsePptx(file);
  if (parsed.text.length < 10 && !(parsed.images?.length)) throw new Error('文档内容过少，无法进行分析');
  return parsed;
}

export function buildDocumentChatContent(text: string, document?: ParsedDocument | null): string | ChatContentPart[] {
  const images = (document?.images || [])
    .filter((image) => image.dataUrl.length <= 2_500_000)
    .slice(0, 4);
  if (images.length === 0) return text;
  return [
    { type: 'text', text: `${text}\n\n以下图片来自 ${document?.fileName}，请识别其中的图表、流程、标注和关键指标，并与提取文字交叉核验。` },
    ...images.map((image) => ({ type: 'image_url' as const, image_url: { url: image.dataUrl } })),
  ];
}

export function detectContentType(text: string): 'demand' | 'result' | 'unknown' {
  const demandKeywords = ['需要', '需求', '开发', '想要', '希望', '寻找', '合作', '委托', '预算', '时间要求', '预期', '目标', '招标', '采购', '引进', '解决', '问题', '痛点', '挑战', '升级', '优化', '改进'];
  const resultKeywords = ['成果', '技术', '方案', '产品', '发明', '专利', '论文', '研发', '完成', '实现', '突破', '创新', '领先', '优势', '获奖', '认证', '测试', '验证', '应用', '落地', '实施'];
  const textLower = text.toLowerCase();
  const demandScore = demandKeywords.filter((keyword) => textLower.includes(keyword)).length;
  const resultScore = resultKeywords.filter((keyword) => textLower.includes(keyword)).length;
  if (demandScore > resultScore && demandScore >= 2) return 'demand';
  if (resultScore > demandScore && resultScore >= 2) return 'result';
  return 'unknown';
}

export function extractIndustryTags(text: string): string[] {
  const textLower = text.toLowerCase();
  return NATIONAL_ECONOMIC_INDUSTRIES
    .map((industry) => ({ name: industry.name, score: industry.keywords.reduce((total, keyword) => total + (textLower.includes(keyword.toLowerCase()) ? 1 : 0), 0) }))
    .filter((industry) => industry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((industry) => industry.name);
}

export function extractTechTags(text: string): string[] {
  const techFieldMap: Record<string, string[]> = {
    算法: ['算法', '模型', '优化', '计算', '数据分析', '统计'], 软件: ['软件', '程序', '系统', '平台', 'APP', 'Web', '前端', '后端'], 硬件: ['硬件', '芯片', '电路', 'PCB', '嵌入式', '单片机'], 通信: ['通信', '5G', '网络', '协议', '传输', '信号'], 安全: ['安全', '加密', '隐私', '风控', '防火墙', '渗透'], 数据: ['数据', '大数据', '数据库', '存储', '处理', '挖掘'], 测试: ['测试', '验证', '仿真', '实验', '质检'], 工艺: ['工艺', '制造', '生产', '加工', '工艺参数'],
  };
  const textLower = text.toLowerCase();
  return Object.entries(techFieldMap)
    .filter(([, keywords]) => keywords.some((keyword) => textLower.includes(keyword.toLowerCase())))
    .map(([tech]) => tech)
    .slice(0, 3);
}
