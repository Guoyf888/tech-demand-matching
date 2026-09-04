import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { techStorage } from '@/services/storage/techStorage';
import { TechResult } from '@/types';
import { apiGateway } from '@/services/api/gateway';
import { parseDocument, detectContentType, extractIndustryTags, extractTechTags, type ParsedDocument } from '@/services/documentParser';
import { DocumentReviewModal, type DocumentReviewValue } from '@/components/common/DocumentReviewModal';
import { AlertTriangle, CheckCircle2, Upload, FileCheck, Save, Sparkles } from 'lucide-react';
import { useThemeColors } from '@/store/themeStore';
import { analyzeTechDraft } from '@/services/draftAnalysis';
import './TechUpload.css';

// 对齐输入需求的字符限制规则
const CHAR_LIMIT = {
  TITLE: { min: 1, max: 100 },
  CONTENT: { min: 1, max: 50000 }
};

// 合法输入正则（对齐输入需求的校验规则）
const VALIDATE_REGEX = {
  TITLE: /^[\u4e00-\u9fa5a-zA-Z0-9，。！？；：""''()（）、·~@#￥%……&*+=<>-]{1,100}$/,
  CONTENT: /^[\u4e00-\u9fa5a-zA-Z0-9，。！？；：""''()（）、·~@#￥%……&*+=<>-_\s\S]{1,50000}$/
};

/**
 * 获取错误类型和友好提示
 */
function getErrorMessage(error: any): { type: 'network' | 'api' | 'config' | 'parse' | 'timeout' | 'server' | 'unknown'; message: string } {
  if (!error) {
    return { type: 'unknown', message: '发生未知错误' };
  }

  const message = error.message || String(error);

  // 网络错误
  if (message.includes('fetch') || message.includes('网络') || message.includes('Network')) {
    return { type: 'network', message: '网络连接失败，请检查您的网络是否正常' };
  }

  // 超时错误
  if (message.includes('timeout') || message.includes('超时')) {
    return { type: 'timeout', message: '请求超时，请检查网络连接或稍后重试' };
  }

  // API配置错误
  if (message.includes('API未配置') || message.includes('API Key未配置') ||
      message.includes('API地址未配置') || message.includes('模型ID未配置')) {
    return { type: 'config', message: message };
  }

  // API认证/权限错误
  if (message.includes('401') || message.includes('密钥无效') || message.includes('API密钥无效')) {
    return { type: 'api', message: 'API密钥无效或已过期，请检查设置中的API Key' };
  }

  // API服务器错误
  if (message.includes('500') || message.includes('服务器错误')) {
    return { type: 'server', message: 'API服务器错误，请稍后重试' };
  }

  // JSON解析错误
  if (message.includes('JSON') || message.includes('Unexpected') || message.includes('parse')) {
    return { type: 'parse', message: 'AI返回的数据格式异常' };
  }

  return { type: 'unknown', message: message };
}

/**
 * 验证标题
 */
function validateTitle(title: string): { valid: boolean; message?: string } {
  if (!title || !title.trim()) {
    return { valid: false, message: '成果标题不能为空' };
  }
  if (title.length > CHAR_LIMIT.TITLE.max) {
    return { valid: false, message: `成果标题不能超过${CHAR_LIMIT.TITLE.max}字` };
  }
  if (!VALIDATE_REGEX.TITLE.test(title)) {
    return { valid: false, message: '标题仅支持中文、英文、数字和常用符号' };
  }
  return { valid: true };
}

/**
 * 验证内容
 */
function validateContent(content: string): { valid: boolean; message?: string } {
  if (!content || !content.trim()) {
    return { valid: false, message: '成果详情不能为空' };
  }
  if (content.length > CHAR_LIMIT.CONTENT.max) {
    return { valid: false, message: `成果详情不能超过${CHAR_LIMIT.CONTENT.max}字` };
  }
  if (!VALIDATE_REGEX.CONTENT.test(content)) {
    return { valid: false, message: '详情仅支持中文、英文、数字和常用符号' };
  }
  return { valid: true };
}

interface TechUploadProps {
  onUploaded?: (result: TechResult) => void;
}

export const TechUpload: React.FC<TechUploadProps> = ({ onUploaded }) => {
  // 状态管理
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [charCount, setCharCount] = useState({ title: 0, content: 0 });
  const [error, setError] = useState<{ type: string; message: string } | null>(null);
  const [apiStatus, setApiStatus] = useState<{ valid: boolean; message: string }>({ valid: false, message: 'AI智能分析初始化中...' });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'saving' | 'submitting' | 'success' | 'failed'>('idle');
  const [currentResult, setCurrentResult] = useState<TechResult | null>(null);

  // 文档上传状态
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<ParsedDocument | null>(null);
  const [documentContext, setDocumentContext] = useState<ParsedDocument | null>(null);

  // Theme
  const themeColors = useThemeColors();

  const navigate = useNavigate();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ========== 1. 初始化 ==========
  useEffect(() => {
    // 加载草稿
    const draft = localStorage.getItem('techResult_draft');
    if (draft) {
      try {
        const { title: draftTitle, content: draftContent } = JSON.parse(draft);
        setTitle(draftTitle || '');
        setContent(draftContent || '');
      } catch {}
    }

    // 初始化API状态校验
    checkApiStatus();

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // ========== 2. 实时字符计数 + 自动保存草稿 ==========
  useEffect(() => {
    setCharCount({
      title: title.trim().length,
      content: content.trim().length
    });

    // 自动保存草稿（3秒防抖）
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (title || content) {
        localStorage.setItem('techResult_draft', JSON.stringify({ title, content }));
      }
    }, 3000);

    // 输入变化时清空错误
    if (error) setError(null);
  }, [title, content]);

  // ========== 3. API状态校验 ==========
  const checkApiStatus = useCallback(async () => {
    const validation = await apiGateway.validateConfig();
    if (validation.valid) {
      setApiStatus({ valid: true, message: 'AI智能分析已就绪' });
    } else {
      setApiStatus({
        valid: false,
        message: validation.error?.includes('API Key') ? 'API配置错误：API Key未配置'
          : validation.error?.includes('API地址') ? 'API配置错误：API地址未配置'
          : validation.error?.includes('模型ID') ? 'API配置错误：模型ID未配置'
          : 'AI智能分析暂不可用'
      });
    }
  }, []);

  // ========== 4. 文档上传处理 ==========
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['.docx', '.pdf', '.xlsx', '.pptx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      setError({ type: 'validate', message: `不支持的文件格式，仅支持 ${validTypes.join(', ')}` });
      return;
    }

    setDocumentLoading(true);
    setError(null);

    try {
      const parsed = await parseDocument(file);
      const extractedContent = parsed.text.slice(0, 50000);
      setPendingDocument({ ...parsed, text: extractedContent });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '解析失败';
      setError({ type: 'parse', message: `文档解析失败: ${errMsg}` });
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
      const drafts = entries.map((entry) => {
        const tags = Array.from(new Set([
          ...extractIndustryTags(`${entry.title}\n${entry.content}`),
          ...extractTechTags(`${entry.title}\n${entry.content}`),
        ])).slice(0, 6);
        return {
          id: techStorage.generateId(),
          title: entry.title.trim(),
          content: entry.content.trim(),
          summary: '',
          tags,
          teamMembers: [],
          documents: [document.fileName],
          status: 'draft' as const,
          createdAt,
          updatedAt: createdAt,
        } satisfies TechResult;
      });
      drafts.forEach((draft) => {
        techStorage.save(draft);
        onUploaded?.(draft);
      });
      setTitle('');
      setContent('');
      setDocumentContext(null);
      setError({ type: 'success', message: `已从 ${document.fileName} 创建 ${drafts.length} 项独立成果草稿，可在成果列表中逐项核对和分析。` });
      setPendingDocument(null);
      return;
    }

    const [entry] = entries;
    setDocumentContext(document);
    setTitle(entry.title);
    setContent(entry.content);
    setError({
      type: 'validate',
      message: `文档已确认：${document.fileName}\n类型：${contentType === 'result' ? '技术成果' : contentType === 'demand' ? '技术需求' : '待定'}\n行业标签：${industries.join(', ') || '未识别'}\n技术领域：${techs.join(', ') || '未识别'}\n已提取图片：${document.images?.length || 0} 张`,
    });
    setPendingDocument(null);
  };

  // ========== 6. 保存草稿 ==========
  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      setError({ type: 'validate', message: '暂无内容可保存' });
      return;
    }

    setSubmitStatus('saving');
    try {
      const result: TechResult = {
        id: techStorage.generateId(),
        title: title.trim() || '未命名技术成果',
        content: content.trim(),
        summary: '',
        tags: [],
        teamMembers: [],
        documents: [],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      techStorage.save(result);
      localStorage.removeItem('techResult_draft');
      setSubmitStatus('idle');
      alert(`草稿保存成功！`);
      navigate('/results');
    } catch (err: any) {
      setSubmitStatus('failed');
      setError({ type: 'server', message: `草稿保存失败：${err.message}` });
    }
  };

  // ========== 7. 提交分析 ==========
  const handleSubmit = async () => {
    // 前置校验
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      setError({ type: 'validate', message: titleValidation.message! });
      return;
    }

    const contentValidation = validateContent(content);
    if (!contentValidation.valid) {
      setError({ type: 'validate', message: contentValidation.message! });
      return;
    }

    if (!apiStatus.valid) {
      setError({ type: 'config', message: `无法分析：${apiStatus.message}，请先配置API` });
      return;
    }

    setSubmitStatus('submitting');
    setError(null);

    const result: TechResult = {
      id: techStorage.generateId(),
      title: title.trim(),
      content: content.trim(),
      summary: '',
      tags: [],
      teamMembers: [],
      documents: documentContext?.fileName ? [documentContext.fileName] : [],
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 先保存草稿状态
    techStorage.save(result);

    try {
      const analyzedResult = await analyzeTechDraft(result, documentContext);
      techStorage.save(analyzedResult);
      setCurrentResult(analyzedResult);
      setSubmitStatus('success');
      localStorage.removeItem('techResult_draft');

      if (onUploaded) onUploaded(analyzedResult);

    } catch (err: any) {
      const errorInfo = getErrorMessage(err);
      setError(errorInfo);
      setSubmitStatus('failed');

      result.status = 'failed';
      result.error = errorInfo.message;
      result.updatedAt = new Date().toISOString();
      techStorage.save(result);
    }
  };

  const getErrorBoxClass = (type: string) => {
    switch (type) {
      case 'success': return 'error-box success-box';
      case 'validate': return 'error-box error-validate';
      case 'network': return 'error-box error-network';
      case 'api': return 'error-box error-api';
      case 'timeout': return 'error-box error-timeout';
      case 'server': return 'error-box error-server';
      default: return 'error-box error-api';
    }
  };

  return (
    <div className="tech-upload-container">
      {/* 页面标题 */}
      <div className="tech-upload-header">
        <h2>上传技术成果</h2>
        <div className={`api-status-badge ${apiStatus.valid ? 'is-ready' : 'has-error'}`}>
          <span className="status-icon" aria-hidden="true">
            {apiStatus.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          </span>
          <span className="status-text">{apiStatus.message}</span>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className={getErrorBoxClass(error.type)}>
          {error.message}
        </div>
      )}

      {/* 表单区域 */}
      <div className="form-container">
        {/* 文档上传区域 */}
        <div
          className="form-item border-2 border-dashed rounded-lg p-4 text-center transition-all"
          style={{
            borderColor: documentFile ? '#52c41a' : themeColors?.border || '#d9d9d9',
            backgroundColor: documentFile ? 'rgba(82, 196, 26, 0.05)' : 'transparent',
          }}
        >
          <input
            type="file"
            accept=".docx,.pdf,.xlsx,.pptx"
            onChange={handleDocumentUpload}
            className="hidden"
            id="tech-doc-upload"
            disabled={submitStatus === 'submitting' || documentLoading}
          />
          <label
            htmlFor="tech-doc-upload"
            className="flex flex-col items-center gap-2 cursor-pointer"
          >
            {documentLoading ? (
              <>
                <div className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: `${themeColors?.primary || '#1677ff'} transparent transparent transparent`, borderWidth: '3px' }} />
                <span className="text-sm" style={{ color: themeColors?.textSecondary }}>正在解析文档...</span>
              </>
            ) : documentFile ? (
              <>
                <FileCheck size={32} style={{ color: '#52c41a' }} />
                <span className="text-base font-medium" style={{ color: '#52c41a' }}>{documentFile.name}</span>
                <span className="text-xs" style={{ color: themeColors?.textSecondary }}>文档已解析，内容已自动填充</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setDocumentFile(null); setDocumentContext(null); }}
                  className="mt-2 text-xs px-3 py-1 rounded"
                  style={{ backgroundColor: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f' }}
                >
                  清除文档
                </button>
              </>
            ) : (
              <>
                <Upload size={32} style={{ color: themeColors?.textSecondary }} />
                <span className="text-sm" style={{ color: themeColors?.textSecondary }}>点击上传 Word/PDF/Excel/PPT 文档</span>
                <span className="text-xs" style={{ color: themeColors?.textHint }}>自动提取文字、表格和图片，确认后回填</span>
              </>
            )}
          </label>
        </div>

        {/* 成果标题 */}
        <div className="form-item">
          <label className="form-label">
            成果标题 <span className="required">（必填，最多100字）</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="例如：基于深度学习的图像识别算法"
            maxLength={CHAR_LIMIT.TITLE.max}
            disabled={submitStatus === 'submitting'}
          />
          <div className="char-count">
            {charCount.title}/{CHAR_LIMIT.TITLE.max}
            {charCount.title > CHAR_LIMIT.TITLE.max && (
              <span className="count-error"> 超出字数限制</span>
            )}
          </div>
          <div className="form-hint">支持中文、英文、数字和常用符号</div>
        </div>

        {/* 成果详情 */}
        <div className="form-item">
          <label className="form-label">
            成果详情 <span className="required">（必填，详细描述技术成果）</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-textarea"
            placeholder={`请详细描述您的技术成果，包括：
1. 技术原理和创新点
2. 主要应用场景
3. 已取得的成果或效果
4. 适用行业或领域
（越详细的描述可以获得更精准的分析结果）`}
            rows={8}
            maxLength={CHAR_LIMIT.CONTENT.max}
            disabled={submitStatus === 'submitting'}
          />
          <div className="char-count">
            {charCount.content}/{CHAR_LIMIT.CONTENT.max}
            {charCount.content > CHAR_LIMIT.CONTENT.max && (
              <span className="count-error"> 超出字数限制</span>
            )}
          </div>
          <div className="form-hint">
            建议包含：技术原理、应用场景、创新点、已获成果等，支持中英文输入
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="workspace-form-actions">
          <button
            type="button"
            className="workspace-form-action is-secondary"
            onClick={handleSaveDraft}
            disabled={submitStatus === 'submitting' || submitStatus === 'saving'}
          >
            <Save size={16} aria-hidden="true" />
            <span>{submitStatus === 'saving' ? '保存中...' : '保存草稿'}</span>
          </button>
          <button
            type="button"
            className="workspace-form-action is-primary"
            onClick={handleSubmit}
            disabled={
              submitStatus === 'submitting' ||
              submitStatus === 'saving' ||
              !apiStatus.valid ||
              charCount.title === 0 ||
              charCount.content === 0
            }
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>{submitStatus === 'submitting' ? '分析中...' : '提交分析'}</span>
          </button>
        </div>
      </div>

      {/* 分析结果预览 */}
      {currentResult && currentResult.status === 'completed' && (
        <div className="result-preview">
          <h3>成果分析结果</h3>
          <div className="result-section">
            <h4>详细内容</h4>
            <div className="result-content">{currentResult.content}</div>
          </div>
          {currentResult.summary && (
            <div className="result-section">
              <h4>AI智能总结</h4>
              <div className="result-summary">{currentResult.summary}</div>
            </div>
          )}
        </div>
      )}
      {pendingDocument && (
        <DocumentReviewModal
          document={pendingDocument}
          onCancel={() => setPendingDocument(null)}
          onConfirm={handleDocumentConfirm}
        />
      )}
    </div>
  );
};

export default TechUpload;
