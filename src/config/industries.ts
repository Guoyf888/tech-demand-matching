export interface NationalEconomicIndustry {
  code: string;
  name: string;
  keywords: string[];
}

/** GB/T 4754-2017 国民经济行业分类的 20 个门类。 */
export const NATIONAL_ECONOMIC_INDUSTRIES: NationalEconomicIndustry[] = [
  { code: 'A', name: '农、林、牧、渔业', keywords: ['农业', '种植', '农作物', '农产品', '林业', '畜牧', '养殖', '渔业', '农机', '灌溉'] },
  { code: 'B', name: '采矿业', keywords: ['采矿', '矿山', '矿产', '煤矿', '油气开采', '选矿', '勘探'] },
  { code: 'C', name: '制造业', keywords: ['制造', '生产线', '工厂', '工业', '加工', '装配', '质量检测', '机器人', '数控', '电池', '汽车', '芯片', '材料'] },
  { code: 'D', name: '电力、热力、燃气及水生产和供应业', keywords: ['电力', '电网', '发电', '光伏', '风电', '储能', '供热', '燃气', '供水', '污水处理'] },
  { code: 'E', name: '建筑业', keywords: ['建筑', '施工', '工程建设', '土木', '装修', '装配式建筑', '工程承包'] },
  { code: 'F', name: '批发和零售业', keywords: ['批发', '零售', '商超', '电商', '门店', '商品流通', '供应链零售'] },
  { code: 'G', name: '交通运输、仓储和邮政业', keywords: ['交通运输', '物流', '仓储', '邮政', '快递', '港口', '铁路', '航空运输', '车队'] },
  { code: 'H', name: '住宿和餐饮业', keywords: ['酒店', '住宿', '民宿', '餐饮', '餐厅', '食品配送'] },
  { code: 'I', name: '信息传输、软件和信息技术服务业', keywords: ['软件', '信息技术', '人工智能', '机器学习', '大数据', '云计算', '互联网', '通信', '物联网', '网络安全', '数据平台'] },
  { code: 'J', name: '金融业', keywords: ['金融', '银行', '保险', '证券', '基金', '支付', '信贷', '风控', '投资'] },
  { code: 'K', name: '房地产业', keywords: ['房地产', '物业', '楼盘', '不动产', '房屋租售'] },
  { code: 'L', name: '租赁和商务服务业', keywords: ['租赁', '商务服务', '企业管理', '人力资源', '会展', '广告', '咨询服务'] },
  { code: 'M', name: '科学研究和技术服务业', keywords: ['科学研究', '科研院所', '研发服务', '技术服务', '成果转化', '检验检测', '计量', '知识产权', '实验室'] },
  { code: 'N', name: '水利、环境和公共设施管理业', keywords: ['水利', '生态环境', '环境治理', '固废', '垃圾处理', '园林绿化', '公共设施', '污染防治'] },
  { code: 'O', name: '居民服务、修理和其他服务业', keywords: ['居民服务', '家政', '维修', '修理', '美容', '洗染', '社区服务'] },
  { code: 'P', name: '教育', keywords: ['教育', '学校', '教学', '培训', '课程', '校园', '职业教育'] },
  { code: 'Q', name: '卫生和社会工作', keywords: ['医疗', '医院', '诊断', '医药', '健康', '康复', '养老', '社会工作', '护理'] },
  { code: 'R', name: '文化、体育和娱乐业', keywords: ['文化', '体育', '娱乐', '影视', '出版', '游戏', '旅游景区', '演艺', '博物馆'] },
  { code: 'S', name: '公共管理、社会保障和社会组织', keywords: ['政务', '政府', '公共管理', '社会保障', '社会组织', '公共安全', '应急管理'] },
  { code: 'T', name: '国际组织', keywords: ['国际组织', '联合国', '世界卫生组织', '国际机构'] },
];

const industryNameSet = new Set(NATIONAL_ECONOMIC_INDUSTRIES.map((industry) => industry.name));

export function isNationalEconomicIndustry(value: unknown): value is string {
  return typeof value === 'string' && industryNameSet.has(value);
}

export const NATIONAL_ECONOMIC_INDUSTRY_PROMPT = NATIONAL_ECONOMIC_INDUSTRIES
  .map((industry) => `${industry.code} ${industry.name}`)
  .join('；');
