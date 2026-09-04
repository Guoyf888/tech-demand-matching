import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompanyResearchReport } from './CompanyResearchReport';

describe('CompanyResearchReport credibility labels', () => {
  it('labels mock research as demo data', () => {
    const html = renderToStaticMarkup(
      <CompanyResearchReport
        research={{
          companyName: '示例企业',
          success: true,
          provider: 'mock',
          isMock: true,
          news: [],
          industryNews: [],
        }}
      />,
    );

    expect(html).toContain('演示数据');
    expect(html).toContain('不能作为企业尽调结论');
  });

  it('shows a failed research state instead of an empty report', () => {
    const html = renderToStaticMarkup(
      <CompanyResearchReport
        research={{
          companyName: '待调查企业',
          success: false,
          error: '联网检索失败',
          provider: 'tavily',
          news: [],
          industryNews: [],
        }}
      />,
    );

    expect(html).toContain('调查未完成');
    expect(html).toContain('联网检索失败');
  });
});
