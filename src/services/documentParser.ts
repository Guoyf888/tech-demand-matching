/**
 * 文档解析服务 - 支持 WORD (.docx) 和 PDF 文件
 */
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';

export interface ParsedDocument {
  text: string;
  fileName: string;
  fileType: 'docx' | 'pdf';
  pageCount?: number;
}

/**
 * 解析DOCX文件
 */
async function parseDocx(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析PDF文件
 */
async function parsePdf(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const pdfParse = new PDFParse({ data: arrayBuffer });
        const textResult = await pdfParse.getText();
        resolve(textResult.text);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 解析文档文件（自动检测格式）
 */
export async function parseDocument(file: File): Promise<ParsedDocument> {
  const fileName = file.name.toLowerCase();
  const isDocx = fileName.endsWith('.docx');
  const isPdf = fileName.endsWith('.pdf');

  if (!isDocx && !isPdf) {
    throw new Error('不支持的文件格式，请上传 .docx 或 .pdf 文件');
  }

  let text: string;

  if (isDocx) {
    text = await parseDocx(file);
  } else {
    text = await parsePdf(file);
  }

  // 清理文本：移除多余空白字符
  text = text.replace(/\s+/g, ' ').trim();

  if (text.length < 10) {
    throw new Error('文档内容过少，无法进行分析');
  }

  return {
    text,
    fileName: file.name,
    fileType: isDocx ? 'docx' : 'pdf',
  };
}

/**
 * 检测内容类型：技术需求 vs 技术成果
 */
export function detectContentType(text: string): 'demand' | 'result' | 'unknown' {
  const demandKeywords = [
    '需要', '需求', '开发', '想要', '希望', '寻找', '合作', '委托',
    '预算', '时间要求', '预期', '目标', '招标', '采购', '引进',
    '解决', '问题', '痛点', '挑战', '升级', '优化', '改进',
  ];

  const resultKeywords = [
    '成果', '技术', '方案', '产品', '发明', '专利', '论文',
    '研发', '完成', '实现', '突破', '创新', '领先', '优势',
    '获奖', '认证', '测试', '验证', '应用', '落地', '实施',
  ];

  const textLower = text.toLowerCase();
  let demandScore = 0;
  let resultScore = 0;

  demandKeywords.forEach(kw => {
    if (textLower.includes(kw)) demandScore++;
  });

  resultKeywords.forEach(kw => {
    if (textLower.includes(kw)) resultScore++;
  });

  if (demandScore > resultScore && demandScore >= 2) {
    return 'demand';
  }
  if (resultScore > demandScore && resultScore >= 2) {
    return 'result';
  }

  return 'unknown';
}

/**
 * 智能提取行业标签
 */
export function extractIndustryTags(text: string): string[] {
  const industryMap: Record<string, string[]> = {
    '人工智能': ['AI', '人工智能', '机器学习', '深度学习', '神经网络', 'NLP', '计算机视觉'],
    '新能源汽车': ['新能源', '电动汽车', '电池', '电机', '电控', '充电', '续航'],
    '医疗健康': ['医疗', '健康', '医药', '生物', '医院', '诊断', '康复', '养老'],
    '智能制造': ['制造', '工业', '工厂', '自动化', '机器人', '数控', 'MES'],
    '金融科技': ['金融', '银行', '保险', '风控', '支付', '区块链', '数字货币'],
    '智慧城市': ['城市', '交通', '安防', '楼宇', '园区', '社区', '智慧'],
    '农业科技': ['农业', '农村', '农机', '灌溉', '种子', '养殖', '农产品'],
    '教育科技': ['教育', '培训', '学习', '学校', '课程', '教学', '校园'],
    '物联网': ['物联网', 'IoT', '传感器', '网关', '智能家居', '可穿戴'],
    '云计算': ['云', '云计算', 'SaaS', 'PaaS', 'IaaS', '数据中心', '虚拟化'],
    '半导体': ['芯片', '半导体', '集成电路', 'IC', '封装', '制造工艺'],
    '新材料': ['材料', '纳米', '石墨烯', '复合材料', '高分子', '合金'],
  };

  const textLower = text.toLowerCase();
  const matchedIndustries: string[] = [];

  for (const [industry, keywords] of Object.entries(industryMap)) {
    const matchCount = keywords.filter(kw => textLower.includes(kw.toLowerCase())).length;
    if (matchCount >= 1) {
      matchedIndustries.push(industry);
    }
  }

  // 如果没有匹配，返回通用分类
  if (matchedIndustries.length === 0) {
    return ['其他'];
  }

  // 限制最多返回3个行业标签
  return matchedIndustries.slice(0, 3);
}

/**
 * 智能提取技术领域标签
 */
export function extractTechTags(text: string): string[] {
  const techFieldMap: Record<string, string[]> = {
    '算法': ['算法', '模型', '优化', '计算', '数据分析', '统计'],
    '软件': ['软件', '程序', '系统', '平台', 'APP', 'Web', '前端', '后端'],
    '硬件': ['硬件', '芯片', '电路', 'PCB', '嵌入式', '单片机'],
    '通信': ['通信', '5G', '网络', '协议', '传输', '信号'],
    '安全': ['安全', '加密', '隐私', '风控', '防火墙', '渗透'],
    '数据': ['数据', '大数据', '数据库', '存储', '处理', '挖掘'],
    '测试': ['测试', '验证', '仿真', '实验', '质检'],
    '工艺': ['工艺', '制造', '生产', '加工', '工艺参数'],
  };

  const textLower = text.toLowerCase();
  const matchedTechs: string[] = [];

  for (const [tech, keywords] of Object.entries(techFieldMap)) {
    const matchCount = keywords.filter(kw => textLower.includes(kw.toLowerCase())).length;
    if (matchCount >= 1) {
      matchedTechs.push(tech);
    }
  }

  return matchedTechs.slice(0, 3);
}