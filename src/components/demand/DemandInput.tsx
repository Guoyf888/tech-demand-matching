import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { demandStorage } from '@/services/storage/demandStorage';
import { Demand } from '@/types';
import { apiGateway } from '@/services/api/gateway';
import { useThemeColors } from '@/store/themeStore';
import { buildDocumentChatContent, parseDocument, detectContentType, extractIndustryTags, extractTechTags, type ParsedDocument } from '@/services/documentParser';
import { DocumentReviewModal, type DocumentReviewValue } from '@/components/common/DocumentReviewModal';
import { AlertTriangle, CheckCircle2, Upload, FileCheck, Save, Sparkles } from 'lucide-react';
import {
  NATIONAL_ECONOMIC_INDUSTRY_PROMPT,
  isNationalEconomicIndustry,
} from '@/config/industries';
import { scientificSkillService } from '@/services/skills/scientificSkills';
import '@/components/tech/TechUpload.css';

interface DemandInputProps {
  onDemandCreated: (demand: Demand) => void;
  draftToResume?: { title: string; content: string } | null;
  onDraftResumed?: () => void;
}

/**
 * 解析JSON字符串，处理可能存在的markdown包装或其他格式问题
 */
function parseJSONSafely(jsonString: string): Record<string, unknown> | null {
  let cleaned = jsonString.trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      cleaned = cleaned.replace(/'/g, '"');
      cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function validateAPIResponse(data: unknown): { valid: boolean; content?: string; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'API响应格式错误：响应不是有效的JSON对象' };
  }

  const response = data as Record<string, unknown>;

  if (!Array.isArray(response.choices) || response.choices.length === 0) {
    const errorObj = response.error as Record<string, unknown> | undefined;
    const errorMsg = (errorObj?.message as string) || (errorObj?.type as string) || JSON.stringify(response.error).slice(0, 100);
    return { valid: false, error: errorMsg ? `API错误: ${errorMsg}` : 'API响应格式错误：缺少choices字段或为空' };
  }

  const choice = response.choices[0] as Record<string, unknown>;

  if (!choice.message || typeof choice.message !== 'object') {
    return { valid: false, error: 'API响应格式错误：缺少message字段' };
  }

  const message = choice.message as Record<string, unknown>;

  if (typeof message.content !== 'string') {
    return { valid: false, error: 'API响应格式错误：message.content不是字符串' };
  }

  if (!message.content.trim()) {
    return { valid: false, error: 'API返回的内容为空' };
  }

  return { valid: true, content: message.content };
}

export function DemandInput({ onDemandCreated, draftToResume, onDraftResumed }: DemandInputProps) {
  const [title, setTitle] = useState(draftToResume?.title || '');
  const [content, setContent] = useState(draftToResume?.content || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 结构化标签
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [selectedTimeline, setSelectedTimeline] = useState<string>('');
  const [selectedCooperation, setSelectedCooperation] = useState<string>('');

  // 文档上传状态
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<ParsedDocument | null>(null);
  const [documentContext, setDocumentContext] = useState<ParsedDocument | null>(null);
  const [apiStatus, setApiStatus] = useState({ valid: false, message: 'AI智能分析初始化中...' });

  // 稳定的草稿ID，避免每次autoSave创建新草稿
  const draftId = useMemo(() => `draft_${Date.now()}`, []);

  const themeColors = useThemeColors();

  useEffect(() => {
    let active = true;
    void apiGateway.validateConfig().then((validation) => {
      if (!active) return;
      setApiStatus({
        valid: validation.valid,
        message: validation.valid ? 'AI智能分析已就绪' : (validation.error || 'AI智能分析暂不可用'),
      });
    });
    return () => { active = false; };
  }, []);

  // 当draftToResume变化时，回填数据
  useEffect(() => {
    if (draftToResume) {
      setTitle(draftToResume.title);
      setContent(draftToResume.content);
      if (onDraftResumed) {
        onDraftResumed();
      }
    }
  }, [draftToResume, onDraftResumed]);

  // 自动保存草稿
  const autoSaveDraft = useCallback(() => {
    if (!title.trim() && !content.trim()) return;

    const draft: Demand = {
      id: draftId,
      title: title.trim() || '未命名需求',
      content: content.trim(),
      tags: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    demandStorage.save(draft);
    setLastSaved(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
  }, [title, content, draftId]);

  // 监听内容变化，触发自动保存
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveDraft();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, autoSaveDraft]);

  // 手动保存草稿
  const handleSaveDraft = () => {
    if (!title.trim() && !content.trim()) {
      setError('请先填写需求标题或详情');
      return;
    }

    setIsSavingDraft(true);
    autoSaveDraft();

    setTimeout(() => {
      setIsSavingDraft(false);
      setLastSaved(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    }, 500);
  };

  const addExecutionLog = (message: string) => {
    setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString('zh-CN')}] ${message}`]);
  };

  // 文档上传处理
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['.docx', '.pdf', '.xlsx', '.pptx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      setError(`不支持的文件格式，仅支持 ${validTypes.join(', ')}`);
      return;
    }

    setDocumentLoading(true);
    setError(null);

    try {
      const parsed = await parseDocument(file);
      setPendingDocument({ ...parsed, text: parsed.text.slice(0, 50000) });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '解析失败';
      setError(`文档解析失败: ${errorMsg}`);
      setDocumentFile(null);
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleDocumentConfirm = ({ entries, document }: DocumentReviewValue) => {
    const contentType = detectContentType(document.text);
    const industries = extractIndustryTags(document.text);
    const techs = extractTechTags(document.text);
    setDocumentFile(new File([], document.fileName, { type: 'application/octet-stream' }));

    if (entries.length > 1) {
      const createdAt = new Date().toISOString();
      const drafts = entries.map((entry) => ({
        id: demandStorage.generateId(),
        title: entry.title.trim().slice(0, 50),
        content: entry.content.trim().slice(0, 2000),
        tags: Array.from(new Set([
          ...extractIndustryTags(`${entry.title}\n${entry.content}`),
          ...extractTechTags(`${entry.title}\n${entry.content}`),
        ])).slice(0, 6),
        status: 'draft' as const,
        createdAt,
        updatedAt: createdAt,
      } satisfies Demand));
      drafts.forEach((draft) => {
        demandStorage.save(draft);
        onDemandCreated(draft);
      });
      setTitle('');
      setContent('');
      setDocumentContext(null);
      setError(null);
      addExecutionLog(`已从 ${document.fileName} 创建 ${drafts.length} 项独立需求草稿`);
      setPendingDocument(null);
      return;
    }

    const [entry] = entries;
    setDocumentContext(document);
    setTitle(entry.title.slice(0, 50));
    setContent(entry.content.slice(0, 2000));
    addExecutionLog(`📄 文档已确认: ${document.fileName}`);
    addExecutionLog(`类型: ${contentType === 'demand' ? '技术需求' : contentType === 'result' ? '技术成果' : '待定'}`);
    addExecutionLog(`行业标签: ${industries.join(', ') || '未识别'}`);
    addExecutionLog(`技术领域: ${techs.join(', ') || '未识别'}`);
    addExecutionLog(`已提取 ${document.images?.length || 0} 张图片，内容可继续编辑后提交`);
    setPendingDocument(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError('请填写完整的标题和需求详情');
      return;
    }

    setError(null);
    setExecutionLog([]);

    // 构建结构化内容
    let structuredContent = content.trim();
    const metaLines: string[] = [];
    if (selectedBudget) metaLines.push(`预算范围：${selectedBudget}`);
    if (selectedTimeline) metaLines.push(`时间要求：${selectedTimeline}`);
    if (selectedCooperation) metaLines.push(`合作方式：${selectedCooperation}`);
    if (metaLines.length > 0) {
      structuredContent = `[${metaLines.join('；')}]\n${structuredContent}`;
    }

    const demand: Demand = {
      id: demandStorage.generateId(),
      title: title.trim(),
      content: structuredContent,
      tags: [],
      status: 'analyzing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    demandStorage.save(demand);
    onDemandCreated(demand);

    // 开始AI分析
    if (await apiGateway.isConfigured()) {
      setIsAnalyzing(true);

      try {
        addExecutionLog('开始分析需求...');

        // 步骤1: 理解需求
        addExecutionLog('正在理解需求内容...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // 步骤2: 选择技能
        addExecutionLog('正在选择合适的分析技能...');
        await new Promise(resolve => setTimeout(resolve, 500));

        // 步骤3: 执行分析
        addExecutionLog('正在执行深度分析...');
        const scientificContext = scientificSkillService.buildContext(
          `${title}\n${content}`,
          'demand',
        );
        if (scientificContext.skills.length > 0) {
          addExecutionLog(`已启用科研技能: ${scientificContext.skills.map((skill) => skill.name).join(', ')}`);
        }
        const response = await apiGateway.chat({
          messages: [
            {
              role: 'system',
              content: `你是一个专业AI技术经理人。请分析以下技术需求：
1. 从以下国民经济行业门类中选择最匹配的一项作为 industry：${NATIONAL_ECONOMIC_INDUSTRY_PROMPT}
2. 提取技术关键词和标签（最多4个，不要重复 industry）
3. 分析需求的核心技术方向
4. 给出简短的技术研发建议

分析时区分事实、推断与待验证假设，并参考以下科学技能方法论：
${scientificContext.rendered}

请直接返回JSON格式（不要使用markdown代码块），格式如下：
{"industry": "制造业", "tags": ["标签1", "标签2"], "industryAnalysis": "行业分析...", "techRoadmap": "技术路线...", "suggestions": "创新建议..."}`,
            },
            { role: 'user', content: buildDocumentChatContent(`需求标题：${title}\n\n需求详情：${content}`, documentContext) },
          ],
        });

        addExecutionLog('正在处理分析结果...');

        const data = await response.json();
        const validation = validateAPIResponse(data);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const analysis = parseJSONSafely(validation.content!);
        if (!analysis) {
          throw new Error('AI返回的内容无法解析为JSON格式，请检查API响应或稍后重试');
        }

        // 步骤4: 生成报告
        addExecutionLog('正在生成分析报告...');
        await new Promise(resolve => setTimeout(resolve, 300));

        const inferredIndustries = extractIndustryTags(`${title}\n${content}`);
        const selectedIndustry = isNationalEconomicIndustry(analysis.industry)
          ? [analysis.industry]
          : inferredIndustries;
        const aiTags = Array.isArray(analysis.tags)
          ? analysis.tags.filter((tag): tag is string => typeof tag === 'string')
          : [];
        demand.tags = Array.from(new Set([
          ...selectedIndustry,
          ...aiTags,
          ...extractTechTags(`${title}\n${content}`),
        ])).slice(0, 6);
        demand.analysis = {
          enterpriseInfo: '基于您输入的需求分析',
          industryAnalysis: typeof analysis.industryAnalysis === 'string' ? analysis.industryAnalysis : '暂无行业分析',
          techRoadmap: typeof analysis.techRoadmap === 'string' ? analysis.techRoadmap : '暂无技术路线',
          suggestions: typeof analysis.suggestions === 'string' ? analysis.suggestions : '暂无建议',
          skills: scientificContext.skills.map((skill) => skill.name),
        };
        demand.status = 'completed';
        demand.updatedAt = new Date().toISOString();
        demandStorage.save(demand);
        onDemandCreated(demand);

        addExecutionLog('分析完成！');

        // 清除日志
        setTimeout(() => setExecutionLog([]), 3000);

      } catch (error: unknown) {
        console.error('分析失败:', error);

        let friendlyError = '分析失败，请稍后重试';
        const errorMsg = error instanceof Error ? error.message : String(error || '');

        if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('网络连接失败')) {
          friendlyError = '网络连接失败，请检查您的网络是否正常，或API地址是否可访问';
        } else if (errorMsg.includes('API错误') || errorMsg.includes('API响应')) {
          friendlyError = errorMsg;
        } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('密钥无效')) {
          friendlyError = 'API密钥无效或已过期，请检查设置中的API Key配置';
        } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('访问被拒绝')) {
          friendlyError = 'API访问被拒绝，请检查API Key是否有权限';
        } else if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('频率超限')) {
          friendlyError = 'API请求频率超限，请稍后重试';
        } else if (errorMsg.includes('500') || errorMsg.includes('Internal Server Error') || errorMsg.includes('服务器错误')) {
          friendlyError = 'API服务器内部错误，请稍后重试';
        } else if (errorMsg.includes('超时') || errorMsg.includes('timeout')) {
          friendlyError = 'API请求超时，请检查网络状况后重试';
        } else if (errorMsg.includes('JSON') || errorMsg.includes('json') || errorMsg.includes('无法解析')) {
          friendlyError = `AI返回数据解析失败，请稍后重试`;
        } else if (errorMsg.includes('API未配置') || errorMsg.includes('API地址未配置') || errorMsg.includes('模型ID未配置')) {
          friendlyError = errorMsg;
        } else if (errorMsg.includes('不支持的 provider')) {
          friendlyError = errorMsg;
        } else {
          friendlyError = `分析失败：${errorMsg.slice(0, 200)}`;
        }

        setError(friendlyError);
        addExecutionLog(`分析失败: ${friendlyError}`);

        demand.status = 'failed';
        demand.analysis = {
          enterpriseInfo: '分析过程中出现问题',
          industryAnalysis: friendlyError,
          techRoadmap: '',
          suggestions: '请检查API配置或网络连接后重试',
        };
        demand.updatedAt = new Date().toISOString();
        demandStorage.save(demand);
        onDemandCreated(demand);

        setTimeout(() => setExecutionLog([]), 5000);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      const validation = await apiGateway.validateConfig();
      let configHint = validation.error || '请先在设置中配置API Key';

      setError(configHint);

      demand.status = 'failed';
      demand.analysis = {
        enterpriseInfo: '待配置API',
        industryAnalysis: configHint,
        techRoadmap: '请先在「系统设置」中完成API配置',
        suggestions: '配置完成后即可使用AI分析功能',
      };
      demand.updatedAt = new Date().toISOString();
      demandStorage.save(demand);
      onDemandCreated(demand);
    }
  };

  const contentLength = content.length;
  const titleLength = title.length;
  const isOverLimit = contentLength > 2000 || titleLength > 50;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: themeColors?.surface,
        border: `1px solid ${themeColors?.border}`,
      }}
    >
      <div className="tech-upload-header">
        <h2>输入技术需求</h2>
        <div className={`api-status-badge ${apiStatus.valid ? 'is-ready' : 'has-error'}`}>
          <span className="status-icon" aria-hidden="true">
            {apiStatus.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          </span>
          <span className="status-text">{apiStatus.message}</span>
        </div>
      </div>

      {/* Execution Log */}
      {executionLog.length > 0 && (
        <div
          className="p-3 rounded-lg text-xs animate-fade-in"
          style={{
            backgroundColor: themeColors?.backgroundAlt || '#1E1E1E',
            color: themeColors?.success || '#4ADE80',
            fontFamily: 'monospace',
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        >
          {executionLog.map((log, i) => (
            <div key={i} className="mb-1">{log}</div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className="p-3 rounded-lg text-sm animate-fade-in"
          style={{
            backgroundColor: themeColors?.error + '15',
            border: `1px solid ${themeColors?.error}`,
            color: themeColors?.error,
          }}
        >
          <div className="font-medium mb-1">⚠️ {error.includes('网络') ? '网络异常' : error.includes('API') || error.includes('密钥') ? 'API错误' : '操作失败'}</div>
          <div className="text-sm opacity-90">{error}</div>
        </div>
      )}

      <div className="space-y-3">
        {/* 文档上传区域 */}
        <div
          className="border-2 border-dashed rounded-lg p-4 text-center transition-all"
          style={{
            borderColor: documentFile ? themeColors?.success : themeColors?.border,
            backgroundColor: documentFile ? themeColors?.success + '08' : 'transparent',
          }}
        >
          <input
            type="file"
            accept=".docx,.pdf,.xlsx,.pptx"
            onChange={handleDocumentUpload}
            className="hidden"
            id="doc-upload"
            disabled={isAnalyzing || documentLoading}
          />
          <label
            htmlFor="doc-upload"
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            {documentLoading ? (
              <>
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${themeColors?.primary} transparent transparent transparent` }} />
                <span className="text-sm" style={{ color: themeColors?.textSecondary }}>正在解析文档...</span>
              </>
            ) : documentFile ? (
              <>
                <FileCheck size={24} style={{ color: themeColors?.success }} />
                <span className="text-sm font-medium" style={{ color: themeColors?.success }}>{documentFile.name}</span>
                <span className="text-xs" style={{ color: themeColors?.textSecondary }}>文档已解析，内容已自动填充</span>
              </>
            ) : (
              <>
                <Upload size={24} style={{ color: themeColors?.textSecondary }} />
                <span className="text-sm" style={{ color: themeColors?.textSecondary }}>点击上传 Word/PDF/Excel/PPT 文档</span>
                <span className="text-xs" style={{ color: themeColors?.textHint }}>自动提取文字、表格和图片，确认后回填</span>
              </>
            )}
          </label>
          {documentFile && (
            <button
              onClick={() => { setDocumentFile(null); setDocumentContext(null); }}
              className="mt-2 text-xs px-2 py-1 rounded"
              style={{ backgroundColor: themeColors?.error + '20', color: themeColors?.error }}
            >
              清除文档
            </button>
          )}
        </div>

        {/* Title Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-sm font-medium"
              style={{ color: themeColors?.text }}
            >
              需求标题
            </label>
            <span
              className="text-xs"
              style={{ color: titleLength > 50 ? themeColors?.error : themeColors?.textHint }}
            >
              {titleLength}/50
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：新能源汽车电池管理系统开发"
            maxLength={50}
            className="input"
            style={{
              backgroundColor: themeColors?.surface,
              borderColor: isOverLimit && titleLength > 50 ? themeColors?.error : themeColors?.border,
              color: themeColors?.text,
            }}
          />
        </div>

        {/* 结构化标签 */}
        <div className="space-y-3">
          <label
            className="text-sm font-medium"
            style={{ color: themeColors?.text }}
          >
            需求维度（可选）
          </label>

          {/* 预算范围 */}
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: themeColors?.textHint }}>预算范围</span>
            <div className="flex flex-wrap gap-1.5">
              {['50万以下', '50-200万', '200-500万', '500万以上'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedBudget(selectedBudget === opt ? '' : opt)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedBudget === opt ? themeColors?.primary + '20' : themeColors?.surfaceHover,
                    color: selectedBudget === opt ? themeColors?.primary : themeColors?.textSecondary,
                    border: `1px solid ${selectedBudget === opt ? themeColors?.primary + '40' : 'transparent'}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 时间要求 */}
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: themeColors?.textHint }}>时间要求</span>
            <div className="flex flex-wrap gap-1.5">
              {['3个月以内', '6个月以内', '1年以内', '不限'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedTimeline(selectedTimeline === opt ? '' : opt)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedTimeline === opt ? themeColors?.primary + '20' : themeColors?.surfaceHover,
                    color: selectedTimeline === opt ? themeColors?.primary : themeColors?.textSecondary,
                    border: `1px solid ${selectedTimeline === opt ? themeColors?.primary + '40' : 'transparent'}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 合作方式 */}
          <div>
            <span className="text-xs mb-1.5 block" style={{ color: themeColors?.textHint }}>合作方式</span>
            <div className="flex flex-wrap gap-1.5">
              {['技术转让', '技术许可', '合作研发', '技术咨询'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedCooperation(selectedCooperation === opt ? '' : opt)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedCooperation === opt ? themeColors?.primary + '20' : themeColors?.surfaceHover,
                    color: selectedCooperation === opt ? themeColors?.primary : themeColors?.textSecondary,
                    border: `1px solid ${selectedCooperation === opt ? themeColors?.primary + '40' : 'transparent'}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              className="text-sm font-medium"
              style={{ color: themeColors?.text }}
            >
              需求详情
            </label>
            <span
              className="text-xs"
              style={{ color: contentLength > 2000 ? themeColors?.error : themeColors?.textHint }}
            >
              {contentLength}/2000
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'请详细描述您的技术需求，包括：\n• 技术指标和性能要求\n• 预期目标和应用场景\n• 预算范围和时间要求\n• 已有技术基础和资源\n\n提示：越详细的需求描述可以获得更精准的分析结果。'}
            rows={6}
            maxLength={2000}
            className="input resize-none"
            style={{
              backgroundColor: themeColors?.surface,
              borderColor: isOverLimit && contentLength > 2000 ? themeColors?.error : themeColors?.border,
              color: themeColors?.text,
            }}
          />
          <p
            className="text-xs mt-1.5"
            style={{ color: themeColors?.textHint }}
          >
            请详细描述技术需求，越具体分析越精准。支持中英文输入。
          </p>
        </div>

        {/* Auto-save indicator */}
        {lastSaved && !isAnalyzing && (
          <div
            className="flex items-center gap-1.5 text-xs animate-fade-in"
            style={{ color: themeColors?.success }}
          >
            <span>✓</span>
            <span>草稿已保存 · {lastSaved}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="workspace-form-actions pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isAnalyzing || (!title.trim() && !content.trim())}
            className="workspace-form-action is-secondary"
          >
            <Save size={16} aria-hidden="true" />
            <span>{isSavingDraft ? '保存中...' : '保存草稿'}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isAnalyzing || isOverLimit}
            className="workspace-form-action is-primary"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>{isAnalyzing ? '分析中...' : '提交分析'}</span>
          </button>
        </div>
      </div>
      {pendingDocument && (
        <DocumentReviewModal
          document={pendingDocument}
          onCancel={() => setPendingDocument(null)}
          onConfirm={handleDocumentConfirm}
        />
      )}
    </div>
  );
}
