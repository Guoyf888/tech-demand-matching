import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parseDocument, splitDocumentEntries } from './documentParser';

describe('documentParser office formats', () => {
  it('extracts sheet names and cells from XLSX files', async () => {
    const zip = new JSZip();
    zip.file('xl/workbook.xml', '<workbook><sheets><sheet name="需求清单" sheetId="1"/></sheets></workbook>');
    zip.file('xl/sharedStrings.xml', '<sst><si><t>项目名称</t></si><si><t>智能质检平台</t></si><si><t>目标</t></si><si><t>降低缺陷漏检率</t></si></sst>');
    zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="s"><v>3</v></c></row></sheetData></worksheet>');
    const data = await zip.generateAsync({ type: 'uint8array' });

    const parsed = await parseDocument(new File([data], '需求.xlsx'));

    expect(parsed.fileType).toBe('xlsx');
    expect(parsed.text).toContain('工作表：需求清单');
    expect(parsed.text).toContain('智能质检平台');
  });

  it('extracts slide text from PPTX files', async () => {
    const zip = new JSZip();
    zip.file('ppt/slides/slide1.xml', '<p:sld xmlns:p="p" xmlns:a="a"><a:t>高性能储能材料成果</a:t><a:t>已完成中试验证</a:t></p:sld>');
    const data = await zip.generateAsync({ type: 'uint8array' });

    const parsed = await parseDocument(new File([data], '成果.pptx'));

    expect(parsed.fileType).toBe('pptx');
    expect(parsed.pageCount).toBe(1);
    expect(parsed.text).toContain('已完成中试验证');
  });

  it('splits a paginated table with repeated headers into independent records', () => {
    const header = '序号 | 行业/应用场景分类 | 成果名称 | 关键词 | 成果简介 | 所在团队';
    const rows = Array.from({ length: 13 }, (_, index) => {
      const number = index + 1;
      return `${number} | 关键元器件 | 技术成果${number} | 关键词${number} | 成果简介${number} | 研发团队${number}`;
    });
    const text = [header, ...rows.slice(0, 4), header, ...rows.slice(4, 8), header, ...rows.slice(8)].join('\n');

    const entries = splitDocumentEntries({
      text,
      fileName: '机械学院-科技成果推介--关键元器件.docx',
      fileType: 'docx',
    });

    expect(entries).toHaveLength(13);
    expect(entries[0].title).toBe('技术成果1');
    expect(entries[12].title).toBe('技术成果13');
    expect(entries[12].content).toContain('成果简介13');
  });
});
